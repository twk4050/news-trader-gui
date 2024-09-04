const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('API123', {
    notify: {
        playSound() {
            // ipcRenderer.send(eventName)
            ipcRenderer.send('notify');
        },
    },

    binance: {
        sendOrder(params) {
            // params from browser {symbol, side, quantity, price}
            ipcRenderer.send('order', params);
        },
    },
    appData: {
        // v3 added MA50 blue line
        // v4 auto updates ohlc vol legend without hovering over to chart
        // v4.1 try catch for formatVolLegend, volbar no value ?
        // v4.2 add new histogram for oi
        // v5 finish up oi histogram
        // v5.1 change hotcoins
        // v6 change websocket connections. 1 ws connection to handle multi charts data. * React.useContext .createContext
        // v6.1 change wsPriceStream to same connection as kline ws
        // v6.2 code refactor. created BinanceContext / BinanceProvider to provide symbols , symbolsFilterInfo
        // v7.0 integrated bybit chart. working on bybit orders next
        // v7.1 bybit heartbeat message, to keep ws connection alive
        // v7.2 add markers to kline if kline bounce ma20
        // v7.3 binance added usdc perp, remove usdc perp from list
        version: 'v7.3',
    },
});
