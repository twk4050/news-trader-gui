import React, { useContext, useEffect, useState } from 'react';

import { Container } from '@mui/material';
import { createTheme, ThemeProvider, Grid, Stack } from '@mui/material';
import { Masonry } from '@mui/lab';

import ChartContainer from './ChartContainer';
import NewsContainer from './NewsContainer';
import OrderContainer from './OrderContainer';
import { Binance, Bybit, commonUtils } from './utils';

import { BinanceContext, BinanceWSContext, BybitWSContext } from './providers';

const theme = createTheme({
    palette: {
        mode: 'dark',
    },

    components: {
        MuiTypography: {
            defaultProps: {
                color: 'white',
            },
        },
    },
    typography: {
        fontFamily: 'Helvetica',
    },
});

export default function App() {
    const [symbols, symbolsFilterInfo] = useContext(BinanceContext);
    // const [isOpen, send, sub, unsub] = useContext(BinanceWSContext);
    // const [isOpen1, send1, sub1, unsub1] = useContext(BybitWSContext);

    const [orderSymbol, setOrderSymbol] = useState('BTCUSDT');

    const hotCoins = [
        {
            exchange: 'binance',
            coin: 'BTCUSDT',
            interval: '1d',
        },
        {
            exchange: 'binance',
            coin: 'ETHUSDT',
            interval: '1d',
        },
        {
            exchange: 'binance',
            coin: 'SOLUSDT',
            interval: '1d',
        },
        {
            exchange: 'binance',
            coin: 'MATICUSDT',
            interval: '1h',
        },
    ];

    // width = 2 chart 536 x2 + news 320 ~ 1400px
    const sxPropsChartContainer = {};

    const sxPropsNewsContainer = {
        minWidth: '320px',
        maxWidth: '320px',
        maxHeight: '550px',
    };

    const sxPropsOrderContainer = {
        minWidth: '320px',
        maxWidth: '320px',
        minHeight: '150px',
        maxHeight: '150px',
        padding: '12px',
    };

    return (
        <ThemeProvider theme={theme}>
            <Container
                maxWidth={false}
                disableGutters
                sx={{
                    backgroundColor: 'black',
                    width: '100%',
                    height: '100vh',
                    padding: '8px 0px 0px 8px',
                    display: 'flex',
                }}
            >
                {/* FIXME: symbolsFilterInfo && isOpen ? or let Components that require ws use wsContext to check isOpen */}
                {symbolsFilterInfo ? (
                    <>
                        <Grid
                            container
                            spacing={0.8}
                            sx={{ minWidth: '1100px', maxWidth: '1100px' }}
                        >
                            {hotCoins.map((coin, i) => (
                                <Grid item md={6} key={i}>
                                    <ChartContainer
                                        exchangeProp={coin['exchange']}
                                        symbol={coin['coin']}
                                        setOrderSymbol={setOrderSymbol}
                                        sxProps={sxPropsChartContainer}
                                        interval={coin['interval']}
                                    />
                                </Grid>
                            ))}
                            {/* <Grid item md={6}>
                                <ChartContainer
                                    exchange={'binance'}
                                    symbol={'BTCUSDT'}
                                    setOrderSymbol={setOrderSymbol}
                                    sxProps={sxPropsChartContainer}
                                    interval={'1d'}
                                />
                            </Grid> */}
                        </Grid>
                        <Stack spacing={1} direction={'column'} sx={{ padding: '4px 4px 4px 8px' }}>
                            <NewsContainer sxProps={sxPropsNewsContainer} />
                            <OrderContainer symbol={orderSymbol} sxProps={sxPropsOrderContainer} />
                        </Stack>
                    </>
                ) : (
                    <>
                        <div style={{ color: 'yellow' }}>
                            no symbolsFilterInfo or ws connection not open
                        </div>
                    </>
                )}
            </Container>
        </ThemeProvider>
    );
}
