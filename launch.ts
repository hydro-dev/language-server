import * as rpc from '@codingame/monaco-jsonrpc';
import { ensureDirSync } from 'fs-extra';
import * as lsp from 'vscode-languageserver';
import * as server from '@codingame/monaco-jsonrpc/lib/server';

ensureDirSync('/tmp/clangd');

export function launch(socket: rpc.IWebSocket) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const serverConnection = server.createServerProcess('clangd', 'clangd', [
        '--pch-storage=memory',
        '--path-mappings=/=/tmp/clangd',
        '--background-index',
        '--clang-tidy',
        '--suggest-missing-includes',
        '--log=error',
        '--limit-results=20',
    ]);
    server.forward(socketConnection, serverConnection, (message) => {
        if (rpc.isRequestMessage(message)) {
            if (message.method === lsp.InitializeRequest.type.method) {
                const params = message.params as lsp.InitializeParams;
                params.processId = process.pid;
            }
        }
        return message;
    });
    return serverConnection;
}