import * as rpc from '@codingame/monaco-jsonrpc';
import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { fs } from '@hydrooj/utils';
import * as lsp from 'vscode-languageserver';

fs.ensureDirSync('/tmp/pylsp');

export function launch(socket: rpc.IWebSocket) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const id = Math.random().toString(36).replace(/[^a-z0-9]+/g, '');
    const tmpFolder = `/tmp/pylsp/${id}`;
    fs.ensureDirSync(tmpFolder);
    const serverConnection = server.createServerProcess('pylsp', 'pylsp', [
        '--log-file=/dev/null',
    ], { cwd: tmpFolder });
    serverConnection.onClose(() => fs.removeSync(tmpFolder));
    server.forward(socketConnection, serverConnection, (message) => {
        if (rpc.isRequestMessage(message) || rpc.isNotificationMessage(message)) {
            const params = message.params as any;
            if (!params) return message;
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
