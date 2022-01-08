import { listen } from '@codingame/monaco-jsonrpc';
import {
  MonacoLanguageClient, CloseAction, ErrorAction,
  MonacoServices, createConnection,
} from '@codingame/monaco-languageclient';
import ReconnectingWebSocket from 'reconnecting-websocket';

function createWebSocket(url: string): any {
  const socketOptions = {
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1000,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 10000,
    maxRetries: Infinity,
    debug: false,
  };
  return new ReconnectingWebSocket(url, [], socketOptions);
}
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const url = `${protocol}://${window.location.host}/lsp/cpp/websocket`;

window.exports = function apply(monaco: any) {
  MonacoServices.install(monaco);
  const webSocket = createWebSocket(url);
  listen({
    webSocket,
    onConnection: (connection) => {
      const languageClient = new MonacoLanguageClient({
        name: 'Cpp Language Client',
        clientOptions: {
          documentSelector: ['.cpp', 'cpp', '.c', 'c'],
          errorHandler: {
            error: () => ErrorAction.Continue,
            closed: () => CloseAction.DoNotRestart,
          },
        },
        connectionProvider: {
          get: (errorHandler, closeHandler) => Promise.resolve(createConnection(connection, errorHandler, closeHandler)),
        },
      });
      const disposable = languageClient.start();
      connection.onClose(() => disposable.dispose());
    },
  });
}