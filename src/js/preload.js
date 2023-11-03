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
});
