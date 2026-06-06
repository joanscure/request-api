let _saveMode = 'new';          // 'new' | 'rename' | 'duplicate'
let _saveModalSrcCollId = null;
let _saveModalReq = null;
let _autoSaveTimer = null;
let _loading = false;

function getFormSnapshot() {
  return {
    method:  document.getElementById('method').value,
    url:     document.getElementById('url').value,
    headers: getFields('headers'),
    params:  getFields('params'),
    body:    document.getElementById('body-input').value,
    auth:    getAuthState(),
    tests:   typeof getTests === 'function' ? getTests() : [],
  };
}

function renderCollTree() {
  const el = document.getElementById('coll-tree');
  if (!collections.length) {
    el.innerHTML = '<div class="empty-state" style="padding:16px 10px">sin colecciones<br><span style="font-size:11px">usá el botón de arriba</span></div>';
    return;
  }
  el.innerHTML = collections.map(c => {
    const arrow = c.open ? '▾' : '▸';
    let reqs = '';
    if (c.open) {
      reqs = '<div class="coll-reqs">' +
        (c.requests.length
          ? c.requests.map(r => `
            <div class="req-row${r.id===activeReqId&&c.id===activeCollId?' active':''}" onclick="loadRequest('${c.id}','${r.id}')">
              <span class="method-badge ${r.method}">${r.method}</span>
              <span class="req-name" title="${escA(r.name)}">${escT(r.name)}</span>
              <span class="req-acts">
                <button class="req-act" title="duplicar" onclick="duplicateRequest('${c.id}','${r.id}',event)">⊕</button>
                <button class="req-act" title="renombrar / mover" onclick="editRequest('${c.id}','${r.id}',event)">✎</button>
                <button class="req-act danger" title="eliminar" onclick="confirmDelReq('${c.id}','${r.id}',event)">×</button>
              </span>
            </div>`).join('')
          : '<div class="coll-empty-reqs">vacía</div>'
        ) + '</div>';
    }
    return `
      <div class="coll-folder" onclick="toggleColl('${c.id}')">
        <span class="coll-arrow">${arrow}</span>
        <span class="coll-name-text" title="${escA(c.name)}">${escT(c.name)}</span>
        <span class="coll-acts">
          <button class="coll-act" title="agregar request" onclick="addReqToColl('${c.id}',event)">+</button>
          <button class="coll-act" title="exportar colección" onclick="exportColl('${c.id}',event)">↓</button>
          <button class="coll-act danger" title="eliminar colección" onclick="confirmDelColl('${c.id}',event)">×</button>
        </span>
      </div>${reqs}`;
  }).join('');
}

function toggleColl(id) {
  const c = collections.find(c => c.id === id);
  if (c) { c.open = !c.open; persist(); renderCollTree(); }
}

function startNewColl() {
  const tree = document.getElementById('coll-tree');
  if (tree.querySelector('.coll-new-input')) { tree.querySelector('.coll-new-input').focus(); return; }
  const inp = document.createElement('input');
  inp.className   = 'coll-new-input';
  inp.placeholder = 'nombre de la colección…';
  inp.onkeydown = e => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      const name = inp.value.trim();
      if (name) { collections.push({ id: genId(), name, open: true, requests: [] }); persist(); }
      inp.remove(); renderCollTree();
    }
    if (e.key === 'Escape') inp.remove();
  };
  inp.onblur = () => setTimeout(() => inp.remove(), 120);
  tree.prepend(inp); inp.focus();
}

function addReqToColl(collId, e) {
  e.stopPropagation();
  clearForm();
  openSaveModal(collId, 'new');
}

function loadRequest(collId, reqId) {
  const coll = collections.find(c => c.id === collId); if (!coll) return;
  const req  = coll.requests.find(r => r.id === reqId); if (!req)  return;
  _loading = true;
  document.getElementById('method').value      = req.method;
  document.getElementById('url').value         = req.url;
  document.getElementById('body-input').value  = req.body || '';
  document.getElementById('headers-list').innerHTML = '';
  document.getElementById('params-list').innerHTML  = '';
  Object.entries(req.headers||{}).forEach(([k,v]) => addField('headers',k,v));
  Object.entries(req.params ||{}).forEach(([k,v]) => addField('params', k,v));
  loadAuthState(req.auth);
  if (typeof loadTests === 'function') loadTests(req.tests || []);
  _loading = false;
  activeCollId = collId; activeReqId = reqId;
  clearTimeout(_autoSaveTimer);
  clearResponse();
  renderCollTree();
  if (typeof captureTab === 'function') { captureTab(); renderTabs(); }
}

function clearForm() {
  // Anular IDs activos primero para evitar auto-save durante el reset
  activeCollId = null; activeReqId = null;
  clearTimeout(_autoSaveTimer);
  document.getElementById('url').value         = '';
  document.getElementById('method').value      = 'GET';
  document.getElementById('body-input').value  = '';
  document.getElementById('headers-list').innerHTML = '';
  document.getElementById('params-list').innerHTML  = '';
  addField('headers', 'Accept', 'application/json');
  loadAuthState(null);
  if (typeof loadTests === 'function') loadTests([]);
  renderCollTree();
  if (typeof captureTab === 'function') { captureTab(); renderTabs(); }
  document.getElementById('url').focus();
}

function newRequest() {
  clearForm();
  clearResponse();
}

// ── Auto-save ────────────────────────────────────────────────────────────────

function scheduleAutoSave() {
  if (_loading || !activeReqId || !activeCollId) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(saveCurrent, 800);
}

function saveCurrent() {
  if (!activeReqId || !activeCollId) return;
  const coll = collections.find(c => c.id === activeCollId); if (!coll) return;
  const idx  = coll.requests.findIndex(r => r.id === activeReqId); if (idx < 0) return;
  coll.requests[idx] = { ...coll.requests[idx], ...getFormSnapshot() };
  persist();
}

function saveRequest() {
  if (activeReqId && activeCollId) {
    clearTimeout(_autoSaveTimer);
    saveCurrent();
    showSaveFeedback();
  } else {
    openSaveModal(null, 'new');
  }
}

function showSaveFeedback() {
  const btn = document.querySelector('[onclick="saveRequest()"]');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '✓ guardado';
  btn.style.color = 'var(--green)';
  setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
}

// ── Modal de guardado ────────────────────────────────────────────────────────

function duplicateRequest(collId, reqId, e) {
  e.stopPropagation();
  openSaveModal(collId, 'duplicate', collId, reqId);
}

function editRequest(collId, reqId, e) {
  e.stopPropagation();
  openSaveModal(collId, 'rename', collId, reqId);
}

function openSaveModal(preCollId, mode = 'new', srcCollId = null, srcReqId = null) {
  _saveMode = mode;
  _saveModalReq = null;
  _saveModalSrcCollId = srcCollId;

  if (!collections.length) {
    collections.push({ id: genId(), name: 'General', open: true, requests: [] });
    persist();
  }

  const collId = preCollId || srcCollId ||
    (activeCollId && collections.find(c => c.id === activeCollId) ? activeCollId : null) ||
    collections[0].id;
  renderSaveCollOptions(collId);

  const inp = document.getElementById('save-name-input');

  if ((mode === 'rename' || mode === 'duplicate') && srcCollId && srcReqId) {
    const coll = collections.find(c => c.id === srcCollId);
    const req  = coll?.requests.find(r => r.id === srcReqId);
    _saveModalReq = req || null;
    inp.value = req ? (mode === 'duplicate' ? `Copia de ${req.name}` : req.name) : '';
  } else {
    inp.value = '';
  }

  const titles = { new: 'guardar request', rename: 'renombrar / mover', duplicate: 'duplicar request' };
  document.getElementById('save-modal-title').textContent = titles[mode] || 'guardar request';

  document.getElementById('save-new-coll-row').style.display = 'none';
  document.getElementById('save-modal').style.display = 'flex';
  setTimeout(() => { inp.focus(); inp.select(); }, 40);
}

function renderSaveCollOptions(selectedId) {
  const sel = document.getElementById('save-coll-select');
  sel.innerHTML = collections.map(c =>
    `<option value="${escA(c.id)}"${c.id===selectedId?' selected':''}>${escT(c.name)}</option>`
  ).join('') + '<option value="__new__">+ nueva colección…</option>';
}

function onSaveCollChange() {
  const val = document.getElementById('save-coll-select').value;
  const row = document.getElementById('save-new-coll-row');
  row.style.display = val === '__new__' ? '' : 'none';
  if (val === '__new__') setTimeout(() => document.getElementById('save-new-coll-input').focus(), 30);
}

function closeSaveModal() { document.getElementById('save-modal').style.display = 'none'; }

function confirmSave() {
  const name = document.getElementById('save-name-input').value.trim();
  if (!name) { document.getElementById('save-name-input').focus(); return; }

  let destCollId = document.getElementById('save-coll-select').value;
  if (destCollId === '__new__') {
    const cn = document.getElementById('save-new-coll-input').value.trim();
    if (!cn) { document.getElementById('save-new-coll-input').focus(); return; }
    const nc = { id: genId(), name: cn, open: true, requests: [] };
    collections.push(nc);
    destCollId = nc.id;
  }
  const destColl = collections.find(c => c.id === destCollId); if (!destColl) return;

  let req;
  if (_saveMode === 'rename' && _saveModalReq) {
    // Mover (y renombrar) request existente → quitar de colección origen, insertar en destino
    const srcColl = collections.find(c => c.id === _saveModalSrcCollId);
    if (srcColl) srcColl.requests = srcColl.requests.filter(r => r.id !== _saveModalReq.id);
    req = { ..._saveModalReq, name };
    destColl.requests.unshift(req);
    activeCollId = destCollId;
    activeReqId  = req.id;
  } else if (_saveMode === 'duplicate' && _saveModalReq) {
    // Crear copia a partir del estado guardado
    req = { ..._saveModalReq, id: genId(), name };
    destColl.requests.unshift(req);
    // Cargar el duplicado en el formulario
    _loading = true;
    document.getElementById('method').value      = req.method;
    document.getElementById('url').value         = req.url;
    document.getElementById('body-input').value  = req.body || '';
    document.getElementById('headers-list').innerHTML = '';
    document.getElementById('params-list').innerHTML  = '';
    Object.entries(req.headers||{}).forEach(([k,v]) => addField('headers',k,v));
    Object.entries(req.params ||{}).forEach(([k,v]) => addField('params', k,v));
    loadAuthState(req.auth);
    _loading = false;
    clearResponse();
    activeCollId = destCollId;
    activeReqId  = req.id;
  } else {
    // Request nuevo desde el formulario actual
    req = { id: genId(), name, ...getFormSnapshot() };
    destColl.requests.unshift(req);
    activeCollId = destCollId;
    activeReqId  = req.id;
  }

  destColl.open = true;
  persist(); renderCollTree(); closeSaveModal();
}

// ── Export / Import ──────────────────────────────────────────────────────────

function exportColl(collId, e) {
  e.stopPropagation();
  const c = collections.find(c => c.id === collId); if (!c) return;
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = c.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importColl() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const colls = Array.isArray(data) ? data : [data];
      let imported = 0;
      colls.forEach(c => {
        if (!c.name || !Array.isArray(c.requests)) return;
        collections.push({
          id: genId(), name: c.name, open: true,
          requests: c.requests.map(r => ({ ...r, id: r.id || genId() }))
        });
        imported++;
      });
      if (imported) { persist(); renderCollTree(); }
    } catch(err) {
      alert('Error al importar: ' + err.message);
    }
  };
  inp.click();
}

// ── Eliminar ─────────────────────────────────────────────────────────────────

function confirmDelColl(collId, e) {
  e.stopPropagation();
  const c = collections.find(c => c.id === collId); if (!c) return;
  showConfirm(`¿Eliminar la colección "${c.name}" y sus ${c.requests.length} request(s)?`, () => {
    collections = collections.filter(c => c.id !== collId);
    if (activeCollId === collId) { activeCollId = null; activeReqId = null; }
    persist(); renderCollTree();
  });
}

function confirmDelReq(collId, reqId, e) {
  e.stopPropagation();
  const coll = collections.find(c => c.id === collId);
  const req  = coll?.requests.find(r => r.id === reqId); if (!req) return;
  showConfirm(`¿Eliminar "${req.name}"?`, () => {
    coll.requests = coll.requests.filter(r => r.id !== reqId);
    if (activeReqId === reqId) { activeCollId = null; activeReqId = null; }
    persist(); renderCollTree();
  });
}
