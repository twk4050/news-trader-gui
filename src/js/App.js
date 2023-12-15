import React, { useContext, useEffect, useState } from 'react';

import { Container } from '@mui/material';
import { createTheme, ThemeProvider, Grid, Stack } from '@mui/material';
import { Masonry } from '@mui/lab';

import ChartContainer from './ChartContainer';
import NewsContainer from './NewsContainer';
import OrderContainer from './OrderContainer';
import { BinanceUtils, BybitUtils } from './utils';

import { BinanceContext, BinanceWSContext } from './providers';

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
    const [symbols, symbolsFilterInfo, kline_intervals] = useContext(BinanceContext);
    const [isOpen, send, sub, unsub] = useContext(BinanceWSContext);

    const [orderSymbol, setOrderSymbol] = useState('BTCUSDT');

    const hotCoins = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'INJUSDT'];

    useEffect(() => {
        BinanceUtils.get_symbols_filter_info(console.log);
        BybitUtils.bybit_get_instruments_info(console.log);
    }, []);

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
                            <Grid item md={6}>
                                <ChartContainer
                                    setOrderSymbol={setOrderSymbol}
                                    sxProps={sxPropsChartContainer}
                                    symbol={hotCoins[0]}
                                    interval={'1d'}
                                />
                            </Grid>
                            <Grid item md={6}>
                                <ChartContainer
                                    setOrderSymbol={setOrderSymbol}
                                    sxProps={sxPropsChartContainer}
                                    symbol={hotCoins[1]}
                                    interval={'1h'}
                                />
                            </Grid>
                            <Grid item md={6}>
                                <ChartContainer
                                    setOrderSymbol={setOrderSymbol}
                                    sxProps={sxPropsChartContainer}
                                    symbol={hotCoins[2]}
                                    interval={'1h'}
                                />
                            </Grid>
                            <Grid item md={6}>
                                <ChartContainer
                                    setOrderSymbol={setOrderSymbol}
                                    sxProps={sxPropsChartContainer}
                                    symbol={hotCoins[3]}
                                    interval={'1h'}
                                />
                            </Grid>
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
