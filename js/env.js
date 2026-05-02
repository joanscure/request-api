function getEnvVars() {
  const e = envState.envs.find(e => e.name === envState.active);
  return e ? (e.vars || {}) : {};
}

function applyEnv(s) {
  if (!s || !envState.active) return s;
  const v = getEnvVars();
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] !== undefined ? v[k] : `{{${k}}}`);
}

function persistEnv() {
  try { localStorage.setItem('httpclient_envs_v1', JSON.stringify(envState)); } catch {}
}

function renderEnvSelect() {
  const sel = document.getElementById('env-select');
  sel.innerHTML = '<option value="">sin env</option>' +
    envState.envs.map(e => `<option value="${escA(e.name)}"${e.name===envState.active?' selected':''}>${escT(e.name)}</option>`).join('');
  const dot = document.getElementById('env-dot');
  dot.classList.toggle('on', !!envState.active);
  dot.title = envState.active ? `env: ${envState.active}` : 'sin entorno activo';
}

function selectEnv(name) { envState.active = name || null; persistEnv(); renderEnvSelect(); }

function openEnvModal() {
  envEditing = envState.active;
  renderEnvModal();
  document.getElementById('env-modal').style.display = 'flex';
}

function closeEnvModal() {
  saveEnvVars();
  document.getElementById('env-modal').style.display = 'none';
  renderEnvSelect();
}

function renderEnvModal() {
  const chips = document.getElementById('env-chips');
  chips.innerHTML = envState.envs.length
    ? envState.envs.map(e => `<button class="env-chip${e.name===envEditing?' active':''}" onclick="switchEnvEdit('${escA(e.name)}')">${escT(e.name)}</button>`).join('')
    : '<span style="color:var(--text3);font-size:12px">ningún entorno todavía</span>';
  document.getElementById('new-env-input').value = '';
  document.getElementById('del-env-btn').style.display     = envEditing ? '' : 'none';
  document.getElementById('env-add-var-btn').style.display = envEditing ? '' : 'none';
  document.getElementById('env-edit-label').textContent    = envEditing ? `variables — ${envEditing}` : 'crea un entorno para agregar variables';
  const vl = document.getElementById('env-vars-list'); vl.innerHTML = '';
  if (envEditing) {
    const e = envState.envs.find(e => e.name === envEditing);
    if (e) Object.entries(e.vars || {}).forEach(([k,v]) => addEnvVarRow(k,v));
  }
}

function addEnvVarRow(k='', v='') {
  if (!envEditing) return;
  const list = document.getElementById('env-vars-list');
  const row  = document.createElement('div'); row.className = 'field-row';
  const ki   = document.createElement('input'); ki.placeholder='NOMBRE'; ki.value=k; ki.style.textTransform='uppercase';
  ki.addEventListener('input', () => ki.value = ki.value.toUpperCase());
  const vi = document.createElement('input'); vi.placeholder='valor'; vi.value=v;
  const db = document.createElement('button'); db.className='del-btn'; db.textContent='×'; db.onclick=()=>row.remove();
  row.append(ki, vi, db); list.appendChild(row);
}

function saveEnvVars() {
  if (!envEditing) return;
  const env = envState.envs.find(e => e.name === envEditing); if (!env) return;
  const vars = {};
  document.querySelectorAll('#env-vars-list .field-row').forEach(r => {
    const [k,v] = r.querySelectorAll('input');
    if (k.value.trim()) vars[k.value.trim()] = v.value;
  });
  env.vars = vars; persistEnv();
}

function switchEnvEdit(name) { saveEnvVars(); envEditing=name; envState.active=name; persistEnv(); renderEnvModal(); }

function createEnv() {
  const inp  = document.getElementById('new-env-input');
  const name = inp.value.trim(); if (!name) { inp.focus(); return; }
  if (envState.envs.find(e => e.name===name)) { switchEnvEdit(name); inp.value=''; return; }
  saveEnvVars();
  envState.envs.push({ name, vars:{} }); envState.active=name; envEditing=name;
  persistEnv(); inp.value=''; renderEnvModal();
}

function deleteCurrentEnv() {
  if (!envEditing) return;
  envState.envs = envState.envs.filter(e => e.name !== envEditing);
  if (envState.active === envEditing) envState.active = envState.envs[0]?.name || null;
  envEditing = envState.active; persistEnv(); renderEnvModal();
}
