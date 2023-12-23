import React, { useState, useRef, useEffect, useContext, createContext } from 'react';
import { Binance, Bybit, commonUtils } from './utils';

export const BinanceWSContext = createContext();

// {"method": "SUBSCRIBE", "params": ["btcusdt@aggTrade"], "id": 123 }
// {"method": "UNSUBSCRIBE", "params": ["btcusdt@aggTrade"], "id": 123}
// {"method": "LIST_SUBSCRIPTIONS", "id": 123}

// kline <symbol>@kline_<interval>
// let msg_object = {"method": "SUBSCRIBE", "params": ['btcusdt@1h'], "id":224}
// JSON.stringify(msg_object);

// FIXME: ws.current?.send how does this work, why doesnt children component not receive null at first
// handle restarting connection

export const BinanceWebSocketProvider = ({ children }) => {
    const wsRef = useRef(null);
    const channels = useRef({}); // mapping streamName - function. eg: {'btcusdt@kline_1h': cbUpdateChart func}

    const [isOpen, setIsOpen] = useState(false);

    const subscribe = (channel, callback) => {
        channels.current[channel] = callback;
    };
    const unsubscribe = (channel) => {
        delete channels.current[channel];
    };

    useEffect(() => {
        const binance_ws_url = 'wss://fstream.binance.com/ws';
        let ws = new WebSocket(binance_ws_url);

        console.log('attempting to connect:', binance_ws_url);

        const onOpen = () => {
            console.log('connection opened:', binance_ws_url);
            setIsOpen(true);
        };
        const onClose = () => {
            console.log('ws connection closed ...');
            console.log('reconnecting ...');
            setIsOpen(false);
        };

        ws.onopen = onOpen;
        ws.onclose = () => {
            onClose();

            // re init ws again FIXME: doesnt work. ws reinit but not able to pass down to children component
            // ws = new WebSocket(binance_ws_url);
            // ws.onopen = onOpen;
            // ws.onclose = onClose;
            // wsRef.current = ws;
        };
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            // json data either array or object

            if (Array.isArray(data)) {
                let firstElem = data[0];
                let eventType = firstElem.e;

                // All Market Mini Tickers Stream
                if (eventType == '24hrMiniTicker') {
                    let channelName = '!miniTicker@arr';

                    if (channels.current[channelName]) {
                        channels.current[channelName](data);
                    }
                }

                return;
            }

            if ('e' in data) {
                let eventType = data.e;

                // kline Stream
                if (eventType == 'kline') {
                    let k = data.k;
                    let k_symbol = k.s;
                    let k_interval = k.i;

                    const klineChannel = `${k_symbol.toLowerCase()}@kline_${k_interval}`;
                    if (channels.current[klineChannel]) {
                        channels.current[klineChannel](data);
                    }
                }
            }

            if (!('e' in data)) {
                // sub / unsub / list subscription message
                return;
            }
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const ret = [isOpen, wsRef.current?.send.bind(wsRef.current), subscribe, unsubscribe];
    return <BinanceWSContext.Provider value={ret}>{children}</BinanceWSContext.Provider>;
};

/* alternative solution is to forwardRef binanceWSConnection to every chart
UseContext CreateContext BinanceWebSocketProvider superior
*/
// const BTC_CHART = forwardRef(function BTC_CHART(props, ref) {
//     const symbol = 'BTCUSDT';
//     const interval = '1h';

//     useEffect(() => {
//         console.log('in mycustominput useeffect', ref.current);
//         let msg_object = { method: 'SUBSCRIBE', params: ['btcusdt@kline_1h'], id: 224 };
//         let msg_string = JSON.stringify(msg_object);

//         console.log('msg to be sent', msg_string);
//         ref.current.send(msg_string);

//         // get current cb func
//         let cb = ref.current.onmessage;
//         ref.current.onmessage = (e) => {
//             if (cb) cb(e);
//             let data_str = e.data;

//             // 2 messages,
//             // 1st = subscribe success {'result':null, 'id':123}
//             // 2nd = data stream
//             let data = JSON.parse(data_str);

//             if ('e' in data) {
//                 let k = data.k;
//                 let k_symbol = k.s;
//                 let k_interval = k.i;
//                 if (k_symbol == symbol && interval == k_interval) {
//                     console.log('btcusdt', k.c, k.t);
//                 }
//             }
//         };
//     }, []);

//     return <div style={{ color: 'yellow' }}>hello world from BTC_CHART</div>;
// });

export const BinanceContext = createContext();
export const BinanceProvider = ({ children }) => {
    const [symbolsFilterInfo, setSymbolsFilterInfo] = useState(null);

    useEffect(() => {
        Binance.get_symbols_filter_info(setSymbolsFilterInfo);
    }, []);

    let symbols = symbolsFilterInfo ? Object.keys(symbolsFilterInfo) : null;

    const ret = [symbols, symbolsFilterInfo];
    return <BinanceContext.Provider value={ret}>{children}</BinanceContext.Provider>;
};

export const BybitContext = createContext();
export const BybitProvider = ({ children }) => {
    const [symbolsFilterInfo, setSymbolsFilterInfo] = useState(null);

    useEffect(() => {
        Bybit.bybit_get_instruments_info(setSymbolsFilterInfo);
    }, []);

    let symbols = symbolsFilterInfo ? Object.keys(symbolsFilterInfo) : null;

    const ret = [symbols, symbolsFilterInfo];
    return <BybitContext.Provider value={ret}>{children}</BybitContext.Provider>;
};

export const BybitWSContext = createContext();
export const BybitWebSocketProvider = ({ children }) => {
    // bybit websocket wss://stream.bybit.com/v5/public/linear
    // ws.send(JSON.stringify({"req_id": "100001", "op": "ping"}));

    // {
    //     "req_id": "test", // optional
    //     "op": "subscribe",
    //     "args": [
    //         "orderbook.1.BTCUSDT"
    //     ]
    // }

    // {
    //     "op": "unsubscribe",
    //     "args": [
    //         "publicTrade.ETHUSD"
    //     ],
    //     "req_id": "customised_id"
    // }
    const wsRef = useRef(null);
    const channels = useRef({});

    const [isOpen, setIsOpen] = useState(false);

    const subscribe = (channel, callback) => {
        channels.current[channel] = callback;
    };
    const unsubscribe = (channel) => {
        delete channels.current[channel];
    };

    useEffect(() => {
        const bybit_ws_url = 'wss://stream.bybit.com/v5/public/linear';
        let ws = new WebSocket(bybit_ws_url);

        console.log('attempting to connect', bybit_ws_url);

        const onOpen = () => {
            console.log('connection opened:', bybit_ws_url);
            setIsOpen(true);
        };
        const onClose = () => {
            console.log('ws connection closed ...');
            console.log('reconnecting ...');
            setIsOpen(false);
        };

        ws.onopen = onOpen;
        ws.onclose = onClose;

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);

            let topic = data.topic;

            if (channels.current[topic]) {
                channels.current[topic](data);
            }
        };

        let pingIntervalId = setInterval(() => {
            let pingMessage = {
                req_id: commonUtils.generateRandomNumber(),
                op: 'ping',
            };
            ws.send(JSON.stringify(pingMessage));
        }, 20000);

        wsRef.current = ws;
        return () => {
            clearInterval(pingIntervalId);
            ws.close();
        };
    }, []); // FIXME: how to retrigger if websocket disconnects ? useState(isDisconnected) ?

    const ret = [isOpen, wsRef.current?.send.bind(wsRef.current), subscribe, unsubscribe];

    return <BybitWSContext.Provider value={ret}>{children}</BybitWSContext.Provider>;
};
