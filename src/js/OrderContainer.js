import React, { useContext, useEffect, useState } from 'react';
import { Autocomplete, TextField, Typography, Stack, InputAdornment, Button } from '@mui/material';

import { BuyButton, SellButton } from './styles/StyledComponent123';

import { Binance, GLOBAL_API, commonUtils } from './utils';
import { BinanceContext, BinanceWSContext } from './providers';

function OrderComponent({ symbol, price, filterInfo }) {
    // price: <number>
    const initialSpread = 0.2;
    const order_nvs = [1500, 6000, 17000]; // order notional value, use to map BuyButton n SellButtons

    const symbol_tick_size = filterInfo.tickSize;
    const precision = commonUtils.getPrecisionForToFixed(symbol_tick_size); //filterInfo.pricePrecision;

    const [spread, setSpread] = useState(initialSpread); // typeof spread => Number, always a float
    const [bidPrice, askPrice] = calculateBidAskPrice(price, spread);

    function handleOnChangeSpread(e) {
        // FIXME: handle edge case. initially "0.3", user deletes input to ""
        if (!e.target.value) {
            // setSpread(parseFloat('0'));
            return;
        }
        setSpread(parseFloat(e.target.value));
    }

    function calculateBidAskPrice(price, spread) {
        let rawBidPrice = price * (1 - spread / 100);
        let rawAskPrice = price * (1 + spread / 100);

        let newBidPrice = commonUtils.round_step_size(rawBidPrice, symbol_tick_size);
        let newAskPrice = commonUtils.round_step_size(rawAskPrice, symbol_tick_size);

        return [newBidPrice, newAskPrice];
    }
    function orderWrapper(symbol, side, nv) {
        // function dependencies: [filterInfo, price, spread, KEY n SECRET]
        const symbol_step_size = filterInfo.stepSize;
        function order(symbol, side, nv) {
            let order_price = side === 'BUY' ? bidPrice : askPrice;
            let order_quantity = commonUtils.round_step_size(nv / order_price, symbol_step_size);

            const params = {
                symbol: symbol,
                side: side,
                quantity: order_quantity,
                price: order_price,
            };

            console.log(
                'Browser: from OrderContainer.js ',
                side,
                symbol,
                nv,
                `quantity: ${order_quantity} @ ${order_price}`
            );
            GLOBAL_API.binance.sendOrder(params);
        }

        return order(symbol, side, nv);
    }

    return (
        <Stack spacing={2}>
            <Stack direction={'row'} spacing={2}>
                <Stack direction={'column'}>
                    <Typography>{symbol}</Typography>
                    <Typography>Price: {price.toFixed(precision)}</Typography>
                </Stack>

                <TextField
                    size="small"
                    variant="outlined"
                    InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        sx: {
                            height: 'inherit',
                            minHeight: 'inherit',
                            maxHeight: 'inherit',
                        },
                    }}
                    sx={{
                        maxWidth: '120px',
                        minWidth: '120px',
                        height: '48px',
                        minHeight: '48px',
                        maxHeight: '48px',
                    }}
                    inputProps={{
                        step: '.05',
                    }}
                    type="number"
                    value={spread}
                    onChange={handleOnChangeSpread}
                />
            </Stack>

            <Stack direction={'row'} spacing={1} justifyContent={'space-evenly'}>
                <Typography sx={{ fontSize: '14px' }}>buy {bidPrice.toFixed(precision)}</Typography>
                {order_nvs.map((nv, i) => (
                    <BuyButton key={i} onClick={(e) => orderWrapper(symbol, 'BUY', nv)}>
                        {nv}
                    </BuyButton>
                ))}
            </Stack>

            <Stack direction={'row'} spacing={1} justifyContent={'space-evenly'}>
                <Typography sx={{ fontSize: '14px' }}>
                    sell {askPrice.toFixed(precision)}
                </Typography>
                {order_nvs.map((nv, i) => (
                    <SellButton key={i} onClick={(e) => orderWrapper(symbol, 'SELL', nv)}>
                        {nv}
                    </SellButton>
                ))}
            </Stack>
        </Stack>
    );
}

export default function OrderContainer({ symbol, sxProps }) {
    const [, symbolsFilterInfo] = useContext(BinanceContext);
    const [isOpen, wsSendMsg, subscribeToStreamName, unsubscribe] = useContext(BinanceWSContext);

    const [exchangeCoinPrice, setExchangeCoinPrice] = useState({});

    const filterInfo = symbolsFilterInfo[symbol];

    function handleExchangeCoinPrice(newExchangePrice) {
        // console.log(newAllCoinPriceData);
        setExchangeCoinPrice((oldExchangePrice) => ({
            ...oldExchangePrice,
            ...newExchangePrice,
        }));
    }

    // reference ChartContainer.js on handling ws connection
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const streamName = `!miniTicker@arr`;
        const randomNumber = commonUtils.generateRandomNumber();
        console.log(`sending ${streamName} to binance ws to subscribe`);

        let subTopic = Binance.generateSubscribeTopicJson(streamName, randomNumber);
        wsSendMsg(subTopic);

        // FIXME: should cb know how to parse ws json data or just pass 'handleAllCoinPrice' fn only
        const cb = (data) => {
            const newPriceData = {};
            for (let symbolData of data) {
                let symbol = symbolData.s;
                let lastPrice = symbolData.c;
                newPriceData[symbol] = lastPrice;
            }

            handleExchangeCoinPrice(newPriceData);
        };

        subscribeToStreamName(streamName, cb);

        return () => {
            console.log(`sending ${streamName} to binance ws to unsubscribe`);
            let unsubTopic = Binance.generateUnsubscribeTopicJson(streamName, randomNumber);
            wsSendMsg(unsubTopic);
            unsubscribe(streamName, cb);
        };
    }, [isOpen]);

    return (
        <Stack
            spacing={0}
            sx={{
                backgroundColor: '#132e3b',
                ...sxProps,
            }}
        >
            {exchangeCoinPrice[symbol] ? (
                <>
                    <OrderComponent
                        symbol={symbol}
                        price={+exchangeCoinPrice[symbol]}
                        filterInfo={filterInfo}
                    />
                </>
            ) : (
                <Typography> loading ...</Typography>
            )}
        </Stack>
    );
}
