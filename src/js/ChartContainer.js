import React, { useEffect, useState, useRef, useContext } from 'react';

import { createChart, TickMarkType } from 'lightweight-charts';
import { Autocomplete, Box, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import moment from 'moment';

import { IntervalButton, SelectedIntervalButton } from './styles/StyledComponent123';
import { Binance, Bybit, commonUtils, IntervalUtils } from './utils';

import { BinanceContext, BinanceWSContext, BybitContext, BybitWSContext } from './providers';

// interface SeriesOptionCommon n LineStyleOptions
// https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon
// https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineStyleOptions
// draw sma sma10 purple 20 orange 50 blue

const MA10_Options = {
    lookback: 10,
    color: '#e040fb',
    lineWidth: 2,
    lineVisible: true,
    lastValueVisible: false, // disable value on price Axis
    priceLineVisible: false, // hide horizontal line

    // crosshairmarker is the circle on lineSeries
    crosshairMarkerVisible: false,
};

const MA20_Options = {
    ...MA10_Options,
    lookback: 20,

    color: '#f89401',
};
const MA50_Options = {
    ...MA10_Options,
    lookback: 50,
    color: '#2860f8',
};

const MA_Options = [MA10_Options, MA20_Options, MA50_Options];

// Chart Component = display klineData and connect to exchange websocket kline stream for real time updates
function Chart({
    symbol,
    interval,
    klineData,
    tickSize,
    wsContext,
    wsStreamName,
    subscribeTopicJSON,
    unsubscribeTopicJSON,
    mapWSKlineData,
}) {
    const [isOpen, wsSendMsg, subscribeToStreamName, unsubscribe] = wsContext;

    // [{open, high, low, close, time}, {open, high ...}]
    const [newDataFromWS, setNewDataFromWS] = useState();
    const [klineSeriesDrawer, setKlineSeriesDrawer] = useState(null);
    const [volSeriesDrawer, setVolSeriesDrawer] = useState(null);

    const [lineSeriesDrawerMA10, setLineSeriesDrawerMA10] = useState(null); // FIXME: lineSeriesDrawer why use useState
    const [lineSeriesDrawerMA20, setLineSeriesDrawerMA20] = useState(null);
    const [lineSeriesDrawerMA50, setLineSeriesDrawerMA50] = useState(null);

    const MA10_LOOKBACK = 10;
    const MA20_LOOKBACK = 20;
    const MA50_LOOKBACK = 50;

    const chartRef = useRef();
    const ohlcLegendRef = useRef();
    const volLegendRef = useRef();
    const timeRemainingLegendRef = useRef();

    // plot chart with kline data from binance kline api
    useEffect(() => {
        console.log('plotting chart', symbol, interval);

        const precision = commonUtils.getPrecisionForToFixed(tickSize);
        const minMove = tickSize; // parseFloat(tickSize); // 0.00001

        const chartOptions = {
            // https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ChartOptionsImpl
            width: chartRef.current.clientWidth,
            height: 330,

            layout: {
                textColor: 'white',
                background: { type: 'solid', color: '#141823' },
                fontSize: 12,
            },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.25,
                },
                borderVisible: false,
            },
            timeScale: {
                visible: true,
                timeVisible: true,
                borderColor: 'white',
                rightOffset: 3,
                fixLeftEdge: true,
                tickMarkFormatter: (time, tickMarkType, locale) => {
                    // moment(epoch_ms)
                    // console.log(time); 1698246000

                    const momentLocal = moment(time * 1000).local();
                    switch (tickMarkType) {
                        case TickMarkType.Year:
                            const yearFormatter = 'YY';
                            return momentLocal.format(yearFormatter);

                        case TickMarkType.Month:
                            const monthFormatter = 'MMM';
                            return momentLocal.format(monthFormatter);

                        case TickMarkType.DayOfMonth:
                            const dayFormatter = 'DD';
                            return momentLocal.format(dayFormatter);

                        case TickMarkType.Time:
                            const timeFormatter = 'HH:mm';
                            return momentLocal.format(timeFormatter);
                    }
                },
            },
            crosshair: {
                mode: 0, // default value 0 for "Magnet"
            },
            grid: {
                vertLines: { color: '#9E9E9E33' }, // hexa + opacity(00-ff)
                horzLines: { color: '#9E9E9E33' },
            },
            localization: {
                timeFormatter: (time) => {
                    let d = moment(time * 1000).local();
                    const formatter = 'ddd DD MMM YYYY HH:mm';

                    return d.format(formatter);
                },
            },
        };
        const klineOptions = {
            // Interface SeriesOptionsCommon
            lastValueVisible: true,
            // title: 'kline.title123',
            priceLineVisible: true,
            priceLineColor: 'yellow',

            upColor: '#26a69a',
            downColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',

            priceFormat: {
                type: 'price',
                precision: precision,
                minMove: minMove,
            },
        };
        const volumeOptions = {
            priceFormat: {
                type: 'volume',
            },
            lastValueVisible: false,
            priceLineVisible: false,

            priceScaleId: 'volId123', // set as an overlay by setting a blank priceScaleId
        };

        // init klineSeries n volume Histogram series
        const chart = createChart(chartRef.current, chartOptions);
        const klineSeries = chart.addCandlestickSeries(klineOptions);
        const volumeSeries = chart.addHistogramSeries(volumeOptions);

        volumeSeries.priceScale().applyOptions({
            // set the positioning of the volume series
            scaleMargins: {
                top: 0.9, // highest point of the series will be 70% away from the top
                bottom: 0,
            },
        });

        let volData = klineData.map(Binance.mapDataForVolumeHistogram);

        klineSeries.setData(klineData);
        volumeSeries.setData(volData);

        setKlineSeriesDrawer(klineSeries);
        setVolSeriesDrawer(volumeSeries);

        // moving average lineSeries
        MA_Options.forEach((ma_option) => {
            const lookback = ma_option.lookback;

            const maSeries = chart.addLineSeries(ma_option);
            const maData = calculateSMAFromKline(klineData, lookback);

            maSeries.setData(maData); // setData( [ {value: 0, time: epoch }, {...} ])

            if (lookback == 10) {
                setLineSeriesDrawerMA10(maSeries);
            } else if (lookback == 20) {
                setLineSeriesDrawerMA20(maSeries);
            } else if (lookback == 50) {
                setLineSeriesDrawerMA50(maSeries);
            }
        });

        // symbolName https://tradingview.github.io/lightweight-charts/tutorials/how_to/legends#:~:text=In%20order%20to%20add%20a,within%20our%20html%20legend%20element.
        const legend = document.createElement('div');
        legend.style = `position: absolute; left: 12px; top: 12px; z-index: 1; font-size: 12px; font-family: Helvetica; width: ${chartRef.current.clientWidth}px;`;

        const ohlcLegend = document.createElement('div');
        ohlcLegend.style = 'color: white;';

        const volLegend = document.createElement('div');
        volLegend.style = 'padding: 4px 0px 0px 0px; color: white;';

        const oiLegend = document.createElement('div');
        oiLegend.style = 'padding: 8px 0px 0px 0px; color: white;';
        oiLegend.innerHTML = 'oi: ';

        const timeRemainingLegend = document.createElement('div');
        timeRemainingLegend.style = 'position: absolute; top: 0;  right: 70px; color: yellow;';

        chartRef.current.style = `position: relative;`;
        chartRef.current.appendChild(legend);
        legend.appendChild(ohlcLegend);
        legend.appendChild(volLegend);
        legend.appendChild(timeRemainingLegend);
        legend.appendChild(oiLegend);

        ohlcLegendRef.current = ohlcLegend;
        volLegendRef.current = volLegend;
        timeRemainingLegendRef.current = timeRemainingLegend;

        function handleCrossHairMoveForLegend(param) {
            // console.log(param);
            // param.time == undefined if mouse away from given candlesticks
            // param.point.x .y if inside chart, if mouse went over to axis == undefined

            //https://tradingview.github.io/lightweight-charts/tutorials/how_to/tooltips#getting-the-mouse-cursors-position
            if (
                !param.time ||
                param.point === undefined ||
                param.point.x < 0 ||
                param.point.x > chartRef.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartRef.current.clientHeight
            ) {
                return;
            }

            let kline = param.seriesData.get(klineSeries);
            let volBar = param.seriesData.get(volumeSeries);

            if (!kline || !volBar) {
                return;
            }

            ohlcLegend.innerHTML = formatOHLCLegend(kline);
            volLegend.innerHTML = formatVolLegend(volBar);
        }

        // quick code for Measure tool tip. use Shift + leftClick on chart
        let toolTip = document.createElement('div');
        const toolTipWidth = 100;
        const toolTipHeight = 60;
        toolTip.style = `width: 100px; height: 60px; position: absolute; display: none; padding: 4px; box-sizing: border-box; font-size: 12px; text-align: left; z-index: 1000; top: 12px; left: 12px; pointer-events: none; 
        border: 1px solid; border-radius: 2px; font-family: Helvetica, Roboto;
        -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`;
        toolTip.style.background = '#4169E1CC';
        toolTip.style.borderColor = '#4169E1CC';
        toolTip.style.color = 'white';
        chartRef.current.appendChild(toolTip);

        function handleCrossHairMoveRulerWrapper(param, startPrice) {
            function handleCrossHairMoveRuler(param) {
                if (param.point === undefined || param.point.x < 0 || param.point.y < 0) {
                    return;
                }

                let x = param.point.x;
                let y = param.point.y;
                let endCoordinatePrice = klineSeries.coordinateToPrice(y);
                let pct_change = ((endCoordinatePrice - startPrice) / startPrice) * 100;
                toolTip.innerHTML = `<div>
                <div>start: ${startPrice.toFixed(precision)}</div>
                <div>end  : ${endCoordinatePrice.toFixed(precision)}</div>
                <div>pct    : ${pct_change.toFixed(2)}% </div>
                </div>`;
            }

            return handleCrossHairMoveRuler(param);
        }

        function MeasureClickHandler(param) {
            if (
                param.point.x < 0 ||
                param.point.x > chartRef.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartRef.current.clientHeight
            ) {
                toolTip.style.display = 'none';
                return;
            }

            const sourceEvent = param.sourceEvent;
            if (sourceEvent.shiftKey) {
                let x = param.point.x;
                let y = param.point.y;
                let startCoordinatePrice = klineSeries.coordinateToPrice(y);

                const toolTipX = x - toolTipWidth;
                const toolTipY = y - toolTipHeight;

                toolTip.style.display = 'block';
                toolTip.style.left = toolTipX + 'px';
                toolTip.style.top = toolTipY + 'px';
                chart.subscribeCrosshairMove((param) =>
                    handleCrossHairMoveRulerWrapper(param, startCoordinatePrice)
                );
            } else {
                toolTip.style.display = 'none';
                chart.unsubscribeCrosshairMove((param) =>
                    handleCrossHairMoveRulerWrapper(param, startCoordinatePrice)
                );
            }
        }

        chart.subscribeClick(MeasureClickHandler);
        chart.subscribeCrosshairMove(handleCrossHairMoveForLegend);

        return () => {
            chart.unsubscribeClick(MeasureClickHandler);
            chart.unsubscribeCrosshairMove(handleCrossHairMoveForLegend);
            chart.remove();
        };
    }, [klineData]);

    // run useEffect if there are changes to WS Connection 'isOpen',
    // if not open, return
    useEffect(() => {
        /* 
        1. send msg to websocket to subscribe to stream 
        2. wsProvider channels is a mapping of channel_name to callbackfn. eg 'btcusdt@kline_1h' -> updateKlineCharts func
        - use 'subscribeToStreamName' and 'unsubscribe' to add func to streamName
        - channel_name = {symbol}@kline_{interval} // symbol lowerCase
        - callback_fn = from e.data json, .mapWSKLineData and setNewData
        3. teardown fn = send msg to websocket to unsubscribe, del callback fn from wsProvider
        */
        if (!isOpen) {
            return;
        }

        wsSendMsg(subscribeTopicJSON);

        const cb = (data) => {
            let parsedKlineData = mapWSKlineData(data);
            setNewDataFromWS(parsedKlineData);
        };
        subscribeToStreamName(wsStreamName, cb);

        // teardown
        return () => {
            wsSendMsg(unsubscribeTopicJSON);
            unsubscribe(wsStreamName, cb);
        };
    }, [isOpen]);

    // if newDataFromWS, update kline / volumeHistogram / legends / ma indicators
    useEffect(() => {
        if (newDataFromWS) {
            // newDataFromWS from utils.mapWSKlineData, type {time, open, high ..., volume}
            // newVolData type {time, value}
            let newVolData = Binance.mapDataForVolumeHistogram(newDataFromWS);

            klineSeriesDrawer.update(newDataFromWS);
            volSeriesDrawer.update(newVolData);

            // update html elems
            let kline_event_time = newDataFromWS['e'];

            ohlcLegendRef.current.innerHTML = formatOHLCLegend(newDataFromWS);
            volLegendRef.current.innerHTML = formatVolLegend(newVolData);
            timeRemainingLegendRef.current.innerHTML = fKlineCountdown(kline_event_time, interval); // FIXME:

            // moving average
            const currentKlineData = klineSeriesDrawer.data();
            let latestMA10 = calculateLatestSMA(currentKlineData, MA10_LOOKBACK);
            let latestMA20 = calculateLatestSMA(currentKlineData, MA20_LOOKBACK);
            let latestMA50 = calculateLatestSMA(currentKlineData, MA50_LOOKBACK);

            lineSeriesDrawerMA10.update(latestMA10);
            lineSeriesDrawerMA20.update(latestMA20);
            lineSeriesDrawerMA50.update(latestMA50);
        }
    }, [newDataFromWS]);

    return <div ref={chartRef} />;
}

export default function ChartContainer({
    exchange = 'binance',
    symbol = 'BTCUSDT',
    sxProps,
    setOrderSymbol, // from parent
    interval = '1h',
}) {
    const binanceWSContext = useContext(BinanceWSContext);
    const bybitWSContext = useContext(BybitWSContext);
    const [binanceSymbols, binanceSymbolsInfo] = useContext(BinanceContext);
    const [bybitSymbols, bybitSymbolsInfo] = useContext(BybitContext);

    const chartContainerRef = useRef(null);

    // var inputs:
    // 1. exchange binance or bybit
    // 2. based on exchange, interval mapping might be diff. 1h = 1h on binance, 60 on bybit
    const [currentExchange, setCurrentExchange] = useState(exchange);

    const exchangeIntervalMapping = IntervalUtils.exchangeIntervalMapping; // FIXME: store exchange mapping here or utils.js
    const exchangeInterval123 = exchangeIntervalMapping[interval][currentExchange]; // TODO: below if else clause can follow this
    const [exchangeInterval, setExchangeInterval] = useState(exchangeInterval123);

    const [currentSymbol, setCurrentSymbol] = useState(symbol);
    const [currentUIInterval, setCurrentUIInterval] = useState(interval);
    const [klineData, setKlineData] = useState([]);

    const UI_symbols = currentExchange == 'binance' ? binanceSymbols : bybitSymbols;
    const UI_Intervals = IntervalUtils.UI_Intervals;

    // vars for ChartContainer calling kline data api
    let klineEndPoint, parseKlineData;

    // Chart Props
    let tickSize, wsContext, wsStreamName, subscribeTopicJSON, unsubscribeTopicJSON, mapWSKlineData;

    const randomNumber = commonUtils.generateRandomNumber();

    // FIXME:
    if (currentExchange == 'binance') {
        klineEndPoint = Binance.craft_binance_kline_end_point(currentSymbol, exchangeInterval);
        parseKlineData = Binance.parseBinanceKlineResponse;

        tickSize = binanceSymbolsInfo[currentSymbol]['tickSize'];
        wsContext = binanceWSContext;
        wsStreamName = `${currentSymbol.toLowerCase()}@kline_${exchangeInterval}`;
        subscribeTopicJSON = Binance.generateSubscribeTopicJson(wsStreamName, randomNumber);
        unsubscribeTopicJSON = Binance.generateUnsubscribeTopicJson(wsStreamName, randomNumber);
        mapWSKlineData = Binance.parseBinanceWSKlineData;
    }

    if (currentExchange == 'bybit') {
        // https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&limit=500
        // FIXME: currently using hardcoded values 1h == 60 interval
        klineEndPoint = Bybit.craft_bybit_kline_end_point(currentSymbol, exchangeInterval);
        parseKlineData = Bybit.parseBybitKlineResponse;

        tickSize = bybitSymbolsInfo[currentSymbol]['tickSize'];
        wsContext = bybitWSContext;
        wsStreamName = `kline.${exchangeInterval}.${currentSymbol}`;
        subscribeTopicJSON = Bybit.bybitGenerateSubscribeTopicJson(wsStreamName, randomNumber);
        unsubscribeTopicJSON = Bybit.bybitGenerateUnsubscribeTopicJson(wsStreamName, randomNumber);
        mapWSKlineData = Bybit.parseBybitWSKlineData;
    }

    // console.log(
    //     `printing vars, exchange: ${currentExchange}, exInterval: ${exchangeInterval}, ${currentSymbol}, ${currentUIInterval}`
    // );
    // console.log(
    //     `streamname: ${wsStreamName}, subTopic: ${subscribeTopicJSON}, unsubTopic: ${unsubscribeTopicJSON}`
    // );

    // FIXME: quick fix
    function handleOnChangeExchange(event) {
        if (currentExchange == 'binance') {
            // FIXME: changing exchange values only does not trigger other useState like useState(interval)
            // thus, interval is still at previous exchange's interval
            // eg; from binance 1d change to bybit, bybit 1d. should be bybit D
            setCurrentExchange('bybit');
            setExchangeInterval(exchangeIntervalMapping[currentUIInterval]['bybit']);
            setCurrentSymbol('BTCUSDT');
        } else {
            setCurrentExchange('binance');
            setExchangeInterval(exchangeIntervalMapping[currentUIInterval]['binance']);
            setCurrentSymbol('BTCUSDT');
        }

        console.log('in handleonchange excahnge', currentExchange);
    }

    function handleOnChangeSymbol(event, newSymbol) {
        setCurrentSymbol(newSymbol);
    }

    function handleOnClickUIInterval(event, interval) {
        function changeInterval(interval) {
            setCurrentUIInterval(interval);
            setExchangeInterval(exchangeIntervalMapping[interval][currentExchange]);
        }
        return changeInterval(interval);
    }
    useEffect(() => {
        // new. if theres changes to symbol / interval / exchange, set kline data to empty and fetch new data
        setKlineData([]);

        const fetch_options = {
            method: 'GET',
        };

        fetch(klineEndPoint, fetch_options)
            .then((res) => res.json())
            .then((data) => {
                console.log('from fetch kline endpoint', klineEndPoint);

                let parsedData = parseKlineData(data);
                setKlineData(parsedData);
            });

        const elem = chartContainerRef.current;
        function onDblClickListener(e) {
            if (!!setOrderSymbol) {
                setOrderSymbol(currentSymbol);
            }
        }

        elem.addEventListener('dblclick', onDblClickListener);

        return () => {
            setKlineData([]);
            elem.removeEventListener('dblclick', onDblClickListener);
        };
    }, [currentSymbol, currentUIInterval, currentExchange]);

    return (
        <Box
            ref={chartContainerRef}
            sx={{
                padding: '0px 0px 8px 8px',
                border: '2px solid #141823',
                backgroundColor: '#141823',
                ...sxProps,
            }}
        >
            <Stack
                direction={'row'}
                spacing={1}
                sx={{ padding: '4px', borderBottom: '2px solid gray' }}
            >
                <Autocomplete
                    options={UI_symbols}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            variant="standard"
                            InputProps={{
                                ...params.InputProps,
                                style: { fontSize: '14px', fontFamily: 'Helvetica' },
                            }}
                        />
                    )}
                    value={currentSymbol}
                    onChange={handleOnChangeSymbol}
                    autoHighlight
                    disableClearable
                    sx={{
                        width: '124px',
                        maxWidth: '124px',
                        minWidth: '124px',
                    }}
                ></Autocomplete>

                {UI_Intervals.map((ui_interval, i) =>
                    ui_interval == currentUIInterval ? (
                        <SelectedIntervalButton
                            key={i}
                            onClick={(e) => handleOnClickUIInterval(e, ui_interval)}
                        >
                            {ui_interval}
                        </SelectedIntervalButton>
                    ) : (
                        <IntervalButton
                            key={i}
                            onClick={(e) => handleOnClickUIInterval(e, ui_interval)}
                        >
                            {ui_interval}
                        </IntervalButton>
                    )
                )}

                <FormControlLabel
                    value="start"
                    control={<Checkbox onChange={handleOnChangeExchange} />}
                    label="bybit?"
                    labelPlacement="start"
                />
            </Stack>

            {/* FIXME: rethink this ternary logic */}
            {klineData.length != 0 && (
                <Chart
                    symbol={currentSymbol}
                    interval={currentUIInterval}
                    klineData={klineData}
                    tickSize={tickSize}
                    wsContext={wsContext}
                    wsStreamName={wsStreamName}
                    subscribeTopicJSON={subscribeTopicJSON}
                    unsubscribeTopicJSON={unsubscribeTopicJSON}
                    mapWSKlineData={mapWSKlineData}
                />
            )}
        </Box>
    );
}

// FIXME: hacks

function mapOIHistData(oiHist) {
    // for /futures/data/openInterestHist
    //     {
    //         "symbol":"BTCUSDT",
    //          "sumOpenInterest":"20403.63700000",  // total open interest
    //          "sumOpenInterestValue": "150570784.07809979",   // total open interest value
    //          "timestamp":"1583127900000"
    //    }
    //  map above to {time, value}

    return {
        time: parseFloat(oiHist['timestamp']) / 1000,
        value: parseFloat(oiHist['sumOpenInterest']),
    };
}

function mapOIData(oi, interval) {
    // for /fapi/v1/openInterest
    // oi data {openInterest, symbol, time} convert to -> {time, value}
    return {
        time: roundToNearestInterval(oi['time'], interval) / 1000,
        value: parseFloat(oi['openInterest']),
    };
}

function formatOHLCLegend(kline) {
    let amplitude = Math.abs(((kline.high - kline.low) / kline.low) * 100).toFixed(2);

    let legend = `O: ${kline.open} H: ${kline.high} L: ${kline.low} C: ${kline.close} A: ${amplitude}%`;

    return legend;
}

function formatVolLegend(volBar) {
    const volumeNumberFormatter = Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 2,
    });

    let legend = `vol: ${volumeNumberFormatter.format(volBar.value)}`;
    return legend;
}

// FIXME: similar fn to formatVolLegend
function formatOILegend(oiBar) {
    if (!oiBar) {
        return 'oi: NaN';
    }
    const oiNumberFormatter = Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 2,
    });

    let legend = `oi: ${oiNumberFormatter.format(oiBar.value)}`;
    return legend;
}

// calculate full all data
function calculateSMAFromKline(data, count) {
    // from https://jsfiddle.net/TradingView/537kjtfg/
    var avg = function (data) {
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
            sum += data[i].close;
        }
        return sum / data.length;
    };

    var result = [];
    // data=[array of 500 ohlc time], count=10
    // array index = 0 1 2 3 4 5 6 7 8 9
    // on 10th candle which is index 9, able to calculate ma
    // ma(10th candle) == avg of close1 + close2 + ... ongoing_10th candle
    for (var i = count - 1, len = data.length; i < len; i++) {
        var val = avg(data.slice(i - count + 1, i + 1));
        result.push({ time: data[i].time, value: val });
    }

    return result;
}

// calculate latest
function calculateLatestSMA(data, count) {
    // from https://jsfiddle.net/TradingView/537kjtfg/
    var avg = function (data) {
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
            sum += data[i].close;
        }
        return sum / data.length;
    };

    // data=[array of 500 ohlc time], count=10
    // array index = 0 1 2 3 4 5 6 7 8 9
    // on 10th candle which is index 9, able to calculate ma
    // ma(10th candle) == avg of close1 + close2 + ... ongoing_10th candle

    // get latest sma =
    // data[-count] => if MA10, data[-10:]
    const subsetData = data.slice(-count, data.length);
    const subsetDataLength = subsetData.length;

    var val = avg(subsetData);
    var result = {
        time: subsetData[subsetDataLength - 1].time,
        value: val,
    };

    return result;
}

// similar fn to fKlineCountdown
function roundToNearestInterval(epoch_ms, interval) {
    // round down epoch_ms to nearest interval
    const interval_to_ms = {
        '1m': 60 * 1000,
        '3m': 3 * 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '1w': 7 * 24 * 60 * 60 * 1000,
    };

    const interval_ms = interval_to_ms[interval];
    let ms_passed = epoch_ms % interval_ms;

    let nearestInterval_ms = epoch_ms - ms_passed;
    return nearestInterval_ms;
}

// https://stackoverflow.com/questions/31337370/how-to-convert-seconds-to-hhmmss-in-moment-js
function fKlineCountdown(epoch_ms, interval) {
    // interval = 1m 3m 15m 1h 4h 1d 1w

    const interval_to_ms = {
        '1m': 60 * 1000,
        '3m': 3 * 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '1w': 7 * 24 * 60 * 60 * 1000,
    };

    const interval_ms = interval_to_ms[interval];

    let format = 'mm:ss';
    if (interval_ms > interval_to_ms['1h']) {
        format = 'HH:mm:ss';
    }

    let ms_passed = epoch_ms % interval_ms;
    let ms_remaining = interval_ms - ms_passed;

    let remainingTime = moment
        .utc(moment.duration(ms_remaining, 'milliseconds').asMilliseconds())
        .format(format);

    return remainingTime;
}
