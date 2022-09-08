import * as rpc from '@codingame/monaco-jsonrpc';
import { ensureDirSync, removeSync, writeFileSync } from 'fs-extra';
import * as lsp from 'vscode-languageserver';
import * as server from '@codingame/monaco-jsonrpc/lib/server';

ensureDirSync('/tmp/javalsp');

export function launch(socket: rpc.IWebSocket) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const id = Math.random().toString(36).replace(/[^a-z0-9]+/g, '');
    const tmpFolder = '/tmp/javalsp/' + id;
    ensureDirSync(tmpFolder);
    const serverConnection = server.createServerProcess('jdtls', '/root/language-server/jdt/bin/jdtls', [
        '-configuration',
        '/root/.cache/jdtls',
        '-data',
        '/root/.cache/jdtls-data',
    ], { cwd: tmpFolder });
    serverConnection.onClose(() => removeSync(tmpFolder));
    let filename = '';
    server.forward(socketConnection, serverConnection, (message) => {
        if (rpc.isRequestMessage(message) || rpc.isNotificationMessage(message)) {
            const params = message.params as any;
            if (message.method === lsp.InitializeRequest.type.method) {
                params.processId = process.pid;
            }
            if (params.textDocument?.uri?.startsWith('hydro://')) {
                filename = params.textDocument.uri;
                params.textDocument.uri = `file://${tmpFolder}/Main.java`;
                if (params.textDocument.text) {
                    writeFileSync(tmpFolder + '/Main.java', params.textDocument.text);
                }
            }
            if (params.uri?.startsWith('hydro://')) {
                filename = params.uri;
                params.uri = `file://${tmpFolder}/Main.java`;
            } else if (params.uri?.startsWith(`file://${tmpFolder}/Main.java`)) {
                params.uri = filename
            }
        } else if (rpc.isResponseMessage(message)) {
            if (message.result instanceof Array) {
                for (const re of message.result) {
                    if (re?.uri?.startsWith(`file://${tmpFolder}/Main.java`)) {
                        re.uri = filename;
                    }
                }
            }
        }
        return message;
    });
    return serverConnection;
}