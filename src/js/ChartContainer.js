import React, { useEffect, useState, useRef } from 'react';

import { createChart, TickMarkType } from 'lightweight-charts';
import { Autocomplete, Box, Stack, TextField, tooltipClasses } from '@mui/material';
import moment from 'moment';

import { IntervalButton, SelectedIntervalButton } from './styles/StyledComponent123';
import { chartUtils, BinanceUtils } from './utils';

// FIXME: junk code
function Chart({ symbol, interval, klineData, symbolsFilterInfo, plotMA = true }) {
    // [{open, high, low, close, time}, {open, high ...}]
    const [newDataFromWS, setNewDataFromWS] = useState();
    const [klineSeriesDrawer, setKlineSeriesDrawer] = useState(null);
    const [lineSeriesDrawerMA10, setLineSeriesDrawerMA10] = useState(null);
    const [lineSeriesDrawerMA20, setLineSeriesDrawerMA20] = useState(null);

    const MA10_LOOKBACK = 10;
    const MA20_LOOKBACK = 20;

    const wsRef = useRef(null);
    const chartRef = useRef();

    // plot chart with new data
    useEffect(() => {
        console.log('plotting chart ', symbol, interval, 'test123');

        // FIXME:
        // "1000FLOKIUSDT": {
        //     "pricePrecision": 7,
        //     "tickSize": "0.0000100",
        // },

        const tickSize = symbolsFilterInfo[symbol]['tickSize'];

        const precision = BinanceUtils.getPrecisionForToFixed(tickSize);
        const minMove = tickSize; // parseFloat(tickSize); // 0.00001

        const chartOptions = {
            // https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ChartOptionsImpl
            width: chartRef.current.clientWidth,
            height: 330,

            layout: { textColor: 'white', background: { type: 'solid', color: '#141823' } },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.2,
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
                vertLines: { color: '#9E9E9E88' }, // hexa + opacity(00-ff)
                horzLines: { color: '#9E9E9E88' },
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

        const chart = createChart(chartRef.current, chartOptions);
        const klineSeries = chart.addCandlestickSeries(klineOptions);
        klineSeries.setData(klineData);
        setKlineSeriesDrawer(klineSeries);

        // draw sma sma10 purple 20 orange
        if (plotMA) {
            // interface SeriesOptionCommon n LineStyleOptions
            // https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon
            // https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LineStyleOptions
            // setData( [ {value: 0, time: epoch }, {...} ])
            const ma10Options = {
                color: '#e040fb',
                lineWidth: 2,
                lastValueVisible: false, // disable value on price Axis
                priceLineVisible: false, // hide horizontal line

                // crosshairmarker is the circle on lineSeries
                crosshairMarkerVisible: false,
            };

            const ma10Series = chart.addLineSeries(ma10Options);
            const ma10Data = calculateSMAFromKline(klineData, MA10_LOOKBACK);

            ma10Series.setData(ma10Data);
            setLineSeriesDrawerMA10(ma10Series);

            const ma2Options = {
                ...ma10Options,
                color: '#f89401',
            };
            const ma20Series = chart.addLineSeries(ma2Options);
            const ma20Data = calculateSMAFromKline(klineData, MA20_LOOKBACK);
            ma20Series.setData(ma20Data);
            setLineSeriesDrawerMA20(ma20Series);
        }

        // chart.timeScale().fitContent();

        // symbolName https://tradingview.github.io/lightweight-charts/tutorials/how_to/legends#:~:text=In%20order%20to%20add%20a,within%20our%20html%20legend%20element.
        const symbolName = `${symbol} - ${interval} - BINANCE-FUTURES`;
        const legend = document.createElement('div');
        legend.style = `position: absolute; left: 12px; top: 12px; z-index: 1; font-size: 12px; font-family: Helvetica`;

        const firstRow = document.createElement('div');
        firstRow.innerHTML = symbolName;
        firstRow.style = 'color: white;';

        chartRef.current.style = `position: relative;`;
        chartRef.current.appendChild(legend);
        legend.appendChild(firstRow);

        function handleCrossHairMoveForLegend(param) {
            //https://tradingview.github.io/lightweight-charts/tutorials/how_to/tooltips#getting-the-mouse-cursors-position
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartRef.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartRef.current.clientHeight
            ) {
                // if cursor moved away from chart, legend = take last candle ohlc
                let length123 = klineSeries.data().length;
                let last = klineSeries.dataByIndex(length123 - 1);

                let amplitude = Math.abs(((last.high - last.low) / last.low) * 100).toFixed(2);

                firstRow.innerHTML = ` O: ${last.open} H: ${last.high} L: ${last.low} C: ${last.close} A: ${amplitude}%`;
                return;
            }

            const data = param.seriesData.get(klineSeries);
            // const price = data.value !== undefined ? data.value : data.close;
            const o = data.open;
            const h = data.high;
            const l = data.low;
            const c = data.close;

            let amplitude = Math.abs(((h - l) / l) * 100).toFixed(2);

            firstRow.innerHTML = `O: ${o} H: ${h} L: ${l} C: ${c} A: ${amplitude}%`;
        }

        // from Tv React tutorial FIXME: not so useful as desktop app should be fixed size
        const handleResize = () => {
            chart.applyOptions({ width: chartRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

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
                console.log('in shift + click');

                let x = param.point.x;
                let y = param.point.y;
                let startCoordinatePrice = klineSeries.coordinateToPrice(y);

                const toolTipX = x - toolTipWidth;
                const toolTipY = y - toolTipHeight;

                toolTip.style.display = 'block';
                toolTip.style.left = toolTipX + 'px';
                toolTip.style.top = toolTipY + 'px';
                toolTip.innerHTML = `<div>start: ${startCoordinatePrice}, </div>`;
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
            window.removeEventListener('resize', handleResize);
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

                let wsKlineData = data.k;

                let parsedKlineData = chartUtils.mapWSKlineData(wsKlineData);

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
            klineSeriesDrawer.update(newDataFromWS);

            if (plotMA) {
                const currentKlineData = klineSeriesDrawer.data();

                let latestMA10 = calculateLatestSMA(currentKlineData, MA10_LOOKBACK);
                let latestMA20 = calculateLatestSMA(currentKlineData, MA20_LOOKBACK);

                lineSeriesDrawerMA10.update(latestMA10);
                lineSeriesDrawerMA20.update(latestMA20);
            }
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
    const intervals = ['1m', '3m', '15m', '1h', '4h', '1d'];
    const [currentSymbol, setCurrentSymbol] = useState(symbol);
    const chartContainerRef = useRef(null);

    // FIXME: quickfix passing symbol from parent App, children -> ChartContainer & OrderContainer. let ChartContainer change symbol for OrderContainer as well

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
