import path from 'path';
import * as rpc from '@codingame/monaco-jsonrpc';
import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { fs } from '@hydrooj/utils';
import { getPipeline } from '../pipeline';

fs.ensureDirSync('/tmp/javalsp');

const basedir = path.resolve(__dirname, '..');

export function launch(socket: rpc.IWebSocket) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const id = Math.random().toString(36).replace(/[^a-z0-9]+/g, '');
    const tmpFolder = `/tmp/javalsp/${id}`;
    fs.ensureDirSync(tmpFolder);
    const files = fs.readdirSync(`${basedir}/jdt/plugins`);
    const serverConnection = server.createServerProcess('jdtls', 'java', [
        '-Declipse.application=org.eclipse.jdt.ls.core.id1',
        '-Dosgi.bundles.defaultStartLevel=4',
        '-Declipse.product=org.eclipse.jdt.ls.core.product',
        '-Dosgi.checkConfiguration=true',
        `-Dosgi.sharedConfiguration.area=${basedir}/jdt/config_linux`,
        '-Dosgi.sharedConfiguration.area.readOnly=true',
        '-Dosgi.configuration.cascaded=true',
        '-Dsyntaxserver=true',
        '-Xms1G',
        '--add-modules=ALL-SYSTEM',
        '--add-opens', 'java.base/java.util=ALL-UNNAMED',
        '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
        '-jar', `${basedir}/jdt/plugins/${files.find((i) => i.includes('equinox.launcher_') && i.endsWith('.jar'))}`,
        '-configuration', `${basedir}/jdt/config_linux`,
        '-data', tmpFolder,
    ], { cwd: tmpFolder });
    serverConnection.onClose(() => {
        fs.removeSync(tmpFolder);
    });
    server.forward(socketConnection, serverConnection, getPipeline(tmpFolder));
    return serverConnection;
}
