import http from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { launch as launchCpp } from './providers/cpp';
import { launch as launchJava } from './providers/java';
import { launch as launchPython } from './providers/python';

process.on('unhandledRejection', (e) => console.error(e));
process.on('uncaughtException', (e) => console.error(e));

const limit = {
    java: 10,
    python: 30,
    cpp: 150,
};

const count = {
    java: 0,
    cpp: 0,
    python: 0,
};

const handler = (launch, type) => function (conn: WebSocket, req: http.IncomingMessage) {
    let lastEvent = Date.now();
    let interval;
    if (count[type] >= limit[type]) {
        setTimeout(() => conn.close(), 30000);
        return;
    }
    count[type]++;
    console.log(count);
    try {
        console.log('Launching ', launch, req.url);
        let args = {};
        if (req.url.includes('?style=')) {
            args = { style: decodeURIComponent(req.url.split('?style=')[1]) };
        } else {
            args = JSON.parse(decodeURIComponent(req.url.split('?')[1] || '') || '{}') || {};
        }
        let gced = false;
        const server = launch({
            send: (s) => conn.send(s),
            onMessage: (cb) => conn.on('message', (data) => {
                lastEvent = Date.now();
                const msg = data.toString();
                if (msg?.trim() === 'pong') return;
                if (msg?.trim() === 'ping') conn.send('pong');
                else {
                    try {
                        JSON.parse(msg);
                        cb(msg);
                    } catch (e) { }
                }
            }),
            onClose: (cb) => conn.on('close', cb),
            onError: (cb) => conn.on('error', cb),
            dispose: () => conn.close(3000, 'disposed'),
        }, args);
        const gc = () => {
            if (interval) clearInterval(interval);
            interval = null;
            conn.close();
            server.dispose();
            if (!gced) count[type]--;
            console.log(count);
            gced = true;
        };
        interval = setInterval(() => {
            if (Date.now() - lastEvent > 60000) gc();
        }, 30000);
        conn.on('close', gc);
    } catch (e) {
        console.error(e);
    }
};

const routes = {
    '/lsp/cpp': handler(launchCpp, 'cpp'),
    '/lsp/python': handler(launchPython, 'python'),
    '/lsp/java': handler(launchJava, 'java'),
};

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('ok');
});
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    for (const [prefix, h] of Object.entries(routes)) {
        if (pathname === `${prefix}/websocket` || pathname.startsWith(`${prefix}/`)) {
            wss.handleUpgrade(req, socket, head, (ws) => h(ws, req));
            return;
        }
    }
    socket.destroy();
});
server.listen(+process.argv[1] || +process.argv[2] || 9999, '0.0.0.0', () => {
    console.log(`Server listening at ${(server.address() as any).port}`);
});
