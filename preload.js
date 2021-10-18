const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
    "api", {
        quit: () => {
            ipcRenderer.send('quit');
        },
        on: (message, callback) => {
            ipcRenderer.on(message, (event, path) => {
                console.log("received message");
                callback()
            });
        },
        log: (message) => {
            console.log(message);
        }
    }

);