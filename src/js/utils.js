import moment from 'moment';
import Big from 'big.js';
import qs from 'qs';

// General
const GLOBAL_API = API123; // for nodejs functions electronjs contextBridge

// NewsContainer
// for newsCard epoch time to readable time
function get_formatted_date(epoch_ms) {
    const format = 'ddd, DD MMM YYYY, HH:mm:ss';
    return moment(epoch_ms).format(format);
}

const REGEX_FOR_TWITTER_QUOTE = /Quote \[[\s\S]*/;

function parse_news(news) {
    // should return obj with 6 props { title, body, link, coins, time, SOURCE}
    let title = news.title;
    let body;
    let link;
    let coins = [];
    let time = get_formatted_date(news.time);
    let source;

    if ('source' in news) {
        // .source == 'Blogs' / 'Terminal' / 'Binance', for blogs, get body with .en?
        source = news.source;
        if (source === 'Upbit' || source === 'Bithumb') {
            title = news.en;
        }

        body = ''; // body = news.en
        link = news.url; // for blogs
    } else {
        body = news.body; // twitter
        body = body.replace(REGEX_FOR_TWITTER_QUOTE, '');
        link = news.link; // for twitter
    }

    // get coins ['BTC', 'ETH']
    if ('suggestions' in news) {
        let suggestions = news.suggestions;
        coins = suggestions.map((s) => s.coin + 'USDT');
    } else if ('coin' in news) {
        coins.push(news.coin + 'USDT');
    }

    return { title, body, link, coins, time, source };
}

function initTreeWS(cb) {
    // ping interval = 10,
    // const url = 'wss://fstream.binance.com/ws/ethusdt@markPrice';
    // const socket = new WebSocket(url);

    const url = 'wss://news.treeofalpha.com/ws';
    const socket = new WebSocket(url);

    let pingIntervalId = setInterval(() => {
        socket.send('ping'); // not actual ping opcode, server process it manually
    }, 10 * 1000);

    console.log(`attempting to connect: ${url}`);

    socket.onopen = () => console.log(`connection opened: ${url}`);
    socket.onclose = () => {
        console.log(`connection closed: ${url}`);
        clearInterval(pingIntervalId);

        initTreeWS(cb);
    };
    socket.onmessage = (event) => {
        // console.log(event);
        // console.log(event.data);

        if (event.data !== 'pong') {
            let raw_news = JSON.parse(event.data);
            let parsed_news = parse_news(raw_news);

            cb(parsed_news);

            console.log('raw', raw_news);
            console.log('parsed', parsed_news);
        }
    };
}

const news2 = {
    title: 'Binance Futures Will Launch USDⓈ-M MEME Perpetual Contract With Up to 50x Leverage',
    body: '',
    link: 'https://www.binance.com/en/support/articles/afcf1ccc7978458d8474f500da91a00d',
    coins: ['MEMEUSDT'],
    time: get_formatted_date(1699003204030),
    source: 'Binance EN',
};

const news4 = {
    title: 'This is a title!!',
    body: 'body 123',
    link: 'https://google.com',
    coins: [],
    time: get_formatted_date(1697702518849),
};

const capoNews = {
    title: "CryptoCapo's TA (t.me/CryptoCapoTG)",
    body: "BTC \n\nCurrent situation:\n\nDeviation above the previous highs. Most people expecting $40k+. It would be perfect if that level gets front run.\n\nThe level of greed, arrogance and cockiness is reaching extreme levels. It reminds me of when price was at $45k-48k back in March-April 2022. I was calling for $21k-23k back then and  the hate level was very similar in percentage. But there's a big difference now; price is much lower and fundings are much higher (reaching ATH levels)\n\nThe market will tell if the bear market rally / manipulation thesis was right or not. In my opinion it's very clear, and if that's the case... it could be fully retraced within a few days/weeks. That's why I prefer to be stay out of the market still.\n\nThe $30k-31k level should show some support since it was the main level for a long time and there will be a \"S/R flip narrative\". Probably a short-term bounce from there if reached. Actually, if it breaks below $35k, it would confirm all the bearish divergences and they are strong enough to take the price below $30k eventually. Below there, the only support would be $25k but it has been tested several times and with that trend break it shouldn't hold. That would take us to the main target of $12k.\n\nNot opening any new positions yet until more confirmations are given.",
    link: 'https://t.me/CryptoCapoTG/234',
    coins: [],
    time: get_formatted_date(1700838613719),
};
const generateMockNewsFeed = () => [capoNews, news2, news4];

// common Utils
function round_step_size(value, tickSize) {
    // price/qty should be within 9dp, else returns scientific notation e-7
    let bigValue = Big(value);
    let bigTick = Big(tickSize);

    let bigRemainder = bigValue.mod(bigTick);
    let roundedValue = bigValue.minus(bigRemainder);

    return roundedValue.toNumber();
}

function getPrecisionForToFixed(tickSize) {
    /*
    reason for this function is becos tickSize / pricePrecision given by binance exchangeInfo make no sense "0.0000100"
    tickSize also determines pricePrecision of symbol, pricePrecision = how many dp should symbol have
    eg; 1000FLOKI "tickSize": "0.0000100" but "pricePrecision": 7,
    precision imo should be 5 as tickSize is 0.00001
    */

    // only YFI has tickSize: "1"
    if (tickSize === '1') {
        return 1;
    }

    const re_getLeadingZeroes = /0*[1-9]/;

    let decimal = tickSize.split('.')[1]; //    "0000100"
    let decimalWithoutRedundantZero = decimal.match(re_getLeadingZeroes)[0]; // "00001"

    let precision = decimalWithoutRedundantZero.length;
    return precision;
}

function generateRandomNumber() {
    // return random int 0 - 99
    return Math.floor(Math.random() * 100);
}

function addQueryParams(endpoint, params) {
    let paramString = qs.stringify(params);

    return endpoint + '?' + paramString;
}

// Binance
function get_symbols_filter_info(cb) {
    const url = 'https://fapi.binance.com' + '/fapi/v1/exchangeInfo';
    const fetch_options = {
        method: 'GET',
    };

    // filteredSymbolsInfo = {BTCUSDT: {stepSize: 100, tickSize: 999}, ETHUSDT: {...}}
    fetch(url, fetch_options)
        .then((res) => res.json())
        .then((data) => {
            let symbolsInfo = data.symbols;

            const filteredSymbolsInfo = {};

            symbolsInfo.forEach((s) => {
                let symbolName = s.symbol;
                let symbolObj = {
                    pricePrecision: s.pricePrecision,
                    maxPrice: s.filters[0].maxPrice,
                    minPrice: s.filters[0].minPrice,
                    tickSize: s.filters[0].tickSize,
                    maxQty: s.filters[1].maxQty,
                    minQty: s.filters[1].minQty,
                    stepSize: s.filters[1].stepSize,
                };

                if (
                    s.status !== 'TRADING' ||
                    s.contractType !== 'PERPETUAL' ||
                    s.quoteAsset !== 'USDT'
                ) {
                    return;
                } else {
                    filteredSymbolsInfo[symbolName] = symbolObj;
                }
            });
            cb(filteredSymbolsInfo);
        });
}

function craft_binance_kline_end_point(symbol, interval) {
    const binance_kline_endpoint = 'https://fapi.binance.com' + '/fapi/v1/klines';

    const params = {
        symbol: symbol,
        interval: interval,
    };

    return addQueryParams(binance_kline_endpoint, params);
}

function craft_binance_oi_hist_endpoint(symbol, interval) {
    // interval 5m 15m 30m 1h 2h 4h 6h 12h 1d

    const binance_oi_hist_endpoint = 'https://fapi.binance.com' + '/futures/data/openInterestHist';
    const params = {
        symbol: symbol,
        period: interval,
        limit: 500,
    };

    return addQueryParams(binance_oi_hist_endpoint, params);
}

function parseBinanceKlineResponse(data) {
    // data = array of array of epoch, ohlcv data

    const klineMapping = (kline) => {
        return {
            time: kline[0] / 1000,
            open: +kline[1],
            high: +kline[2],
            low: +kline[3],
            close: +kline[4],
            volume: +kline[7], // quote asset volume, eg BTCUSDT, quote asset = usdt, base asset= BTC
        };
    };
    return data.map(klineMapping);
}

function parseBinanceWSKlineData(data) {
    let e = data.E; // event time.
    let kline = data.k;
    return {
        time: kline.t / 1000,
        open: +kline.o,
        high: +kline.h,
        low: +kline.l,
        close: +kline.c,
        e: e,
        volume: +kline.q, // quote asset volume
    };
}

// vol histogram
function mapDataForVolumeHistogram(data) {
    // kline data should be processed alr, time in seconds number type ...
    return {
        time: data.time,
        value: data.volume,
    };
}

function initBinancePriceStream(cb) {
    // binance server send ping every 3min, if within 10min no reply, connection ded
    const url = 'wss://fstream.binance.com/ws/!miniTicker@arr';
    const ws = new WebSocket(url);

    console.log(`attempting to connect: ${url}`);

    ws.onopen = () => console.log(`connection opened: ${url}`);
    ws.onclose = () => {
        console.log(`connection closed: ${url}`);
        initBinancePriceStream();
    };

    ws.onmessage = (event) => {
        let data = JSON.parse(event.data);

        const newPriceData = {};
        for (let symbolData of data) {
            let symbol = symbolData.s;
            let last_price = symbolData.c;
            newPriceData[symbol] = last_price;
        }

        cb(newPriceData);
    };
}

function craftKlineStreamName(symbol, interval) {
    return `${symbol.toLowerCase()}@kline_${interval}`;
}

function generateSubscribeTopicJson(streamName, id) {
    let subscribeTopic = {
        method: 'SUBSCRIBE',
        params: [streamName],
        id: id,
    };

    return JSON.stringify(subscribeTopic);
}

function generateUnsubscribeTopicJson(streamName, id) {
    let unsubscribeTopic = {
        method: 'UNSUBSCRIBE',
        params: [streamName],
        id: id,
    };
    return JSON.stringify(unsubscribeTopic);
}

// Bybit
function bybit_get_instruments_info(cb) {
    // only get LinearPerpetual and USDT perps.
    // no ETCPERP or ETH-15DEC23
    const url = 'https://api.bybit.com' + '/v5/market/instruments-info';
    // ?category=linear
    // ?category=linear&symbol=BTCUSDT&limit=10

    const params = {
        category: 'linear',
    };

    let paramString = qs.stringify(params);
    const endpoint = url + '?' + paramString;

    const fetch_options = {
        method: 'GET',
    };

    fetch(endpoint, fetch_options)
        .then((res) => res.json())
        .then((data) => {
            const filteredSymbolsInfo = {}; // var name taken from binance api

            let symbolsInfo = data.result.list;
            symbolsInfo.forEach((s) => {
                let symbolName = s.symbol;
                let contractType = s.contractType;
                let quoteCoin = s.quoteCoin;

                let symbolObj = {
                    maxPrice: s.priceFilter.maxPrice,
                    minPrice: s.priceFilter.minPrice,
                    tickSize: s.priceFilter.tickSize,
                    maxQty: s.lotSizeFilter.maxOrderQty,
                    minQty: s.lotSizeFilter.minOrderQty,
                    stepSize: s.lotSizeFilter.qtyStep,
                };

                if (contractType !== 'LinearPerpetual' || quoteCoin !== 'USDT') {
                    return;
                }
                // all bybit linear perps are trading
                filteredSymbolsInfo[symbolName] = symbolObj;
            });

            cb(filteredSymbolsInfo);
        });
}

function craft_bybit_kline_end_point(symbol, interval) {
    // interval 1 3 5 15 30 60 120 240 360 720 D M W
    const bybit_kline_endpoint = 'https://api.bybit.com' + '/v5/market/kline';

    const params = {
        category: 'linear',
        symbol: symbol,
        interval: interval,
        limit: 500,
    };

    return addQueryParams(bybit_kline_endpoint, params);
}

function parseBybitKlineResponse(data) {
    // [
    // [
    //     "1670608800000",
    //     "17071",
    //     "17073",
    //     "17027",
    //     "17055.5",
    //     "268611",
    //     "15.74462667"
    // ],
    // ]
    const klineMapping = (kline) => {
        return {
            time: kline[0] / 1000,
            open: +kline[1],
            high: +kline[2],
            low: +kline[3],
            close: +kline[4],
            volume: +kline[6], // turnover in quotecoin usdt
        };
    };

    let klineData = data.result.list;
    let mappedKlineData = klineData.map(klineMapping);
    let sortedKlineData = mappedKlineData.sort((a, b) => a.time - b.time);

    return sortedKlineData;
}

function parseBybitWSKlineData(data) {
    // https://bybit-exchange.github.io/docs/v5/websocket/public/kline
    // {
    //     "topic": "kline.60.1000RATSUSDT",
    //     "data": [
    //         {
    //             "start": 1702641600000,
    //             "end": 1702645199999,
    //             "interval": "60",
    //             "open": "0.60574",
    //             "close": "0.5932",
    //             "high": "0.63047",
    //             "low": "0.59",
    //             "volume": "12134060",
    //             "turnover": "7419425.2331",
    //             "confirm": false,
    //             "timestamp": 1702642050165
    //         }
    //     ],
    //     "ts": 1702642050165,
    //     "type": "snapshot"
    // }
    let kline = data.data[0];

    // FIXME: rename vars
    return {
        time: kline.start / 1000,
        open: +kline.open,
        high: +kline.high,
        low: +kline.low,
        close: +kline.close,
        volume: +kline.turnover, // quote asset volume
        e: kline.timestamp,
    };
}

function bybitCraftKlineStreamName(symbol, interval) {
    // interval 1 3 5 15 60 240 D W
    return `kline.${interval}.${symbol}`;
}

function bybitGenerateSubscribeTopicJson(streamName, id) {
    let subscribeTopic = {
        req_id: id,
        op: 'subscribe',
        args: [streamName],
    };

    return JSON.stringify(subscribeTopic);
}

function bybitGenerateUnsubscribeTopicJson(streamName, id) {
    let subscribeTopic = {
        req_id: id,
        op: 'unsubscribe',
        args: [streamName],
    };
    return JSON.stringify(subscribeTopic);
}

const Bybit = {
    bybit_get_instruments_info,
    craft_bybit_kline_end_point,

    parseBybitKlineResponse,
    parseBybitWSKlineData,

    bybitCraftKlineStreamName,
    bybitGenerateSubscribeTopicJson,
    bybitGenerateUnsubscribeTopicJson,
};
const newsUtils = {
    // get_formatted_date, // only used in parse_news
    // parse_news, // only used in initTreeWS // not needed to export
    initTreeWS,
    generateMockNewsFeed,
};

const commonUtils = {
    generateRandomNumber,
    round_step_size,
    getPrecisionForToFixed,
};

const Binance = {
    get_symbols_filter_info,
    craft_binance_kline_end_point,
    craft_binance_oi_hist_endpoint,

    parseBinanceKlineResponse,
    parseBinanceWSKlineData,
    mapDataForVolumeHistogram,

    initBinancePriceStream,
    craftKlineStreamName,
    generateSubscribeTopicJson,
    generateUnsubscribeTopicJson,
};

// ChartContainer utils
const UI_Intervals = ['1m', '3m', '15m', '1h', '4h', '1d', '1w'];
const exchangeIntervalMapping = {
    '1m': { binance: '1m', bybit: '1' },
    '3m': { binance: '3m', bybit: '3' },
    '15m': { binance: '15m', bybit: '15' },
    '1h': { binance: '1h', bybit: '60' },
    '4h': { binance: '4h', bybit: '240' },
    '1d': { binance: '1d', bybit: 'D' },
    '1w': { binance: '1w', bybit: 'W' },
};

// what r de pros n cons
// exchangeFuncMapping['craftKlineEndPoint']['binance']
// or funcMapping['binance']['craftKlineEndPoint']

const exchangeFuncMapping = {
    craftKlineEndPoint: {
        binance: Binance.craft_binance_kline_end_point,
        bybit: Bybit.craft_bybit_kline_end_point,
    },
    parseKlineResponse: {
        binance: Binance.parseBinanceKlineResponse,
        bybit: Bybit.parseBybitKlineResponse,
    },
    parseWSKlineData: {
        binance: Binance.parseBinanceWSKlineData,
        bybit: Bybit.parseBybitWSKlineData,
    },
    craftKlineStreamName: {
        binance: Binance.craftKlineStreamName,
        bybit: Bybit.bybitCraftKlineStreamName,
    },
    craftSubTopicJSON: {
        binance: Binance.generateSubscribeTopicJson,
        bybit: Bybit.bybitGenerateSubscribeTopicJson,
    },
    craftUnsubTopicJSON: {
        binance: Binance.generateUnsubscribeTopicJson,
        bybit: Bybit.bybitGenerateUnsubscribeTopicJson,
    },
};

const ChartContainerUtils = {
    UI_Intervals,
    exchangeIntervalMapping,
    exchangeFuncMapping,
};

export { GLOBAL_API, newsUtils, commonUtils, Binance, Bybit, ChartContainerUtils };
