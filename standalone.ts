import http from 'http';
import * as sockjs from 'sockjs';
import { launch as launchCpp } from './providers/cpp';
import { launch as launchJava } from './providers/java';
import { launch as launchPython } from './providers/python';

const handler = (launch) => function (conn) {
    try {
        console.log('Launching ', launch);
        let args = {};
        if (conn.url.includes('?style=')) {
            args = { style: decodeURIComponent(conn.url.split('?style=')[1]) };
        } else {
            args = JSON.parse(decodeURIComponent(conn.url.split('?')[1] || '') || '{}') || {};
        }
        const server = launch({
            send: (s) => conn.write(s),
            onMessage: (cb) => conn.on('data', (msg) => {
                if (msg?.trim() === 'ping') conn.write('pong');
                else {
                    try {
                        JSON.parse(msg);
                        cb(msg);
                    } catch (e) { }
                }
            }),
            onClose: (cb) => conn.on('close', (res, reason) => cb(res, reason)),
            onError: (cb) => conn.on('error', (err) => cb(err)),
            dispose: () => conn.close('3000', 'disposed'),
        }, args);
        conn.on('close', () => server.dispose());
    } catch (e) {
        console.error(e);
    }
};

const server = http.createServer();

const cpp = sockjs.createServer({ prefix: '/lsp/cpp' });
cpp.on('connection', handler(launchCpp));
cpp.installHandlers(server);

const python = sockjs.createServer({ prefix: '/lsp/python' });
python.on('connection', handler(launchPython));
python.installHandlers(server);

const java = sockjs.createServer({ prefix: '/lsp/java' });
java.on('connection', handler(launchJava));
java.installHandlers(server);

server.listen(+process.argv[1] || +process.argv[2] || 9999, '0.0.0.0', () => {
    console.log(`Server listening at ${(server.address() as any).port}`);
});
