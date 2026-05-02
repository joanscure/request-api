const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const http  = require('http');
const https = require('https');
const { URL } = require('url');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 740, minWidth: 800, minHeight: 520,
    backgroundColor: '#0d0d0d',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile('index.html');
  win.setTitle('requestapi');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── file picker ───────────────────────────────────────
ipcMain.handle('pick-file', async (_e, opts) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], ...(opts || {}) });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  try {
    const stats = fs.statSync(filePath);
    return { filePath, fileName: path.basename(filePath), size: stats.size };
  } catch { return null; }
});

// ── HTTP request ──────────────────────────────────────
ipcMain.handle('http-request', (_e, { method, url, headers, body }) => {
  return new Promise((resolve) => {
    const t0 = Date.now();

    let parsed;
    try { parsed = new URL(url); }
    catch (e) {
      return resolve({ status: 0, statusText: 'URL inválida: ' + e.message, headers: {}, body: '', ms: 0, error: true });
    }

    const lib = parsed.protocol === 'https:' ? https : http;
    const reqHeaders = { ...(headers || {}) };
    let bodyBuffer = null;

    // build body buffer
    if (body) {
      if (body._type === 'binary') {
        try {
          bodyBuffer = fs.readFileSync(body.filePath);
          if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/octet-stream';
          reqHeaders['Content-Length'] = bodyBuffer.length;
        } catch (e) {
          return resolve({ status: 0, statusText: 'Error leyendo archivo: ' + e.message, headers: {}, body: '', ms: 0, error: true });
        }
      } else if (body._type === 'multipart') {
        try {
          const boundary = 'boundary' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
          bodyBuffer = buildMultipart(body.parts, boundary);
          reqHeaders['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
          reqHeaders['Content-Length'] = bodyBuffer.length;
        } catch (e) {
          return resolve({ status: 0, statusText: 'Error armando multipart: ' + e.message, headers: {}, body: '', ms: 0, error: true });
        }
      } else if (typeof body === 'string' && body) {
        bodyBuffer = Buffer.from(body, 'utf-8');
        reqHeaders['Content-Length'] = bodyBuffer.length;
      }
    }

    const options = {
      method: method.toUpperCase(),
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: reqHeaders,
      rejectUnauthorized: false,   // permite certs auto-firmados en dev
      timeout: 30000,
    };

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode, statusText: res.statusMessage,
        headers: res.headers, body: Buffer.concat(chunks).toString('utf-8'),
        ms: Date.now() - t0, error: false,
      }));
      res.on('error', e => resolve({ status: 0, statusText: e.message, headers: {}, body: '', ms: Date.now() - t0, error: true }));
    });

    req.on('timeout', () => { req.destroy(); resolve({ status: 0, statusText: 'Timeout (30s)', headers: {}, body: '', ms: 30000, error: true }); });
    req.on('error',   e => resolve({ status: 0, statusText: e.message, headers: {}, body: '', ms: Date.now() - t0, error: true }));

    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
});

function buildMultipart(parts, boundary) {
  const CRLF = '\r\n';
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}${CRLF}`));
    if (part.isFile) {
      const data = fs.readFileSync(part.filePath);
      const fname = part.fileName || path.basename(part.filePath);
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"; filename="${fname}"${CRLF}`));
      chunks.push(Buffer.from(`Content-Type: ${guessMime(fname)}${CRLF}${CRLF}`));
      chunks.push(data);
      chunks.push(Buffer.from(CRLF));
    } else {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"${CRLF}${CRLF}`));
      chunks.push(Buffer.from((part.value || '') + CRLF));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--${CRLF}`));
  return Buffer.concat(chunks);
}

function guessMime(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return ({
    jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif',
    webp:'image/webp', svg:'image/svg+xml', ico:'image/x-icon',
    pdf:'application/pdf', txt:'text/plain', html:'text/html',
    json:'application/json', xml:'application/xml', csv:'text/csv',
    zip:'application/zip', tar:'application/x-tar', gz:'application/gzip',
    mp4:'video/mp4', mp3:'audio/mpeg', wav:'audio/wav',
    woff:'font/woff', woff2:'font/woff2',
  })[ext] || 'application/octet-stream';
}
