function highlightJSON(str) {
  const e = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return e.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    m => {
      if (m[0]==='"') return /:$/.test(m) ? `<span class="json-key">${m}</span>` : `<span class="json-str">${m}</span>`;
      if (m==='true'||m==='false') return `<span class="json-bool">${m}</span>`;
      if (m==='null') return `<span class="json-null">${m}</span>`;
      return `<span class="json-num">${m}</span>`;
    }
  );
}

function showResponse(body, statusText, cls, ms, ctype, size, headers) {
  hasResp = true;
  document.getElementById('empty-state').style.display = 'none';
  const badge = document.getElementById('status-badge');
  badge.style.display = ''; badge.textContent = statusText; badge.className = 'status-badge '+cls;
  document.getElementById('resp-time').textContent  = ms    ? ms+'ms'        : '';
  document.getElementById('resp-ctype').textContent = ctype || '';
  document.getElementById('resp-size').textContent  = size  ? fmtSize(size)  : '';
  document.getElementById('resp-tabs').style.display = '';
  document.getElementById('copy-btn').style.display  = '';
  document.getElementById('raw-btn').style.display   = isJSON ? '' : 'none';
  document.getElementById('raw-btn').textContent     = 'raw';
  const out = document.getElementById('response-output');
  out.style.display = ''; out.className = '';
  out.innerHTML = isJSON ? highlightJSON(body) : escT(body);
  const hl      = document.getElementById('resp-headers-list');
  const entries = Object.entries(headers || {});
  hl.innerHTML  = entries.length
    ? entries.map(([k,v]) => `<div class="rh-row"><span class="rh-key">${escT(k)}</span><span class="rh-val">${escT(String(v))}</span></div>`).join('')
    : '<div class="empty-state">sin headers de respuesta</div>';
  showRespTab('body');
}

function showRespTab(name) {
  if (!hasResp) return;
  const isB = name === 'body';
  document.getElementById('response-output').style.display    = isB ? '' : 'none';
  document.getElementById('resp-headers-list').style.display  = isB ? 'none' : '';
  document.getElementById('copy-btn').style.display           = isB ? '' : 'none';
  document.getElementById('raw-btn').style.display            = (isB && isJSON) ? '' : 'none';
  document.getElementById('rtab-body').classList.toggle('active', isB);
  document.getElementById('rtab-headers').classList.toggle('active', !isB);
}

function toggleRaw() {
  showRaw = !showRaw;
  const out = document.getElementById('response-output');
  const btn = document.getElementById('raw-btn');
  if (showRaw) { out.className='raw'; out.innerHTML=escT(rawBody);          btn.textContent='pretty'; }
  else         { out.className='';   out.innerHTML=highlightJSON(prettyBody); btn.textContent='raw'; }
}

function copyResponse() {
  navigator.clipboard.writeText(document.getElementById('response-output').textContent).catch(()=>{});
  const btn = document.getElementById('copy-btn'); btn.textContent = '✓ copiado';
  setTimeout(() => btn.textContent = 'copiar', 1500);
}
