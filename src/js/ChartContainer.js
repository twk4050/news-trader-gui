import React, { useEffect, useState, useRef } from 'react';

import { createChart, TickMarkType } from 'lightweight-charts';
import { Autocomplete, Box, Stack, TextField, tooltipClasses } from '@mui/material';
import moment from 'moment';

import { IntervalButton, SelectedIntervalButton } from './styles/StyledComponent123';
import { chartUtils, BinanceUtils } from './utils';

/* 
ChartContainer
- from symbol and interval, getKlineData
- if klineData, render Chart

Chart props (symbol?, interval?, klineData, symbolsFilterInfo)
- tickSize = symbolsFilterInfo[symbol]['tickSize'] # can remove prop drilling 'symbolsFilterInfo' and pass tickSize
*/

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

const mock_oi_data = [
    { time: 1701586800.0, value: 1990444 },
    { time: 1701590400.0, value: 2027274 },
    { time: 1701594000.0, value: 2070516 },
    { time: 1701597600.0, value: 2106620 },
    { time: 1701601200.0, value: 2054970 },
    { time: 1701604800.0, value: 2018190 },
    { time: 1701608400.0, value: 2022518 },
    { time: 1701612000.0, value: 1995017 },
    { time: 1701615600.0, value: 1986856 },
    { time: 1701619200.0, value: 2024984 },
];

// FIXME: junk code
function Chart({ symbol, interval, klineData, symbolsFilterInfo }) {
    // [{open, high, low, close, time}, {open, high ...}]
    const [newDataFromWS, setNewDataFromWS] = useState();
    const [klineSeriesDrawer, setKlineSeriesDrawer] = useState(null);
    const [volSeriesDrawer, setVolSeriesDrawer] = useState(null);
    const [oiSeriesDrawer, setOISeriesDrawer] = useState(null);

    const [lineSeriesDrawerMA10, setLineSeriesDrawerMA10] = useState(null); // FIXME: lineSeriesDrawer why use useState
    const [lineSeriesDrawerMA20, setLineSeriesDrawerMA20] = useState(null);
    const [lineSeriesDrawerMA50, setLineSeriesDrawerMA50] = useState(null);

    const MA10_LOOKBACK = 10;
    const MA20_LOOKBACK = 20;
    const MA50_LOOKBACK = 50;

    const wsRef = useRef(null);
    const chartRef = useRef();
    const ohlcLegendRef = useRef();
    const volLegendRef = useRef();
    const timeRemainingLegendRef = useRef();

    // plot chart with kline data from binance kline api
    useEffect(() => {
        console.log('plotting chart ', symbol, interval, 'test123');

        const tickSize = symbolsFilterInfo[symbol]['tickSize'];

        const precision = BinanceUtils.getPrecisionForToFixed(tickSize);
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

        const oiOptions = {
            color: '#e040fb',

            priceFormat: {
                type: 'volume',
            },
            lastValueVisible: false, // disable value on price Axis
            priceLineVisible: false, // hide horizontal line
            priceScaleId: 'oiid123', // set something different than volume pricescaleid
            // crosshairmarker is the circle on lineSeries
            crosshairMarkerVisible: false,
        };

        // init klineSeries n volume Histogram series
        const chart = createChart(chartRef.current, chartOptions);
        const klineSeries = chart.addCandlestickSeries(klineOptions);
        const volumeSeries = chart.addHistogramSeries(volumeOptions);
        const oiSeries = chart.addHistogramSeries(oiOptions);

        oiSeries.priceScale().applyOptions({
            // set the positioning of the volume series
            scaleMargins: {
                top: 0.8, // highest point of the series will be 70% away from the top
                bottom: 0.1,
            },
        });
        oiSeries.setData(mock_oi_data);

        volumeSeries.priceScale().applyOptions({
            // set the positioning of the volume series
            scaleMargins: {
                top: 0.9, // highest point of the series will be 70% away from the top
                bottom: 0,
            },
        });

        let volData = klineData.map(chartUtils.mapDataForVolumeHistogram);

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

        const timeRemainingLegend = document.createElement('div');
        timeRemainingLegend.style = 'position: absolute; top: 0;  right: 70px; color: yellow;';

        chartRef.current.style = `position: relative;`;
        chartRef.current.appendChild(legend);
        legend.appendChild(ohlcLegend);
        legend.appendChild(volLegend);
        legend.appendChild(timeRemainingLegend);

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

            if (!kline) {
                return;
            }

            ohlcLegend.innerHTML = formatOHLCLegend(kline);
            volLegend.innerHTML = formatVolLegend(volBar);
        }

        // FIXME: quick code for Measure tool tip. use Shift + leftClick on chart
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

    // handle WS connection
    useEffect(() => {
        if (
            wsRef.current === null ||
            wsRef.current.readyState === WebSocket.CLOSING ||
            wsRef.current.readyState === WebSocket.CLOSED
        ) {
            const ws_url = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`;
            console.log(`connecting to ${ws_url}`);
            // let x = new WebSocket(ws_url);

            wsRef.current = new WebSocket(ws_url);
            wsRef.current.onopen = () => console.log(`connected to ${ws_url}`);

            wsRef.current.onmessage = (event) => {
                let data = JSON.parse(event.data);

                let parsedKlineData = chartUtils.mapWSKlineData(data);

                setNewDataFromWS(parsedKlineData);
            };
        }

        return () => {
            console.log(`closing connection: ${wsRef.current.url}`);
            wsRef.current.close();
        };
    }, [symbol, interval]);

    useEffect(() => {
        if (newDataFromWS) {
            // newDataFromWS from utils.mapWSKlineData, type {time, open, high ..., volume}
            // newVolData type {time, value}
            let newVolData = chartUtils.mapDataForVolumeHistogram(newDataFromWS);

            klineSeriesDrawer.update(newDataFromWS);
            volSeriesDrawer.update(newVolData);

            // update html elems
            let kline_event_time = newDataFromWS['e'];

            ohlcLegendRef.current.innerHTML = formatOHLCLegend(newDataFromWS);
            volLegendRef.current.innerHTML = formatVolLegend(newVolData);
            timeRemainingLegendRef.current.innerHTML = fKlineCountdown(kline_event_time, interval);

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
    sxProps,
    symbolsFilterInfo,
    setOrderSymbol, // from parent
    symbol = 'BTCUSDT',
    interval = '1h',
}) {
    // const symbols = ['BTCUSDT', 'ETHUSDT', 'LINKUSDT', 'TRBUSDT', 'SOLUSDT', '1000PEPEUSDT'];
    const symbols = Object.keys(symbolsFilterInfo); // return array of obj keys
    const intervals = ['1m', '3m', '15m', '1h', '4h', '1d', '1w'];
    const [currentSymbol, setCurrentSymbol] = useState(symbol);
    const chartContainerRef = useRef(null);

    const [currentInterval, setCurrentInterval] = useState(interval);
    const [klineData, setKlineData] = useState([]);

    function handleOnChangeSymbol(event, newSymbol) {
        setKlineData([]);

        setCurrentSymbol(newSymbol); // FIXME:
    }
    function handleOnClickInterval(event, interval) {
        function changeInterval(interval) {
            if (interval !== currentInterval) {
                setKlineData([]);
            }
            setCurrentInterval(interval);
        }
        return changeInterval(interval);
    }
    useEffect(() => {
        const kline_end_point = chartUtils.craft_binance_kline_end_point(
            currentSymbol,
            currentInterval
        );
        const fetch_options = {
            method: 'GET',
        };

        fetch(kline_end_point, fetch_options)
            .then((res) => res.json())
            .then((data) => {
                console.log('getting data', currentSymbol, currentInterval);
                let parsedData = data.map(chartUtils.mapHTTPKlineData);
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
            elem.removeEventListener('dblclick', onDblClickListener);
        };
    }, [currentSymbol, currentInterval]);

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
                    options={symbols}
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
                        width: '140px',
                        maxWidth: '140px',
                        minWidth: '140px',
                    }}
                ></Autocomplete>

                {intervals.map((interval, i) =>
                    interval == currentInterval ? (
                        <SelectedIntervalButton
                            key={i}
                            onClick={(e) => handleOnClickInterval(e, interval)}
                        >
                            {interval}
                        </SelectedIntervalButton>
                    ) : (
                        <IntervalButton key={i} onClick={(e) => handleOnClickInterval(e, interval)}>
                            {interval}
                        </IntervalButton>
                    )
                )}
            </Stack>

            {klineData.length != 0 && (
                <Chart
                    symbol={currentSymbol}
                    interval={currentInterval}
                    klineData={klineData}
                    symbolsFilterInfo={symbolsFilterInfo}
                />
            )}
        </Box>
    );
}

// FIXME: hacks

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
