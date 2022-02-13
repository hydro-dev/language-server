import * as rpc from '@codingame/monaco-jsonrpc';
import { ensureDirSync, removeSync, writeFileSync } from 'fs-extra';
import * as lsp from 'vscode-languageserver';
import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { join } from 'path';
import yaml from 'js-yaml';

ensureDirSync('/tmp/clangd');

export function launch(socket: rpc.IWebSocket, style?: string) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const id = Math.random().toString(36).replace(/[^a-z0-9]+/g, '');
    const tmpFolder = '/tmp/clangd/' + id;
    ensureDirSync(tmpFolder);
    if (style) {
        const Style = yaml.load(style);
        const config = { Style };
        writeFileSync(join(tmpFolder, '.clangd'), yaml.dump(config));
        writeFileSync(join(tmpFolder, '.clang-format'), style);
    }
    const serverConnection = server.createServerProcess('clangd', 'clangd', [
        '--pch-storage=memory',
        '--background-index',
        '--clang-tidy',
        '--suggest-missing-includes',
        '--log=error',
        '--header-insertion-decorators',
        '--enable-config',
        '--limit-results=20',
    ], { cwd: tmpFolder });
    serverConnection.onClose(() => removeSync(tmpFolder));
    server.forward(socketConnection, serverConnection, (message) => {
        if (rpc.isRequestMessage(message) || rpc.isNotificationMessage(message)) {
            const params = message.params as any;
            if (message.method === lsp.InitializeRequest.type.method) {
                params.processId = process.pid;
            }
            if (params.textDocument?.uri?.startsWith('hydro://')) {
                params.textDocument.uri = params.textDocument.uri.replace('hydro://', `file://${tmpFolder}/`);
            }
            if (params.uri?.startsWith('hydro://')) {
                params.uri = params.uri.replace('hydro://', `file://${tmpFolder}/`);
            } else if (params.uri?.startsWith(`file://${tmpFolder}/`)) {
                params.uri = params.uri.replace(`file://${tmpFolder}/`, 'hydro://');
            }
        } else if (rpc.isResponseMessage(message)) {
            if (message.result instanceof Array) {
                for (const re of message.result) {
                    if (re.uri?.startsWith(`file://${tmpFolder}/`)) {
                        re.uri = re.uri.replace(`file://${tmpFolder}/`, 'hydro://');
                    }
                }
            }
        }
        return message;
    });
    return serverConnection;
}