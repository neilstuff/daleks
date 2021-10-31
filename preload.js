const {
    contextBridge,
    ipcRenderer
} = require('electron');

const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld(
    "api", {
        quit: () => {
            ipcRenderer.send('quit');
        },
        on: (message, callback) => {
            ipcRenderer.on(message, (event, path) => {
                callback()
            });
        },
        getContent: (url) => {
            /**
             * Buffer to Array Buffer
             * @param {*} buf the input buffer
             * @return an Array Buffer
             * 
             */
            function toArrayBuffer(buf) {
                var ab = new ArrayBuffer(buf.length);
                var view = new Uint8Array(ab);

                for (var i = 0; i < buf.length; ++i) {
                    view[i] = buf[i];
                }

                return ab;

            }

            let parsedUrl = new URL(url);
            let pathname = path.normalize(path.toNamespacedPath(parsedUrl.pathname).startsWith("\\\\?\\") ?
                parsedUrl.pathname.replace(/^\/*/, '') :
                parsedUrl.pathname);

            return toArrayBuffer(fs.readFileSync(pathname));

        },
        log: (message) => {
            console.log(message);
        }
    }

);