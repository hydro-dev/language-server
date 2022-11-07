import * as sockjs from 'sockjs';
import http from 'http';
import { launch as launchCpp } from './providers/cpp';
import { launch as launchPython } from './providers/python';
import { launch as launchJava } from './providers/java';

const handler = (launch) => function (conn) {
    console.log('Launching ', launch);
    const qs = decodeURIComponent(conn.url.split('?')[1] || '');
    const args = (qs && qs[0] !== '{') ? { style: qs } : JSON.parse(qs || '{}') || {};
    const server = launch({
        send: (s) => conn.write(s),
        onMessage: (cb) => conn.on('data', (msg) => cb(msg)),
        onClose: (cb) => conn.on('close', (res, reason) => cb(res, reason)),
        onError: (cb) => conn.on('error', (err) => cb(err)),
        dispose: () => conn.close('3000', 'disposed'),
    }, args);
    conn.on('close', () => server.dispose());
}

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
    console.log('Server listening at ' + (server.address() as any).port);
});
