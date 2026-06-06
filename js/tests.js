const _TEST_OPS = {
  status: [['eq','= igual'],['neq','≠ diferente'],['gt','> mayor'],['lt','< menor']],
  body:   [['contains','contiene'],['notcontains','no contiene']],
  time:   [['lt','< menor que'],['gt','> mayor que']],
};

function getTests() {
  return Array.from(document.querySelectorAll('#tests-list .test-row')).map(row => ({
    type: row.querySelector('.test-type').value,
    op:   row.querySelector('.test-op').value,
    val:  row.querySelector('.test-val').value.trim(),
  }));
}

function loadTests(tests) {
  document.getElementById('tests-list').innerHTML = '';
  (tests || []).forEach(t => addTest(t));
}

function addTest(t = {}) {
  const row = document.createElement('div');
  row.className = 'test-row';
  const type = t.type || 'status';
  const ops  = (_TEST_OPS[type] || _TEST_OPS.status)
    .map(([v,l]) => `<option value="${v}"${v===t.op?' selected':''}>${l}</option>`).join('');
  row.innerHTML = `
    <select class="test-type field-sel" onchange="onTestTypeChange(this)">
      <option value="status"${type==='status'?' selected':''}>código</option>
      <option value="body"${type==='body'?' selected':''}>cuerpo</option>
      <option value="time"${type==='time'?' selected':''}>tiempo (ms)</option>
    </select>
    <select class="test-op field-sel">${ops}</select>
    <input class="test-val field-inp" placeholder="valor…" value="${escA(t.val||'')}" />
    <button class="del-btn" onclick="this.closest('.test-row').remove();scheduleAutoSave()">×</button>`;
  document.getElementById('tests-list').appendChild(row);
  row.querySelector('.test-type').addEventListener('change', scheduleAutoSave);
  row.querySelector('.test-op').addEventListener('change', scheduleAutoSave);
  row.querySelector('.test-val').addEventListener('input', scheduleAutoSave);
}

function onTestTypeChange(sel) {
  const type  = sel.value;
  const opEl  = sel.closest('.test-row').querySelector('.test-op');
  const ops   = _TEST_OPS[type] || _TEST_OPS.status;
  opEl.innerHTML = ops.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  scheduleAutoSave();
}

function runTests(statusCode, body, ms) {
  const tests = getTests().filter(t => t.val !== '' || t.type === 'body');
  if (!tests.length) return null;
  return tests.map(t => {
    let pass = false, actual = '';
    const num = parseFloat(t.val);
    if (t.type === 'status') {
      actual = String(statusCode);
      if (t.op === 'eq')  pass = statusCode === num;
      if (t.op === 'neq') pass = statusCode !== num;
      if (t.op === 'gt')  pass = statusCode  >  num;
      if (t.op === 'lt')  pass = statusCode  <  num;
    } else if (t.type === 'body') {
      actual = '';
      if (t.op === 'contains')    pass = body.includes(t.val);
      if (t.op === 'notcontains') pass = !body.includes(t.val);
    } else if (t.type === 'time') {
      actual = ms + 'ms';
      if (t.op === 'lt') pass = ms < num;
      if (t.op === 'gt') pass = ms > num;
    }
    return { ...t, pass, actual };
  });
}

function showTestResults(results) {
  const el  = document.getElementById('resp-tests-list');
  const tab = document.getElementById('rtab-tests');
  if (!results || !results.length) {
    el.innerHTML = '<div class="empty-state">sin assertions — definí tests en la pestaña "tests"</div>';
    if (tab) { tab.textContent = 'tests'; tab.style.color = ''; }
    return;
  }
  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;
  const allOk  = failed === 0;
  if (tab) {
    tab.textContent = allOk ? `tests ✓` : `tests (${failed} ✗)`;
    tab.style.color = allOk ? 'var(--green)' : 'var(--red)';
  }
  const opLabel = (type, op) => (_TEST_OPS[type]||[]).find(([v])=>v===op)?.[1] || op;
  const desc = r => {
    if (r.type === 'status') return `código ${opLabel(r.type,r.op)} ${r.val}${r.actual?' (fue '+r.actual+')':''}`;
    if (r.type === 'body')   return `cuerpo ${opLabel(r.type,r.op)} "${r.val}"`;
    if (r.type === 'time')   return `tiempo ${opLabel(r.type,r.op)} ${r.val}ms${r.actual?' (fue '+r.actual+')':''}`;
    return '';
  };
  el.innerHTML =
    `<div class="test-summary ${allOk?'test-pass-sum':'test-fail-sum'}">${passed} pasados · ${failed} fallidos</div>` +
    results.map(r =>
      `<div class="test-result-row ${r.pass?'test-pass':'test-fail'}">
         <span class="test-icon">${r.pass?'✓':'✗'}</span>
         <span class="test-desc">${escT(desc(r))}</span>
       </div>`
    ).join('');
}
