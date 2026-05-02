function pushHistory(entry) {
  reqHistory.unshift({ id: genId(), ts: Date.now(), ...entry });
  if (reqHistory.length > 20) reqHistory = reqHistory.slice(0, 20);
  try { localStorage.setItem('httpclient_hist_v1', JSON.stringify(reqHistory)); } catch {}
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById('hist-list');
  if (!reqHistory.length) {
    el.innerHTML = '<div class="empty-state" style="padding:16px">sin historial todavía</div>';
    return;
  }
  el.innerHTML = reqHistory.map((h, i) => `
    <div class="hist-item${i===activeHistIdx?' active':''}" onclick="loadHistItem(${i})">
      <span class="method-badge ${h.method}">${h.method.slice(0,4)}</span>
      <span class="hist-url" title="${escA(h.url)}">${escT(shortUrl(h.url))}</span>
      <span class="hist-status ${h.cls}">${h.status}</span>
      <span class="hist-age">${relTime(h.ts)}</span>
    </div>`).join('');
}

function loadHistItem(idx) {
  const h = reqHistory[idx]; if (!h) return;
  activeHistIdx = idx;
  rawBody = h.body; prettyBody = h.prettyBody; isJSON = h.isJSON; showRaw = false;
  showResponse(h.prettyBody || h.body, `${h.status} ${h.statusText}`, h.cls, h.ms, h.ctype, h.size, h.respHeaders || {});
  renderHistory();
}

function confirmClearHistory() {
  if (!reqHistory.length) return;
  showConfirm('¿Limpiar todo el historial?', () => {
    reqHistory = []; activeHistIdx = -1;
    try { localStorage.removeItem('httpclient_hist_v1'); } catch {}
    renderHistory();
  });
}
