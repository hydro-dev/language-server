import http from 'http';
import * as sockjs from 'sockjs';
import { launch as launchCpp } from './providers/cpp';
import { launch as launchJava } from './providers/java';
import { launch as launchPython } from './providers/python';

const limit = {
    java: 5,
    python: 10,
    cpp: 9999,
};

const count = {
    java: 0,
    cpp: 0,
    python: 0,
};

const handler = (launch, type) => function (conn) {
    let lastEvent = Date.now();
    let interval;
    if (count[type] >= limit) {
        setTimeout(() => conn.close(), 30000);
        return;
    }
    count[type]++;
    try {
        console.log('Launching ', launch, conn.url);
        let args = {};
        if (conn.url.includes('?style=')) {
            args = { style: decodeURIComponent(conn.url.split('?style=')[1]) };
        } else {
            args = JSON.parse(decodeURIComponent(conn.url.split('?')[1] || '') || '{}') || {};
        }
        const server = launch({
            send: (s) => conn.write(s),
            onMessage: (cb) => conn.on('data', (msg) => {
                lastEvent = Date.now();
                if (msg?.trim() === 'pong') return;
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
        const gc = () => {
            if (interval) clearInterval(interval);
            interval = null;
            conn.close();
            server.dispose();
            count[type]--;
        };
        interval = setInterval(() => {
            if (Date.now() - lastEvent > 60000) gc();
        }, 30000);
        conn.on('close', gc);
    } catch (e) {
        console.error(e);
    }
};

const server = http.createServer();

const cpp = sockjs.createServer({ prefix: '/lsp/cpp' });
cpp.on('connection', handler(launchCpp, 'cpp'));
cpp.installHandlers(server);

const python = sockjs.createServer({ prefix: '/lsp/python' });
python.on('connection', handler(launchPython, 'python'));
python.installHandlers(server);

const java = sockjs.createServer({ prefix: '/lsp/java' });
java.on('connection', handler(launchJava, 'java'));
java.installHandlers(server);

server.listen(+process.argv[1] || +process.argv[2] || 9999, '0.0.0.0', () => {
    console.log(`Server listening at ${(server.address() as any).port}`);
});
