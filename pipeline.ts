import { dirname, join } from 'path';
import * as rpc from '@codingame/monaco-jsonrpc';
import { fs } from '@hydrooj/utils';
import * as lsp from 'vscode-languageserver';

export function getPipeline(tmpFolder: string, folders = []) {
    let slashStyle = false;
    const pendingFolder = new Set<string>();
    let forceUri = '';

    function removeHydroPrefix(uri: string, replacement = '') {
        if (uri.startsWith('hydro://')) {
            slashStyle = true;
            return uri.replace('hydro://', replacement);
        }
        if (uri.startsWith('hydro:')) return uri.replace('hydro:', replacement);
        return uri;
    }

    return function pipeline(message: rpc.Message) {
        if (rpc.isRequestMessage(message) || rpc.isNotificationMessage(message)) {
            const params = message.params as any;
            if (!params) return message;
            if (message.method === lsp.InitializeRequest.type.method) {
                params.processId = process.pid;
            }
            if (params.textDocument?.uri?.endsWith('.java') && params.textDocument.text) {
                forceUri = params.textDocument.uri;
                fs.writeFileSync(`${tmpFolder}/Main.java`, params.textDocument.text);
                params.textDocument.uri = `file://${tmpFolder}/Main.java`;
            } else if (params.textDocument?.uri?.startsWith('hydro:')) {
                pendingFolder.add(removeHydroPrefix(params.textDocument.uri));
                params.textDocument.uri = removeHydroPrefix(params.textDocument.uri, `file://${tmpFolder}/`);
            }
            if (params.uri?.endsWith('.java')) {
                params.uri = `file://${tmpFolder}/Main.java`;
            } else if (params.uri?.startsWith('hydro:')) {
                pendingFolder.add(removeHydroPrefix(params.uri));
                params.uri = removeHydroPrefix(params.uri, `file://${tmpFolder}/`);
            } else if (params.uri?.startsWith(`file://${tmpFolder}/`)) {
                params.uri = forceUri || params.uri.replace(`file://${tmpFolder}/`, slashStyle ? 'hydro://' : 'hydro:');
            }
        } else if (rpc.isResponseMessage(message)) {
            if (message.result instanceof Array) {
                for (const re of message.result) {
                    if (re.uri?.startsWith(`file://${tmpFolder}/`)) {
                        re.uri = forceUri || re.uri.replace(`file://${tmpFolder}/`, slashStyle ? 'hydro://' : 'hydro:');
                    }
                }
            } else if (typeof message.result === 'object' && message.result !== null) {
                const result = message.result as any;
                if (typeof result.changes === 'object') {
                    result.changes = Object.fromEntries(
                        Object.entries(result.changes)
                            .map(([k, v]) => [k.replace(`file://${tmpFolder}/`, slashStyle ? 'hydro://' : 'hydro:'), v]),
                    );
                }
            }
        }
        for (const f of pendingFolder) {
            if (!folders.includes(f) && !f.includes('..')) {
                fs.ensureDirSync(dirname(join(tmpFolder, f)));
            }
        }
        return message;
    };
}
