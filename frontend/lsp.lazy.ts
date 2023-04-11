import { listen } from '@codingame/monaco-jsonrpc';
import {
    CloseAction, createConnection, ErrorAction,
    MonacoLanguageClient, MonacoServices,
} from '@codingame/monaco-languageclient';
import { Socket } from '@hydrooj/ui-default';
import type { editor } from 'monaco-editor';

const endpoint = (window as any).UiContext.lspHost
    || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
if (endpoint === 'wss://hydro.ac') console.log('Using language server provided by https://hydro.ac');
const baseUrl = `${endpoint}/lsp/`;
let loaded = false;

export function apply(monaco: typeof import('monaco-editor')) {
    if (loaded) return;
    loaded = true;
    MonacoServices.install(monaco);

    function registerLspProvider(
        name: string, languages: string[], documentSelector: string[],
        url: string, args: (model: editor.IModel) => any = () => ({}),
    ) {
        let webSocket: Socket;
        const connected = () => webSocket && webSocket?.sock.readyState === webSocket?.sock.OPEN;
        function addModel(model: editor.IModel) {
            if (!languages.includes(model.getLanguageId().toLowerCase()) || connected()) return;
            webSocket = new Socket(`${url}?${encodeURIComponent(JSON.stringify(args(model)))}`, true);
            listen({
                webSocket: webSocket as any,
                onConnection: (connection) => {
                    const languageClient = new MonacoLanguageClient({
                        name,
                        clientOptions: {
                            documentSelector,
                            errorHandler: {
                                error: () => ErrorAction.Continue,
                                closed: () => CloseAction.DoNotRestart,
                            },
                        },
                        connectionProvider: {
                            get: (errorHandler, closeHandler) => Promise.resolve(createConnection(connection, errorHandler, closeHandler)),
                        },
                    });
                    languageClient.start();
                    webSocket.onclose = async () => {
                        await languageClient.stop();
                        connection.end();
                    };
                },
            });
        }
        monaco.editor.onDidCreateModel(addModel);
        monaco.editor.onWillDisposeModel((model) => {
            if (languages.includes(model.getLanguageId().toLowerCase()) && connected()) {
                webSocket.close();
            }
        });
        monaco.editor.onDidChangeModelLanguage(({ model, oldLanguage }) => {
            if (languages.includes(oldLanguage) && connected()) {
                webSocket.close();
            } else if (languages.includes(model.getLanguageId()) && !connected()) {
                addModel(model);
            }
        });

        document.addEventListener('visibilitychange', () => {
            // FIXME Alt-Tab will temporarily make the visibilityState to visible
            if (document.visibilityState === 'visible' && webSocket) {
                if (!connected()) {
                    console.log('Resume language server');
                    webSocket.sock.reconnect();
                }
            } else if (document.visibilityState === 'hidden' && connected()) {
                setTimeout(() => {
                    if (document.visibilityState === 'hidden' && connected()) {
                        console.log('Pause language server');
                        webSocket.sock.close();
                    }
                }, 30000);
            }
        });
    }

    registerLspProvider(
        'Python Language Client', ['python'], ['python', '.py', '.py2', '.py3'],
        `${baseUrl}python/websocket`,
    );
    registerLspProvider(
        'Cpp Language Client', ['cpp', 'c'], ['.cpp', 'cpp', '.c', 'c'],
        `${baseUrl}cpp/websocket`, (model) => ({
            style: UserContext.formatStyle,
            lang: model.getLanguageId() === 'c' ? 'c' : 'c++',
        }),
    );
    registerLspProvider(
        'Java Language Client', ['java'], ['java', '.java'],
        `${baseUrl}java/websocket`,
    );
}
