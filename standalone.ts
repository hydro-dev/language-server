import * as sockjs from 'sockjs';
import http from 'http';
import { launch as launchCpp } from './providers/cpp';
import { launch as launchPython } from './providers/python';

const handler = (launch) => function (conn) {
    const style = decodeURIComponent(conn.url.split('?style=')[1] || '');
    const server = launch({
        send: (s) => conn.write(s),
        onMessage: (cb) => conn.on('data', (msg) => cb(msg)),
        onClose: (cb) => conn.on('close', (res, reason) => cb(res, reason)),
        onError: (cb) => conn.on('error', (err) => cb(err)),
        dispose: () => conn.close('3000', 'disposed'),
    }, style);
    conn.on('close', () => server.dispose());
}

const server = http.createServer();

const cpp = sockjs.createServer({ prefix: '/lsp/cpp' });
cpp.on('connection', handler(launchCpp));
cpp.installHandlers(server);

const python = sockjs.createServer({ prefix: '/lsp/python' });
python.on('connection', handler(launchPython));
python.installHandlers(server);

server.listen(+process.argv[1] || +process.argv[2] || 9999, '0.0.0.0', () => {
    console.log('Server listening at ' + (server.address() as any).port);
});
