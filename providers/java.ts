import path from 'path';
import * as rpc from '@codingame/monaco-jsonrpc';
import * as server from '@codingame/monaco-jsonrpc/lib/server';
import { fs } from '@hydrooj/utils';
import * as lsp from 'vscode-languageserver';

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
        '-Dsyntaxserver=true',
        `-Dosgi.sharedConfiguration.area=${basedir}/jdt/config_linux`,
        '-Dosgi.sharedConfiguration.area.readOnly=true',
        '-Dosgi.configuration.cascaded=true',
        '-noverify',
        '-Xms512M',
        '--add-modules=ALL-SYSTEM',
        '--add-opens',
        'java.base/java.util=ALL-UNNAMED',
        '--add-opens',
        'java.base/java.lang=ALL-UNNAMED',
        '-jar',
        `${basedir}/jdt/plugins/${files.find((i) => i.includes('equinox.launcher_') && i.endsWith('.jar'))}`,
        '-configuration',
        '/root/.cache/jdtls',
        '-data',
        '/root/.cache/jdtls-data',
    ], { cwd: tmpFolder });
    let filename = '';
    let lastEvent = Date.now();
    const interval = setInterval(() => {
        if (Date.now() - lastEvent > 60000) serverConnection.dispose();
    }, 30000);
    serverConnection.onClose(() => {
        fs.removeSync(tmpFolder);
        clearInterval(interval);
    });
    server.forward(socketConnection, serverConnection, (message) => {
        lastEvent = Date.now();
        if (rpc.isRequestMessage(message) || rpc.isNotificationMessage(message)) {
            const params = message.params as any;
            if (params && message.method === lsp.InitializeRequest.type.method) {
                params.processId = process.pid;
            }
            if (params?.textDocument?.uri?.startsWith('hydro://')) {
                filename = params.textDocument.uri;
                params.textDocument.uri = `file://${tmpFolder}/Main.java`;
                if (params.textDocument.text) {
                    fs.writeFileSync(`${tmpFolder}/Main.java`, params.textDocument.text);
                }
            }
            if (params?.uri?.startsWith('hydro://')) {
                filename = params.uri;
                params.uri = `file://${tmpFolder}/Main.java`;
            } else if (params?.uri?.startsWith(`file://${tmpFolder}/Main.java`)) {
                params.uri = filename;
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
