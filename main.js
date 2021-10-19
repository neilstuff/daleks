'use strict';

const config = require('./config.json');

const { app, protocol, ipcMain, BrowserWindow } = require('electron');

const path = require('path')
const url = require('url')

var mainWindow = null;


function createWindow() {

    mainWindow = new BrowserWindow({
        width: 512,
        height: 358,
        resizable: true,
        minWidth: 512,
        minHeight: 360,
        maxWidth: 512,
        maxHeight: 360,
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            nativeWindowOpen: true,
            preload: path.join(__dirname, "preload.js")
        }

    });

    if (config.mode == "debug") {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.setMenu(null);
    mainWindow.loadURL(`file:///${path.join(__dirname, 'index.html')}`);

    mainWindow.on('closed', () => {
        mainWindow = null
    })



}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    app.quit()
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
});

ipcMain.on('quit', function(event, arg) {

    app.quit();

});
