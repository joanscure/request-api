function buildCurlCmd() {
  const method  = document.getElementById('method').value;
  const rawUrl  = document.getElementById('url').value.trim();
  const body    = document.getElementById('body-input').value.trim();
  const headers = getFields('headers');
  const params  = getFields('params');
  const auth    = getAuthHeaders();

  let url = rawUrl || 'https://example.com';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  if (Object.keys(params).length)
    url += (url.includes('?') ? '&' : '?') + new URLSearchParams(params);

  const allHeaders = { ...auth, ...headers };
  const hasBody = body && !['GET','HEAD'].includes(method);
  if (hasBody && !allHeaders['Content-Type']) allHeaders['Content-Type'] = 'application/json';

  const parts = [`curl -X ${method} \\\n  "${url.replace(/"/g, '\\"')}"`];
  Object.entries(allHeaders).forEach(([k,v]) => {
    parts.push(`  -H "${k.replace(/"/g,'\\"')}: ${String(v).replace(/"/g,'\\"')}"`);
  });
  if (hasBody) parts.push(`  -d '${body.replace(/'/g, "'\\''")}'`);
  return parts.join(' \\\n');
}

function openCurlModal() {
  document.getElementById('curl-output').value = buildCurlCmd();
  document.getElementById('curl-import-input').value = '';
  document.getElementById('curl-import-err').style.display = 'none';
  document.getElementById('curl-modal').style.display = 'flex';
}

function closeCurlModal() {
  document.getElementById('curl-modal').style.display = 'none';
}

function copyCurl() {
  navigator.clipboard.writeText(document.getElementById('curl-output').value).catch(()=>{});
  const btn = document.getElementById('curl-copy-btn');
  btn.textContent = '✓ copiado';
  setTimeout(() => btn.textContent = 'copiar', 1500);
}

function refreshCurlOutput() {
  document.getElementById('curl-output').value = buildCurlCmd();
}

function importCurl() {
  const raw = document.getElementById('curl-import-input').value.trim();
  if (!raw) return;
  const parsed = parseCurl(raw);
  if (!parsed) { document.getElementById('curl-import-err').style.display = ''; return; }
  document.getElementById('curl-import-err').style.display = 'none';
  applyParsedCurl(parsed);
  closeCurlModal();
}

function _tokenize(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    while (i < str.length && str[i] === ' ') i++;
    if (i >= str.length) break;
    if (str[i] === '"') {
      let j = i + 1, s = '';
      while (j < str.length && str[j] !== '"') {
        if (str[j] === '\\') { s += str[j+1]; j += 2; } else { s += str[j++]; }
      }
      tokens.push(s); i = j + 1;
    } else if (str[i] === "'") {
      let j = i + 1, s = '';
      while (j < str.length) {
        if (str[j] === "'" && str[j+1] === '\\' && str[j+2] === "'" && str[j+3] === "'") {
          s += "'"; j += 4;
        } else if (str[j] === "'") { break; }
        else { s += str[j++]; }
      }
      tokens.push(s); i = j + 1;
    } else {
      let j = i;
      while (j < str.length && str[j] !== ' ') j++;
      tokens.push(str.slice(i, j)); i = j;
    }
  }
  return tokens;
}

function parseCurl(raw) {
  const cmd = raw.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/^curl\b/i.test(cmd)) return null;
  const tokens = _tokenize(cmd.replace(/^curl\s*/i, ''));
  let i = 0, method = null, url = null, body = null;
  const headers = {};

  const consume = () => tokens[++i];

  while (i < tokens.length) {
    const t = tokens[i];
    if (t === '-X' || t === '--request')       { method = consume(); }
    else if (t === '-H' || t === '--header')   {
      const h = consume(); const sep = h.indexOf(':');
      if (sep > 0) headers[h.slice(0, sep).trim()] = h.slice(sep + 1).trim();
    }
    else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
      body = consume();
    }
    else if (t === '-u' || t === '--user') {
      const cred = consume();
      headers['Authorization'] = 'Basic ' + btoa(cred);
    }
    else if ((t === '-A' || t === '--user-agent') ||
             (t === '--connect-timeout') || (t === '--max-time') ||
             (t === '-o' || t === '--output') || (t === '--proxy')) {
      consume(); // skip value
    }
    else if (t.startsWith('-')) { /* skip flag-only options */ }
    else { url = t.replace(/^["']|["']$/g, ''); }
    i++;
  }

  if (!url) return null;
  if (!method) method = body ? 'POST' : 'GET';
  return { method: method.toUpperCase(), url, headers, body: body || '' };
}

function applyParsedCurl(p) {
  const methods = ['GET','POST','PUT','PATCH','DELETE','HEAD'];
  document.getElementById('method').value     = methods.includes(p.method) ? p.method : 'GET';
  document.getElementById('url').value        = p.url || '';
  document.getElementById('body-input').value = p.body || '';
  document.getElementById('headers-list').innerHTML = '';

  const hdrs = { ...p.headers };
  const authVal = hdrs['Authorization'] || hdrs['authorization'] || '';
  delete hdrs['Authorization']; delete hdrs['authorization'];

  if (authVal.startsWith('Bearer ')) {
    loadAuthState({ type: 'bearer', token: authVal.slice(7) });
  } else if (authVal.startsWith('Basic ')) {
    try {
      const decoded = atob(authVal.slice(6));
      const sep = decoded.indexOf(':');
      loadAuthState({ type: 'basic', user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) });
    } catch { loadAuthState(null); }
  } else {
    if (authVal) hdrs['Authorization'] = authVal;
    loadAuthState(null);
  }

  Object.entries(hdrs).forEach(([k,v]) => addField('headers', k, v));
  if (typeof updateCurrentTabLabel === 'function') updateCurrentTabLabel();
  scheduleAutoSave();
}
