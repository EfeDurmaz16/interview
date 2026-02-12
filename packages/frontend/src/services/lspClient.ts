/**
 * lspClient.ts
 *
 * Browser'dan lsp-ws-proxy'ye WebSocket baglantisi kurar.
 * 3 katman:
 *   1. WebSocket        → ham baglanti (/lsp uzerinden Vite proxy)
 *   2. MessageConnection → JSON-RPC protokolu (vscode-jsonrpc)
 *   3. LspConnection     → tipli LSP metodlari (initialize, completion, hover...)
 *
 * Akis:
 *   connectLsp() cagirilir
 *   → WebSocket acar
 *   → createMessageConnection ile JSON-RPC katmani olusturur
 *   → createLspConnection ile LSP katmani olusturur
 *   → initialize request gonderir (client capabilities)
 *   → initialized notification gonderir
 *   → textDocumentOpened ile solution.php'yi acar
 *   → LspConnection doner, artik completion/hover/diagnostics kullanilabilir
 */

import { createMessageConnection } from '@qualified/vscode-jsonrpc-ws';
import { createLspConnection, type LspConnection } from '@qualified/lsp-connection';

// lsp-ws-proxy --remap kullaniyoruz, bu yuzden source:// scheme'i kullaniyoruz.
// lsp-ws-proxy bunu file:// URI'ye cevirip Intelephense'e iletiyor.
export const DOCUMENT_URI = 'source:///solution.php';
export const ROOT_URI = 'source:///';

let lsp: LspConnection | null = null;
let ws: WebSocket | null = null;
let documentVersion = 0;

/**
 * LSP sunucusuna baglanir ve handshake yapar.
 *
 * 1. /lsp endpoint'ine WebSocket acar (Vite proxy → lsp-ws-proxy:9999)
 * 2. JSON-RPC MessageConnection olusturur (Promise — ws.onopen bekler)
 * 3. LspConnection wrapper olusturur
 * 4. initialize request gonderir — client'in neler yapabildigini bildirir
 * 5. initialized notification gonderir — handshake tamamlandi
 * 6. solution.php icin textDocument/didOpen gonderir — "bu dosyayi takip et"
 *
 * @param initialCode Editordeki mevcut kod (didOpen ile gonderilir)
 * @returns LspConnection — completion, hover, diagnostics icin kullanilir
 */
export async function connectLsp(initialCode = '<?php\n'): Promise<LspConnection> {
  if (lsp) return lsp;

  // 1) WebSocket ac
  // Vite dev server /lsp isteklerini ws://localhost:9999'a proxy'liyor
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/lsp`);

  // 2) JSON-RPC katmani
  // createMessageConnection bir PROMISE doner — WebSocket'in onopen'ini bekler
  // acilinca reader/writer olusturup MessageConnection verir
  const messageConnection = await createMessageConnection(ws);

  // 3) LSP katmani — MessageConnection'i tipli LSP metodlarina sarar
  // Artik lsp.getCompletion(), lsp.getHoverInfo() gibi metodlar var
  lsp = createLspConnection(messageConnection);

  // 4) Dinlemeye basla — gelen JSON-RPC mesajlarini handler'lara yonlendirir
  lsp.listen();

  // 5) Initialize request — sunucuya "ben bu ozellikleri destekliyorum" der
  // Sunucu da kendi ozelliklerini doner (capabilities exchange)
  await lsp.initialize({
    capabilities: {
      textDocument: {
        synchronization: {
          didSave: true,
          willSave: false,
          willSaveWaitUntil: false,
          dynamicRegistration: false,
        },
        completion: {
          completionItem: {
            snippetSupport: true,
            documentationFormat: ['markdown', 'plaintext'],
            resolveSupport: {
              properties: ['documentation', 'detail'],
            },
          },
          dynamicRegistration: false,
        },
        hover: {
          contentFormat: ['markdown', 'plaintext'],
          dynamicRegistration: false,
        },
        publishDiagnostics: {
          relatedInformation: true,
        },
        signatureHelp: {
          signatureInformation: {
            documentationFormat: ['markdown', 'plaintext'],
            parameterInformation: { labelOffsetSupport: true },
          },
          dynamicRegistration: false,
        },
      },
    },
    rootUri: ROOT_URI,
    processId: null,
    workspaceFolders: null,
  });

  // 6) Initialized notification — "handshake bitti, artik request gonder"
  await lsp.initialized();

  // 7) Dosyayi ac — "solution.php artik benim kontrolumde, diskten okuma"
  documentVersion = 0;
  await lsp.textDocumentOpened({
    textDocument: {
      uri: DOCUMENT_URI,
      languageId: 'php',
      version: documentVersion,
      text: initialCode,
    },
  });

  return lsp;
}

/**
 * Dosya icerigi degisti — LSP'ye bildir.
 * Full sync: her seferinde tum dosya icerigi gonderilir.
 *
 * @param content Dosyanin tam icerigi
 */
export function notifyChange(content: string): void {
  if (!lsp) return;
  documentVersion++;
  // textDocumentChanged = tipli metod, iceride didChange notification gonderir
  lsp.textDocumentChanged({
    textDocument: {
      uri: DOCUMENT_URI,
      version: documentVersion,
    },
    contentChanges: [{ text: content }],
  });
}

/**
 * LSP baglantisini temiz bir sekilde kapatir.
 */
export async function disconnectLsp(): Promise<void> {
  if (!lsp) return;
  try {
    await lsp.textDocumentClosed({ textDocument: { uri: DOCUMENT_URI } });
    await lsp.shutdown();
    await lsp.exit();
  } catch {
    // Baglanti zaten kopmus olabilir
  }
  lsp.dispose();
  lsp = null;
  ws?.close();
  ws = null;
  documentVersion = 0;
}

/** Mevcut LSP connection'i dondurur. Bridge tarafindan kullanilir. */
export function getLspConnection(): LspConnection | null {
  return lsp;
}
