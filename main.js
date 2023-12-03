const { win, BrowserWindow, app, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const sound = require('sound-play');

const OrderUtils = require('./orderUtils');

const isPackaged = app.isPackaged;

// https://stackoverflow.com/questions/54214340/electron-builder-how-to-set-node-environmental-variables
require('dotenv').config({
    path: isPackaged
        ? path.join(process.resourcesPath, '.env')
        : path.resolve(process.cwd(), '.env'),
});

// TODO: convert to fn
const marioAlertSoundPath = !isPackaged
    ? (filePath = path.join(__dirname, 'assets', 'mario.mp3'))
    : (filePath = path.join(process.resourcesPath, 'assets', 'mario.mp3'));

const discordAlertSoundPath = !isPackaged
    ? (filePath = path.join(__dirname, 'assets', 'discord.mp3'))
    : (filePath = path.join(process.resourcesPath, 'assets', 'discord.mp3'));

const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;

if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
    throw new Error('pls input BINANCE_API_KEY and BINANCE_API_SECRET in .env file');
}

ipcMain.on('notify', (_) => {
    let volume = 0.1;
    sound.play(marioAlertSoundPath, volume);
});

ipcMain.on('order', (_, params) => {
    // let title = 'Order !!!';
    // let body = `${params.side} ${params.quantity} ${params.symbol} @ ${params.price}`;
    // let notification123 = new Notification({ title: title, body: body });
    // notification123.show();

    let volume = 0.5;
    sound.play(discordAlertSoundPath, volume);

    OrderUtils.send_binance_limit_order(params, BINANCE_API_KEY, BINANCE_API_SECRET);
});

app.whenReady().then(() => {
    createWindow();
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1500,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src', 'js', 'preload.js'),
        },

        autoHideMenuBar: true, // press alt to show
        title: 'electron title from main', // 2 way to set app, here and html.head.title
        maximizable: true,
        // resizable: false,
    });

    win.loadFile('index.html');

    win.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url); // Open URL in user's browser.
        return { action: 'deny' }; // Prevent the app from opening the URL.
    });
}
