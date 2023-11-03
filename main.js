const { win, BrowserWindow, app, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const sound = require('sound-play');
require('dotenv').config();

const OrderUtils = require('./orderUtils');

const isPackaged = app.isPackaged;
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;

if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
    throw new Error('pls input BINANCE_API_KEY and BINANCE_API_SECRET in .env file');
}

// ipcMain.on('notify', (_, msg) => new Notification({ title: 'title123', body: msg }).show());
ipcMain.on('notify', (_) => {
    let filePath;

    !isPackaged
        ? (filePath = path.join(__dirname, 'assets', 'mario.mp3'))
        : (filePath = path.join(process.resourcesPath, 'assets', 'mario.mp3'));

    let volume = 0.1;
    sound.play(filePath, volume);
});

ipcMain.on('order', (_, params) => {
    // let title = 'Order !!!';
    // let body = `${params.side} ${params.quantity} ${params.symbol} @ ${params.price}`;
    // let notification123 = new Notification({ title: title, body: body });
    // notification123.show();
    if (isPackaged) {
        OrderUtils.send_binance_limit_order(params, KEY, SECRET);
    }
});

app.whenReady().then(() => {
    createWindow();
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1500,
        height: 800,
        // backgroundColor: '#808080',
        webPreferences: {
            nodeIntegration: false,
            // javascript: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'src', 'js', 'preload.js'),
        },

        autoHideMenuBar: true, // press alt to show
        title: 'electron title from main', // 2 way to set app, here and html.head.title
        maximizable: false,
        resizable: false,
    });

    win.loadFile('index.html');

    win.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url); // Open URL in user's browser.
        return { action: 'deny' }; // Prevent the app from opening the URL.
    });
}
