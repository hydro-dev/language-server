import { listen } from '@codingame/monaco-jsonrpc';
import {
  MonacoLanguageClient, CloseAction, ErrorAction,
  MonacoServices, createConnection,
} from '@codingame/monaco-languageclient';
import type { editor } from 'monaco-editor';
import ReconnectingWebSocket from "reconnecting-websocket";

function createWebSocket(url: string) {
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
const host = window.location.host.startsWith('192.168.1.223') ? '192.168.1.223:9999' : window.location.host
const baseUrl = `${protocol}://${host}/lsp/`;

window.exports = function apply(monaco: typeof import('monaco-editor')) {
  if (window.__Hydro_lsp_loaded) return;
  window.__Hydro_lsp_loaded = true;
  MonacoServices.install(monaco);

  function registerLspProvider(name: string, languages: string[], documentSelector: string[], url: string) {
    let webSocket = null;
    let connected = false;
    function addModel(model: editor.IModel) {
      if (!languages.includes(model.getLanguageId().toLowerCase()) || connected) return;
      webSocket = createWebSocket(url);
      listen({
        webSocket,
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
          const disposable = languageClient.start();
          connection.onClose(() => disposable.dispose());
        },
      });
    }
    monaco.editor.onDidCreateModel(addModel);
    monaco.editor.onWillDisposeModel((model) => {
      if (languages.includes(model.getLanguageId().toLowerCase()) && connected) {
        connected = false;
        webSocket.close();
      }
    });
    monaco.editor.onDidChangeModelLanguage(({ model, oldLanguage }) => {
      if (languages.includes(oldLanguage) && connected) {
        connected = false;
        webSocket.close();
      } else if (languages.includes(model.getLanguageId()) && !connected) {
        addModel(model);
      }
    })
  }

  registerLspProvider(
    'Python Language Client', ['python'], ['python', '.py', '.py2', '.py3'],
    `${baseUrl}python/websocket`
  );
  registerLspProvider(
    'Cpp Language Client', ['cpp', 'c'], ['.cpp', 'cpp', '.c', 'c'],
    `${baseUrl}cpp/websocket${UserContext.formatStyle
      ? '?style=' + encodeURIComponent(UserContext.formatStyle) : ''}`
  );
  registerLspProvider(
    'Java Language Client', ['java'], ['java', '.java'],
    `${baseUrl}java/websocket`
  );
}