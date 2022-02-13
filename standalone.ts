import * as sockjs from 'sockjs';
import http from 'http';
import { launch } from './launch';

const echo = sockjs.createServer({ prefix: '/lsp/cpp' });
echo.on('connection', function (conn) {
    const style = decodeURIComponent(conn.url.split('?style=')[1] || '');
    const server = launch({
        send: (s) => conn.write(s),
        onMessage: (cb) => conn.on('data', (msg) => cb(msg)),
        onClose: (cb) => conn.on('close', (res, reason) => cb(res, reason)),
        onError: (cb) => conn.on('error', (err) => cb(err)),
        dispose: () => conn.close('3000', 'disposed'),
    }, style);
    conn.on('close', () => server.dispose());
});

const server = http.createServer();
echo.installHandlers(server);
server.listen(+process.argv[1] || +process.argv[2] || 9999, '0.0.0.0', () => {
    console.log('Server listening at ' + (server.address() as any).port);
});
