import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.scss';
import { BinanceProvider, BinanceWebSocketProvider, BybitWebSocketProvider } from './providers';

// react v17
// ReactDOM.render(<App />, document.getElementById('root'));

// react v18
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
    <>
        <BinanceProvider>
            <BinanceWebSocketProvider>
                <BybitWebSocketProvider>
                    <App />
                </BybitWebSocketProvider>
            </BinanceWebSocketProvider>
        </BinanceProvider>
    </>
);
