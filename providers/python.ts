import * as rpc from '@codingame/monaco-jsonrpc';
import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { fs } from '@hydrooj/utils';
import { getPipeline } from '../pipeline';

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
    serverConnection.onClose(() => {
        fs.removeSync(tmpFolder);
    });
    server.forward(socketConnection, serverConnection, getPipeline(tmpFolder));
    return serverConnection;
}
