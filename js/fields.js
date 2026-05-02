function showTab(name) {
  const names = ['headers','params','body','auth'];
  names.forEach(t => document.getElementById('tab-'+t).classList.toggle('hidden', t !== name));
  document.querySelectorAll('.tab').forEach((el,i) => el.classList.toggle('active', names[i] === name));
}

function showSbTab(name) {
  _sidebarTab = name;
  document.getElementById('sb-coll').classList.toggle('hidden', name !== 'coll');
  document.getElementById('sb-hist').classList.toggle('hidden', name !== 'hist');
  document.getElementById('sbt-coll').classList.toggle('active', name === 'coll');
  document.getElementById('sbt-hist').classList.toggle('active', name === 'hist');
}

function addField(type, key='', val='') {
  const list = document.getElementById(type+'-list');
  const row  = document.createElement('div');
  row.className = 'field-row';
  const ki = document.createElement('input'); ki.placeholder='nombre'; ki.value=key;
  const vi = document.createElement('input'); vi.placeholder='valor';  vi.value=val;
  if (type === 'headers') {
    ki.setAttribute('list','header-names');
    const sync = () => vi.setAttribute('list', ki.value.trim().toLowerCase()==='content-type'?'content-type-values':'');
    ki.addEventListener('change', sync);
    if (key.toLowerCase()==='content-type') vi.setAttribute('list','content-type-values');
  }
  const db = document.createElement('button'); db.className='del-btn'; db.textContent='×'; db.onclick=()=>row.remove();
  row.append(ki, vi, db); list.appendChild(row);
}

function getFields(type) {
  const obj = {};
  document.querySelectorAll('#'+type+'-list .field-row').forEach(r => {
    const [k,v] = r.querySelectorAll('input');
    if (k.value.trim()) obj[k.value.trim()] = v.value;
  });
  return obj;
}
