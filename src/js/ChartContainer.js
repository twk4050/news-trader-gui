import React, { useEffect, useState, useRef, useContext } from 'react';

import { createChart, TickMarkType } from 'lightweight-charts';
import { Autocomplete, Box, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import moment from 'moment';

import { IntervalButton, SelectedIntervalButton } from './styles/StyledComponent123';
import { Binance, Bybit, commonUtils, ChartContainerUtils } from './utils';

import { BinanceContext, BinanceWSContext, BybitContext, BybitWSContext } from './providers';

// interface SeriesOptionCommon n LineStyleOptions
// https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon
// https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineStyleOptions
// draw sma sma10 purple 20 orange 50 blue

// TODO: try series.subscribeDataChange instead of updating in ws

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
        const MA10_Data = calculateSMAFromKline(klineData, MA10_Options.lookback);
        const MA20_Data = calculateSMAFromKline(klineData, MA20_Options.lookback);
        const MA50_Data = calculateSMAFromKline(klineData, MA50_Options.lookback);

        const MA10_Series = chart.addLineSeries(MA10_Options);
        const MA20_Series = chart.addLineSeries(MA20_Options);
        const MA50_Series = chart.addLineSeries(MA50_Options);
        MA10_Series.setData(MA10_Data);
        MA20_Series.setData(MA20_Data);
        MA50_Series.setData(MA50_Data);

        setLineSeriesDrawerMA10(MA10_Series);
        setLineSeriesDrawerMA20(MA20_Series);
        setLineSeriesDrawerMA50(MA50_Series);

        /* 
            set markers for candles that bounce off ma20
            // ma10 > ma20
            // 1. price open higher than ma, 2. price dip below 3. price close above ma
            bounce: ma20 < k.open and  k.low < ma20 and ma20 < k.close        
        */
        const dateForMarkers = [];
        const markers = [];

        for (let i = 0; i < klineSeries.data().length; i++) {
            const kline = klineSeries.data()[i];
            const ma10 = MA10_Series.dataByIndex(i);
            const ma20 = MA20_Series.dataByIndex(i); // .dataByIndex(0) => null, .dataByIndex(21) => {value: ..., time: ...}

            if (!ma20) {
                continue;
            }

            // ma10 value must be higher than ma20
            if (ma10.value < ma20.value) {
                continue;
            }

            let ma20Value = ma20.value;
            if (bounceOffMA(kline, ma20Value)) {
                dateForMarkers.push(kline.time);
            }
        }
        for (let date of dateForMarkers) {
            markers.push({
                time: date,
                position: 'belowBar', // "aboveBar" | "belowBar" | "inBar"
                color: '#f68410',
                shape: 'arrowUp', // "circle" | "square" | "arrowUp" | "arrowDown"
                text: 'B',
            });
        }

        klineSeries.setMarkers(markers);

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
        console.log('in Chart, useEffect', subscribeTopicJSON, unsubscribeTopicJSON);
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
            let latestMA10 = calculateLatestSMA(currentKlineData, MA10_Options.lookback);
            let latestMA20 = calculateLatestSMA(currentKlineData, MA20_Options.lookback);
            let latestMA50 = calculateLatestSMA(currentKlineData, MA50_Options.lookback);

            lineSeriesDrawerMA10.update(latestMA10);
            lineSeriesDrawerMA20.update(latestMA20);
            lineSeriesDrawerMA50.update(latestMA50);
        }
    }, [newDataFromWS]);

    return <div ref={chartRef} />;
}

export default function ChartContainer({
    exchangeProp = 'binance',
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
    const [exchange, setExchange] = useState(exchangeProp);
    const [currentUIInterval, setCurrentUIInterval] = useState(interval);
    const [currentSymbol, setCurrentSymbol] = useState(symbol); // FIXME: change var name to symbol? then props become symbolProp
    const [klineData, setKlineData] = useState([]);

    const exchangeIntervalMapping = ChartContainerUtils.exchangeIntervalMapping;
    const exchangeInterval123 = exchangeIntervalMapping[interval][exchange];
    const [exchangeInterval, setExchangeInterval] = useState(exchangeInterval123);

    // func mappings E.craftKlineEndpoint.binance / E.craftKlineEndpoint.bybit
    const E = ChartContainerUtils.exchangeFuncMapping;
    E['symbols'] = { binance: binanceSymbols, bybit: bybitSymbols };
    E['symbolsInfo'] = { binance: binanceSymbolsInfo, bybit: bybitSymbolsInfo };
    E['wsContext'] = { binance: binanceWSContext, bybit: bybitWSContext };

    // vars for Chart component and UI
    const randomNumber = commonUtils.generateRandomNumber();
    const UI_symbols = E.symbols[exchange]; // UI_symbols = exchange == 'binance' ? binanceSymbols : bybitSymbols;
    const klineEndPoint = E.craftKlineEndPoint[exchange](currentSymbol, exchangeInterval);
    const parseKlineData = E.parseKlineResponse[exchange];
    const tickSize = E['symbolsInfo'][exchange][currentSymbol]['tickSize'];
    const wsContext = E['wsContext'][exchange];
    const wsStreamName = E.craftKlineStreamName[exchange](currentSymbol, exchangeInterval);
    const subscribeTopicJSON = E.craftSubTopicJSON[exchange](wsStreamName, randomNumber);
    const unsubscribeTopicJSON = E.craftUnsubTopicJSON[exchange](wsStreamName, randomNumber);
    const mapWSKlineData = E.parseWSKlineData[exchange];

    // FIXME: quick fix
    function handleOnChangeExchange(event) {
        if (exchange == 'binance') {
            // FIXME: changing exchange values only does not trigger other useState like useState(interval)
            // thus, interval is still at previous exchange's interval
            // eg; from binance 1d change to bybit, bybit 1d. should be bybit D
            setExchange('bybit');
            setExchangeInterval(exchangeIntervalMapping[currentUIInterval]['bybit']);
            setCurrentSymbol('BTCUSDT');
        } else {
            setExchange('binance');
            setExchangeInterval(exchangeIntervalMapping[currentUIInterval]['binance']);
            setCurrentSymbol('BTCUSDT');
        }
    }

    function handleOnChangeSymbol(event, newSymbol) {
        setCurrentSymbol(newSymbol);
    }

    function handleOnClickUIInterval(event, interval) {
        function changeInterval(interval) {
            setCurrentUIInterval(interval);
            setExchangeInterval(exchangeIntervalMapping[interval][exchange]);
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
    }, [currentSymbol, currentUIInterval, exchange]);

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

                {ChartContainerUtils.UI_Intervals.map((ui_interval, i) =>
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
function bounceOffMA(kline, maValue) {
    let open = kline.open;
    let low = kline.low;
    let close = kline.close;

    return maValue < open && low < maValue && maValue < close;
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
