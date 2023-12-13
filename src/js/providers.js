import React, { useState, useRef, useEffect, useContext, createContext } from 'react';

export const BinanceWSContext = createContext();

// {"method": "SUBSCRIBE", "params": ["btcusdt@aggTrade"], "id": 123 }
// {"method": "UNSUBSCRIBE", "params": ["btcusdt@aggTrade"], "id": 123}
// {"method": "LIST_SUBSCRIPTIONS", "id": 123}

// kline <symbol>@kline_<interval>
// let msg_object = {"method": "SUBSCRIBE", "params": ['btcusdt@1h'], "id":224}
// JSON.stringify(msg_object);

export const BinanceWebSocketProvider = ({ children }) => {
    const ws = useRef(null);
    const channels = useRef({}); // mapping streamName - function. eg: {'btcusdt@kline_1h': cbUpdateChart func}

    const subscribe = (channel, callback) => {
        channels.current[channel] = callback;
    };
    const unsubscribe = (channel) => {
        delete channels.current[channel];
    };

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const binance_ws_url = 'wss://fstream.binance.com/ws';
        const socket = new WebSocket(binance_ws_url);

        socket.onopen = () => setIsOpen(true);
        socket.onclose = () => {
            console.log('ws connection closing ... reconnecting ...');

            setIsOpen(false);
            // ws = new WebSocket(binance_ws_url);
            // ws.onmessage = cb;
        };
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);

            // sub / unsub / list subscription message
            if (!('e' in data)) {
                console.log(e);
                return;
            }

            // data message
            let k = data.k;
            let k_symbol = k.s;
            let k_interval = k.i;

            const klineChannel = `${k_symbol.toLowerCase()}@kline_${k_interval}`;
            if (channels.current[klineChannel]) {
                channels.current[klineChannel](data);
            }
        };

        ws.current = socket;

        return () => {
            socket.close();
        };
    }, []);

    // FIXME: ws.current?.send how does this work
    const ret = [isOpen, ws.current?.send.bind(ws.current), subscribe, unsubscribe];
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
