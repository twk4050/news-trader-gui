import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, Typography, Stack, InputAdornment, Button } from '@mui/material';

import { BuyButton, SellButton } from './styles/StyledComponent123';

import { BinanceUtils, GLOBAL_API } from './utils';

function OrderComponent({ symbol, price, filterInfo }) {
    // price: <number>
    const initialSpread = 0.2;
    const order_nvs = [100, 2200, 6700]; // order notional value, use to map BuyButton n SellButtons

    const symbol_tick_size = filterInfo.tickSize;
    const precision = BinanceUtils.getPrecisionForToFixed(symbol_tick_size); //filterInfo.pricePrecision;

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

        let newBidPrice = BinanceUtils.round_step_size(rawBidPrice, symbol_tick_size);
        let newAskPrice = BinanceUtils.round_step_size(rawAskPrice, symbol_tick_size);

        return [newBidPrice, newAskPrice];
    }
    function orderWrapper(symbol, side, nv) {
        // function dependencies: [filterInfo, price, spread, KEY n SECRET]
        const symbol_step_size = filterInfo.stepSize;
        function order(symbol, side, nv) {
            let order_price = side === 'BUY' ? bidPrice : askPrice;
            let order_quantity = BinanceUtils.round_step_size(nv / order_price, symbol_step_size);

            const params = {
                symbol: symbol,
                side: side,
                quantity: order_quantity,
                price: order_price,
            };

            console.log(side, symbol, nv, `quantity: ${order_quantity} @ ${order_price}`);
            GLOBAL_API.binance.sendOrder(params);
        }

        return order(symbol, side, nv);
    }

    return (
        <Stack spacing={2}>
            <Stack direction={'row'} spacing={2}>
                <Typography>
                    {symbol} Price: {price.toFixed(precision)}
                </Typography>
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
                        maxWidth: '90px',
                        minWidth: '90px',

                        height: '30px',
                        minHeight: '30px',
                        maxHeight: '30px',
                    }}
                    inputProps={{
                        step: '.1',
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

export default function OrderContainer({ symbol, symbolsFilterInfo }) {
    // const symbols = ['BTCUSDT', 'ETHUSDT', 'TRBUSDT', '1000FLOKIUSDT', 'TUSDT'];
    // const symbols = Object.keys(symbolsFilterInfo);
    // const [currentSymbol, setCurrentSymbol] = useState(symbols[0]);
    // const filterInfo = symbolsFilterInfo[currentSymbol];
    // function handleOnChangeSymbol(e, symbol) {
    //     setCurrentSymbol(symbol);
    // }

    const filterInfo = symbolsFilterInfo[symbol];
    const currentSymbol = symbol;

    const [allCoinPrice, setAllCoinPrice] = useState({});
    function handleAllCoinPrice(newAllCoinPriceData) {
        // console.log(newAllCoinPriceData);
        setAllCoinPrice((oldAllCoinPrice) => ({
            ...oldAllCoinPrice,
            ...newAllCoinPriceData,
        }));
    }

    // init websocket
    useEffect(() => {
        BinanceUtils.initBinancePriceStream(handleAllCoinPrice);
    }, []);

    return (
        <Stack
            spacing={0}
            sx={{
                minWidth: '350px',
                maxWidth: '350px',
                minHeight: '150px',
                maxHeight: '150px',
                padding: '12px',

                backgroundColor: '#132e3b',
            }}
        >
            {allCoinPrice[currentSymbol] ? (
                <>
                    {/* <Autocomplete
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
                    ></Autocomplete> */}

                    <OrderComponent
                        symbol={currentSymbol}
                        price={+allCoinPrice[currentSymbol]}
                        filterInfo={filterInfo}
                    />
                </>
            ) : (
                <Typography> loading ...</Typography>
            )}
        </Stack>
    );
}
