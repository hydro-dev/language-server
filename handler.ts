import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { Connection, ConnectionHandler } from 'hydrooj/src/service/server';
import { launch } from './launch';

export class CppLspConnectionHandler extends ConnectionHandler {
    noAuth = true;
    server: server.IConnection;

    async prepare({ style }) {
        console.log(style);
        this.server = launch({
            send: (s) => this.conn.write(s),
            onMessage: (cb) => this.conn.on('data', (msg) => cb(msg)),
            onClose: (cb) => this.conn.on('close', (res, reason) => cb(res, reason)),
            onError: (cb) => this.conn.on('error', (err) => cb(err)),
            dispose: () => this.close(3000, 'disposed'),
        }, style);
    }

    async cleanup() {
        this.server.dispose();
    }
}

global.Hydro.handler.lsp_cpp = () => {
    Connection('lsp_cpp', '/lsp/cpp', CppLspConnectionHandler);
};
