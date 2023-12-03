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
        version: 'v4.2',
    },
});
