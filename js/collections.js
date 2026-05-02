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
              <button class="req-del" onclick="confirmDelReq('${c.id}','${r.id}',event)">×</button>
            </div>`).join('')
          : '<div class="coll-empty-reqs">vacía</div>'
        ) + '</div>';
    }
    return `
      <div class="coll-folder" onclick="toggleColl('${c.id}')">
        <span class="coll-arrow">${arrow}</span>
        <span class="coll-name-text" title="${escA(c.name)}">${escT(c.name)}</span>
        <span class="coll-acts">
          <button class="coll-act" title="agregar request a esta colección" onclick="addReqToColl('${c.id}',event)">+</button>
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

function addReqToColl(collId, e) { e.stopPropagation(); openSaveModal(collId); }

function loadRequest(collId, reqId) {
  const coll = collections.find(c => c.id === collId); if (!coll) return;
  const req  = coll.requests.find(r => r.id === reqId); if (!req)  return;
  document.getElementById('method').value      = req.method;
  document.getElementById('url').value         = req.url;
  document.getElementById('body-input').value  = req.body || '';
  document.getElementById('headers-list').innerHTML = '';
  document.getElementById('params-list').innerHTML  = '';
  Object.entries(req.headers||{}).forEach(([k,v]) => addField('headers',k,v));
  Object.entries(req.params ||{}).forEach(([k,v]) => addField('params', k,v));
  loadAuthState(req.auth);
  activeCollId = collId; activeReqId = reqId;
  renderCollTree();
}

function clearForm() {
  document.getElementById('url').value         = '';
  document.getElementById('method').value      = 'GET';
  document.getElementById('body-input').value  = '';
  document.getElementById('headers-list').innerHTML = '';
  document.getElementById('params-list').innerHTML  = '';
  loadAuthState(null);
  activeCollId = null; activeReqId = null;
  renderCollTree();
  document.getElementById('url').focus();
}

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
    if (activeReqId === reqId) activeReqId = null;
    persist(); renderCollTree();
  });
}

function saveRequest() { openSaveModal(activeCollId); }

function openSaveModal(preCollId) {
  if (!collections.length) {
    collections.push({ id: genId(), name: 'General', open: true, requests: [] });
    persist();
  }
  renderSaveCollOptions(preCollId || collections[0].id);
  const inp = document.getElementById('save-name-input');
  if (activeReqId && activeCollId) {
    const c = collections.find(c => c.id === activeCollId);
    const r = c?.requests.find(r => r.id === activeReqId);
    inp.value = r ? r.name : '';
  } else { inp.value = ''; }
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
  let collId = document.getElementById('save-coll-select').value;
  if (collId === '__new__') {
    const cn = document.getElementById('save-new-coll-input').value.trim();
    if (!cn) { document.getElementById('save-new-coll-input').focus(); return; }
    const nc = { id: genId(), name: cn, open: true, requests: [] };
    collections.push(nc); collId = nc.id;
  }
  const coll = collections.find(c => c.id === collId); if (!coll) return;
  const existIdx = coll.requests.findIndex(r => r.name === name);
  const req = {
    id:      existIdx >= 0 ? coll.requests[existIdx].id : genId(),
    name,
    method:  document.getElementById('method').value,
    url:     document.getElementById('url').value,
    headers: getFields('headers'),
    params:  getFields('params'),
    body:    document.getElementById('body-input').value,
    auth:    getAuthState(),
  };
  if (existIdx >= 0) coll.requests[existIdx] = req;
  else               coll.requests.unshift(req);
  coll.open = true;
  activeCollId = collId; activeReqId = req.id;
  persist(); renderCollTree(); closeSaveModal();
}
