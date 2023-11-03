import moment from 'moment';
import Big from 'big.js';
import qs from 'qs';

// General
const GLOBAL_API = API123; // for nodejs functions electronjs contextBridge

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

                if (s.status !== 'TRADING' || s.contractType !== 'PERPETUAL') {
                    return;
                } else {
                    filteredSymbolsInfo[symbolName] = symbolObj;
                }
            });
            cb(filteredSymbolsInfo);
        });
}

function round_step_size(value, tickSize) {
    // price/qty should be within 9dp, else returns scientific notation e-7
    let bigValue = Big(value);
    let bigTick = Big(tickSize);

    let bigRemainder = bigValue.mod(bigTick);
    let roundedValue = bigValue.minus(bigRemainder);

    return roundedValue.toNumber();
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

function getPrecisionForToFixed(tickSize) {
    /**
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
            console.log(parsed_news);
            cb(parsed_news);
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
const news3 = {
    title: 'AirDAO (@airdao_io)',
    body: "Strategic partnerships have consistently driven #AirDAO's growth and innovation.\n\nLearn more about AirDAO & INC4 collaboration in our blog https://t.co/3Td0fzjbl7",
    link: 'https://twitter.com/airdao_io/status/1714596164274892897',
    coins: ['1000PEPEUSDT'],
    time: get_formatted_date(1697702518849),
};

const news4 = {
    title: 'This is a title!!',
    body: 'body 123',
    link: 'https://google.com',
    coins: [],
    time: get_formatted_date(1697702518849),
};
const generateMockNewsFeed = () => [news2, news3, news4, news3];

// for Charting
function craft_binance_kline_end_point(symbol, interval) {
    const binance_kline_endpoint = 'https://fapi.binance.com' + '/fapi/v1/klines';

    const params = {
        symbol: symbol,
        interval: interval,
    };

    let paramString = qs.stringify(params);

    return binance_kline_endpoint + '?' + paramString;
}

function mapHTTPKlineData(kline) {
    return {
        time: kline[0] / 1000,
        open: +kline[1],
        high: +kline[2],
        low: +kline[3],
        close: +kline[4],
    };
}

function mapWSKlineData(kline) {
    return {
        time: kline.t / 1000,
        open: +kline.o,
        high: +kline.h,
        low: +kline.l,
        close: +kline.c,
    };
}

const newsUtils = {
    // get_formatted_date, // only used in parse_news
    // parse_news, // only used in initTreeWS // not needed to export
    initTreeWS,
    generateMockNewsFeed,
};

const chartUtils = {
    craft_binance_kline_end_point,
    mapHTTPKlineData,
    mapWSKlineData,
};

const BinanceUtils = {
    get_symbols_filter_info,
    // craft_binance_perp_order_url,
    // send_binance_limit_order,
    round_step_size,
    initBinancePriceStream,
    getPrecisionForToFixed,
};

export { GLOBAL_API, newsUtils, chartUtils, BinanceUtils };
