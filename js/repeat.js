let _repeatRunning = false;
let _repeatAbort   = null;

function openRepeatModal() {
  document.getElementById('repeat-modal').style.display = 'flex';
  document.getElementById('repeat-results').innerHTML   = '';
  document.getElementById('repeat-summary').innerHTML   = '';
  document.getElementById('repeat-progress').style.width = '0%';
  document.getElementById('repeat-run-btn').disabled    = false;
  document.getElementById('repeat-stop-btn').style.display = 'none';
}

function closeRepeatModal() {
  if (_repeatRunning) stopRepeat();
  document.getElementById('repeat-modal').style.display = 'none';
}

function stopRepeat() {
  _repeatRunning = false;
  if (_repeatAbort) { _repeatAbort.abort(); _repeatAbort = null; }
  document.getElementById('repeat-run-btn').disabled       = false;
  document.getElementById('repeat-stop-btn').style.display = 'none';
}

async function runRepeat() {
  const n     = Math.max(1, Math.min(1000, parseInt(document.getElementById('repeat-count-input').value)  || 10));
  const delay = Math.max(0, Math.min(60000, parseInt(document.getElementById('repeat-delay-input').value) || 0));

  const method = document.getElementById('method').value;
  let url = document.getElementById('url').value.trim();
  if (!url) { closeRepeatModal(); return; }
  url = applyEnv(url);
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const rawParams = getFields('params');
  const qp = {};
  Object.entries(rawParams).forEach(([k,v]) => { qp[k] = applyEnv(v); });
  if (Object.keys(qp).length)
    url += (url.includes('?') ? '&' : '?') + new URLSearchParams(qp);

  const headers = {};
  Object.entries(getAuthHeaders()).forEach(([k,v]) => { headers[k] = applyEnv(v); });
  Object.entries(getFields('headers')).forEach(([k,v]) => { headers[k] = applyEnv(v); });
  const bodyText = applyEnv(document.getElementById('body-input').value).trim();
  const hasBody  = bodyText && !['GET','HEAD'].includes(method);
  if (hasBody && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  _repeatRunning = true;
  document.getElementById('repeat-run-btn').disabled       = true;
  document.getElementById('repeat-stop-btn').style.display = '';
  document.getElementById('repeat-results').innerHTML      = '';
  document.getElementById('repeat-summary').innerHTML      = '';
  document.getElementById('repeat-progress').style.width   = '0%';

  const results = [];

  for (let i = 0; i < n && _repeatRunning; i++) {
    _repeatAbort = new AbortController();
    document.getElementById('repeat-progress').style.width = (i / n * 100) + '%';

    const t0 = performance.now();
    let status = 0, statusText = 'Error', ms = 0, ok = false;
    try {
      const opts = { method, headers: new Headers(headers), signal: _repeatAbort.signal };
      if (hasBody) opts.body = bodyText;
      const res = await fetch(url, opts);
      ms = Math.round(performance.now() - t0);
      status = res.status; statusText = res.statusText;
      ok = status >= 200 && status < 300;
      await res.text();
    } catch(e) {
      if (!_repeatRunning) break;
      ms = Math.round(performance.now() - t0);
      statusText = e.name === 'AbortError' ? 'cancelado' : e.message;
    }

    const row = { i: i + 1, status, statusText, ms, ok };
    results.push(row);
    _appendRepeatRow(row);

    if (delay > 0 && i < n - 1 && _repeatRunning)
      await new Promise(r => setTimeout(r, delay));
  }

  document.getElementById('repeat-progress').style.width = '100%';
  _renderRepeatSummary(results);
  _repeatRunning = false;
  _repeatAbort   = null;
  document.getElementById('repeat-run-btn').disabled       = false;
  document.getElementById('repeat-stop-btn').style.display = 'none';
}

function _appendRepeatRow(r) {
  const container = document.getElementById('repeat-results');
  const div = document.createElement('div');
  div.className = 'rr-row ' + (r.ok ? 'rr-ok' : 'rr-fail');
  div.innerHTML =
    `<span class="rr-num">#${r.i}</span>` +
    `<span class="rr-status">${r.status || '—'} ${escT(r.statusText)}</span>` +
    `<span class="rr-ms">${r.ms}ms</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function _renderRepeatSummary(results) {
  if (!results.length) return;
  const ok   = results.filter(r => r.ok).length;
  const fail = results.length - ok;
  const ms   = results.map(r => r.ms);
  const min  = Math.min(...ms), max = Math.max(...ms);
  const avg  = Math.round(ms.reduce((a,b) => a+b, 0) / ms.length);
  document.getElementById('repeat-summary').innerHTML =
    `<span class="rs-ok">${ok} ok</span> · ` +
    `<span class="rs-fail">${fail} error${fail !== 1 ? 'es' : ''}</span> · ` +
    `min <b>${min}ms</b> · avg <b>${avg}ms</b> · max <b>${max}ms</b>`;
}
