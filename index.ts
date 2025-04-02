import alias from 'esbuild-plugin-alias';
import {} from '@hydrooj/ui-default';
import { SystemModel, UiContextBase } from 'hydrooj';

declare module 'hydrooj' {
    interface UiContextBase {
        lspHost?: string;
    }
}

export const name = 'lsp-client';

export function apply() {
    Hydro.ui.esbuildPlugins ||= [];
    Hydro.ui.esbuildPlugins.push(
        alias({
            vscode: require.resolve('@codingame/monaco-languageclient/lib/vscode-compatibility'),
        }),
    );
    Object.defineProperty(UiContextBase, 'lspHost', {
        configurable: true,
        enumerable: true,
        get() {
            return SystemModel.get('language-server.host') || 'wss://hydro.ac';
        },
    });
    return () => {
        Object.defineProperty(UiContextBase, 'lspHost', {
            enumerable: false,
        });
    };
}
