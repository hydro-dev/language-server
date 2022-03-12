import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { Connection, ConnectionHandler } from 'hydrooj/src/service/server';
import { launch as launchCpp } from './providers/cpp';
import { launch as launchPython } from './providers/python';

const providers = {
    cpp: launchCpp,
    python: launchPython,
}

const getHandler = (type: string) => class LspConnectionHandler extends ConnectionHandler {
    noAuth = true;
    server: server.IConnection;

    async prepare({ style }) {
        this.server = providers[type]({
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

global.Hydro.handler.lsp = () => {
    Connection('lsp', '/lsp/cpp', getHandler('cpp'));
    Connection('lsp', '/lsp/python', getHandler('python'));
};
