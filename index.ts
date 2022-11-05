import { Context, UiContextBase, SystemModel } from 'hydrooj';

declare module 'hydrooj' {
    interface UiContextBase {
        lspHost?: string;
    }
}

export const name = 'lsp-client';

export function apply(ctx: Context) {
    Object.defineProperty(UiContextBase, 'lspHost', {
        configurable: true,
        enumerable: true,
        get() {
            return SystemModel.get('language-server.host') || 'hydro.ac';
        },
    });
    ctx.on('dispose', () => {
        Object.defineProperty(UiContextBase, 'lspHost', {
            enumerable: false,
        });
    });
}
