function setAuthType(type) {
  _authType = type;
  document.querySelectorAll('.atype-btn').forEach(b => b.classList.toggle('active', b.dataset.type===type));
  const el = document.getElementById('auth-fields'); el.innerHTML = '';
  if (type==='bearer') {
    el.innerHTML = `<div class="auth-field"><label>token</label><input id="auth-token" placeholder="eyJhbGci…" oninput="refreshAuthPreview()"></div>`;
  } else if (type==='basic') {
    el.innerHTML = `<div class="auth-field"><label>usuario</label><input id="auth-user" placeholder="usuario" oninput="refreshAuthPreview()"></div>
                    <div class="auth-field"><label>contraseña</label><input id="auth-pass" type="password" placeholder="contraseña" oninput="refreshAuthPreview()"></div>`;
  } else if (type==='apikey') {
    el.innerHTML = `<div class="auth-field"><label>header</label><input id="auth-key-name" value="X-API-Key" oninput="refreshAuthPreview()"></div>
                    <div class="auth-field"><label>valor</label><input id="auth-key-val" placeholder="tu-key-aquí" oninput="refreshAuthPreview()"></div>`;
  }
  refreshAuthPreview();
}

function refreshAuthPreview() {
  const h = getAuthHeaders();
  const entries = Object.entries(h);
  const pv = document.getElementById('auth-preview');
  if (entries.length) {
    pv.style.display = '';
    document.getElementById('auth-preview-val').textContent = entries.map(([k,v]) => `${k}: ${v}`).join('\n');
  } else {
    pv.style.display = 'none';
  }
}

function getAuthHeaders() {
  if (_authType==='bearer') {
    const t = document.getElementById('auth-token')?.value.trim();
    if (t) return { Authorization: 'Bearer '+t };
  } else if (_authType==='basic') {
    const u = document.getElementById('auth-user')?.value || '';
    const p = document.getElementById('auth-pass')?.value || '';
    if (u) return { Authorization: 'Basic '+btoa(unescape(encodeURIComponent(u+':'+p))) };
  } else if (_authType==='apikey') {
    const n = document.getElementById('auth-key-name')?.value.trim() || 'X-API-Key';
    const v = document.getElementById('auth-key-val')?.value.trim();
    if (v) return { [n]: v };
  }
  return {};
}

function getAuthState() {
  return {
    type:    _authType,
    token:   document.getElementById('auth-token')?.value    || '',
    user:    document.getElementById('auth-user')?.value     || '',
    pass:    document.getElementById('auth-pass')?.value     || '',
    keyName: document.getElementById('auth-key-name')?.value || 'X-API-Key',
    keyVal:  document.getElementById('auth-key-val')?.value  || '',
  };
}

function loadAuthState(auth) {
  const type = auth?.type || 'none';
  setAuthType(type);
  if (type==='bearer' && auth?.token)  document.getElementById('auth-token').value = auth.token;
  if (type==='basic') {
    if (auth?.user) document.getElementById('auth-user').value = auth.user;
    if (auth?.pass) document.getElementById('auth-pass').value = auth.pass;
  }
  if (type==='apikey') {
    if (auth?.keyName) document.getElementById('auth-key-name').value = auth.keyName;
    if (auth?.keyVal)  document.getElementById('auth-key-val').value  = auth.keyVal;
  }
  refreshAuthPreview();
}
