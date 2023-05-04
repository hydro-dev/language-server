import { join } from 'path';
import * as rpc from '@codingame/monaco-jsonrpc';
import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { fs } from '@hydrooj/utils';
import { getPipeline } from '../pipeline';

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
        '-j=1',
        '--clang-tidy',
        '--log=error',
        '--header-insertion-decorators',
        '--limit-results=20',
    ], { cwd: tmpFolder });
    serverConnection.onClose(() => {
        fs.removeSync(tmpFolder);
    });
    server.forward(socketConnection, serverConnection, getPipeline(tmpFolder));
    return serverConnection;
}
