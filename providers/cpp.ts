import { join } from 'path';
import * as rpc from '@codingame/monaco-jsonrpc';
import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { fs } from '@hydrooj/utils';
import * as lsp from 'vscode-languageserver';

fs.ensureDirSync('/tmp/clangd');

export function launch(socket: rpc.IWebSocket, { style }) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const id = Math.random().toString(36).replace(/[^a-z0-9]+/g, '');
    const tmpFolder = `/tmp/clangd/${id}`;
    fs.ensureDirSync(tmpFolder);
    if (style) fs.writeFileSync(join(tmpFolder, '.clang-format'), style.replace(/\r/g, ''));
    const serverConnection = server.createServerProcess('clangd', 'clangd', [
        '--pch-storage=memory',
        '--recovery-ast',
        '--clang-tidy',
        '--suggest-missing-includes',
        '--log=error',
        '--header-insertion-decorators',
        '--limit-results=20',
    ], { cwd: tmpFolder });
    const folders: string[] = [];
    serverConnection.onClose(() => {
        fs.removeSync(tmpFolder);
    });
    server.forward(socketConnection, serverConnection, (message) => {
        const pendingFolder = new Set<string>();
        if (rpc.isRequestMessage(message) || rpc.isNotificationMessage(message)) {
            const params = message.params as any;
            if (message.method === lsp.InitializeRequest.type.method) {
                params.processId = process.pid;
            }
            if (!params) return message;
            if (params.textDocument?.uri?.startsWith('hydro://')) {
                pendingFolder.add(params.textDocument.uri.split('://')[1]);
                params.textDocument.uri = params.textDocument.uri.replace('hydro://', `file://${tmpFolder}/`);
            }
            if (params.uri?.startsWith('hydro://')) {
                pendingFolder.add(params.uri.split('://')[1]);
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
            } else if (typeof message.result === 'object' && message.result !== null) {
                const result = message.result as any;
                if (typeof result.changes === 'object') {
                    result.changes = Object.fromEntries(
                        Object.entries(result.changes)
                            .map(([k, v]) => [k.replace(`file://${tmpFolder}/`, 'hydro://'), v]),
                    );
                }
            }
        }
        for (const f of pendingFolder) {
            if (!folders.includes(f) && !f.includes('..')) {
                fs.ensureDirSync(join(tmpFolder, f));
            }
        }
        return message;
    });
    return serverConnection;
}
