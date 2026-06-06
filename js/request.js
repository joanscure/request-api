async function sendRequest() {
  const method = document.getElementById('method').value;
  let url = document.getElementById('url').value.trim();
  if (!url) { document.getElementById('url').focus(); return; }
  url = applyEnv(url);
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const rawParams = getFields('params');
  const params = {};
  Object.entries(rawParams).forEach(([k,v]) => { params[k] = applyEnv(v); });
  if (Object.keys(params).length)
    url += (url.includes('?') ? '&' : '?') + new URLSearchParams(params);

  const headers = {};
  Object.entries(getAuthHeaders()).forEach(([k,v]) => { headers[k] = applyEnv(v); });
  Object.entries(getFields('headers')).forEach(([k,v]) => { headers[k] = applyEnv(v); });

  const bodyText = applyEnv(document.getElementById('body-input').value).trim();
  const hasBody  = bodyText && !['GET','HEAD'].includes(method);
  if (hasBody && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const btn = document.getElementById('send-btn');
  btn.innerHTML = '<span class="spinner"></span>enviando'; btn.disabled = true;

  try {
    let status, statusText, ms, body, respHeaders = {};
    if (window.electronAPI) {
      const r = await window.electronAPI.request({ method, url, headers, body: hasBody ? bodyText : null });
      if (r.error && r.status===0) throw new Error(r.statusText);
      ({ status, statusText, ms, body } = r); respHeaders = r.headers || {};
    } else {
      const opts = { method, headers: new Headers(headers) };
      if (hasBody) opts.body = bodyText;
      const t0 = performance.now();
      const res = await fetch(url, opts);
      ms = Math.round(performance.now()-t0);
      status=res.status; statusText=res.statusText; body=await res.text();
      respHeaders = Object.fromEntries(res.headers.entries());
    }

    let pretty = body; isJSON = false;
    try { pretty = JSON.stringify(JSON.parse(body), null, 2); isJSON = true; } catch {}
    rawBody = body; prettyBody = pretty; showRaw = false;
    const cls   = status<300 ? 's2xx' : status<400 ? 's3xx' : status<500 ? 's4xx' : 's5xx';
    const ctype = (respHeaders['content-type'] || '').split(';')[0].trim();

    showResponse(pretty, `${status} ${statusText}`, cls, ms, ctype, body.length, respHeaders);
    if (typeof runTests === 'function') showTestResults(runTests(status, body, ms));
    if (typeof updateCurrentTabLabel === 'function') updateCurrentTabLabel();
    activeHistIdx = -1;
    pushHistory({ method, url, status, statusText, cls, ctype, ms, size: body.length, body, prettyBody: pretty, isJSON, respHeaders });
  } catch(e) {
    rawBody=''; prettyBody=''; isJSON=false; showRaw=false;
    showResponse('Error: '+e.message, 'Error de red', 'serr', 0, '', 0, {});
  }
  btn.innerHTML = 'enviar →'; btn.disabled = false;
}
