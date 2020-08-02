import 'hydrooj';
import * as rpc from 'vscode-ws-jsonrpc';
import * as server from 'vscode-ws-jsonrpc/lib/server';
import * as lsp from 'vscode-languageserver';

const { Connection, ConnectionHandler } = global.Hydro.service.server;

export function launch(socket: rpc.IWebSocket) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    // start the language server as an external process
    const extCppServer = '/usr/bin/clangd';
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const serverConnection = server.createServerProcess('Cpp', extCppServer);
    server.forward(socketConnection, serverConnection, (message) => {
        if (rpc.isRequestMessage(message)) {
            if (message.method === lsp.InitializeRequest.type.method) {
                const initializeParams = message.params as lsp.InitializeParams;
                initializeParams.processId = process.pid;
            }
        }
        return message;
    });
}

class LanguageHandler extends ConnectionHandler {
    // eslint-disable-next-line class-methods-use-this
    async prepare() {
        const socket: rpc.IWebSocket = {
            send: (content) => this.conn.write(content),
            onMessage: (cb) => this.conn.on('data', cb),
            onError: (cb) => this.conn.on('error', cb),
            onClose: (cb) => this.conn.on('close', () => cb(1000, '')),
            dispose: () => this.conn.close(1000, 'closed'),
        };
        launch(socket);
    }
}

export function apply() {
    Connection('languageserver_cpp', '/languageServer/cpp', LanguageHandler);
}

global.Hydro.handler.language_javascript = apply;
