import React, { useContext, useEffect, useState, useRef } from 'react';

import { Container } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material';
import { Masonry } from '@mui/lab';

import ChartContainer from './ChartContainer';
import NewsContainer from './NewsContainer';
import OrderContainer from './OrderContainer';
import { BinanceUtils } from './utils';

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
    const [symbolsFilterInfo, setSymbolsFilterInfo] = useState(null);
    // const hotCoins = ['UNFIUSDT', 'TRBUSDT'];

    // const symbols = Object.keys(symbolsFilterInfo); // return array of obj keys
    // const [currentSymbol, setCurrentSymbol] = useState(symbol);
    // setCurrentSymbol(newSymbol);

    // 4 chart, 1 btc, 1 eth, 1 hotcoin 1h, 1 hotcoin 15min
    const hotCoins = ['SOLUSDT', 'BLZUSDT', 'GASUSDT'];
    const [orderSymbol, setOrderSymbol] = useState('BTCUSDT');

    useEffect(() => {
        // use Object.keys() to get array of all keys
        BinanceUtils.get_symbols_filter_info(setSymbolsFilterInfo);
        console.log('in app useeffect');
    }, []);

    const sxPropsChart = {
        minWidth: '440px',
        minHeight: '370px',
        maxHeight: '370px',
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
                }}

                // sx={{ backgroundColor: 'black', width: '100%', height: '1000px' }} // 1500 x 700
            >
                {symbolsFilterInfo ? (
                    <Masonry columns={3} spacing={1}>
                        <ChartContainer
                            sxProps={sxPropsChart}
                            symbolsFilterInfo={symbolsFilterInfo}
                            setOrderSymbol={setOrderSymbol}
                            // default btc interval 1h
                        />
                        <ChartContainer
                            sxProps={sxPropsChart}
                            symbolsFilterInfo={symbolsFilterInfo}
                            setOrderSymbol={setOrderSymbol}
                            symbol={hotCoins[0]}
                            interval="1h"
                        />
                        <NewsContainer />
                        {/* bottom Chart3 Chart4 and Order should have same symbol */}
                        <ChartContainer
                            sxProps={sxPropsChart}
                            symbolsFilterInfo={symbolsFilterInfo}
                            setOrderSymbol={setOrderSymbol}
                            symbol={hotCoins[1]}
                            interval="1h"
                        />
                        <ChartContainer
                            sxProps={sxPropsChart}
                            symbolsFilterInfo={symbolsFilterInfo}
                            setOrderSymbol={setOrderSymbol}
                            symbol={hotCoins[2]}
                            interval="15m"
                        />
                        <OrderContainer
                            symbol={orderSymbol}
                            symbolsFilterInfo={symbolsFilterInfo}
                        />
                    </Masonry>
                ) : (
                    <div>hello world</div>
                )}
            </Container>
        </ThemeProvider>
    );
}
