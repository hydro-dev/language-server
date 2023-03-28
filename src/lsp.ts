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

window.exports = function apply(monaco: typeof import('monaco-editor')) {
    if (window.__Hydro_lsp_loaded) return;
    window.__Hydro_lsp_loaded = true;
    MonacoServices.install(monaco);

    function registerLspProvider(
        name: string, languages: string[], documentSelector: string[],
        url: string, args: (model: editor.IModel) => any = () => ({}),
    ) {
        let webSocket: Socket['sock'] = null;
        const connected = () => webSocket && webSocket?.readyState === webSocket?.OPEN;
        function addModel(model: editor.IModel) {
            if (!languages.includes(model.getLanguageId().toLowerCase()) || connected()) return;
            webSocket = new Socket(`${url}?${encodeURIComponent(JSON.stringify(args(model)))}`).sock;
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
            if (document.visibilityState === 'visible' && webSocket) {
                if (!connected()) {
                    console.log('Resume language server');
                    webSocket.reconnect();
                }
            } else if (connected()) {
                console.log('Pause language server');
                webSocket.close();
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
};
