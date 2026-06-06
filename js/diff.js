let _diffTimer = null;

function diffInputChanged() {
  clearTimeout(_diffTimer);
  _diffTimer = setTimeout(_runDiff, 200);
}

function _runDiff() {
  const a   = document.getElementById('td-left-input').value;
  const b   = document.getElementById('td-right-input').value;
  const out = document.getElementById('td-out');
  if (!a.trim() && !b.trim()) {
    out.innerHTML = '<span style="color:var(--text3)">pegá dos JSONs o textos para comparar…</span>';
    return;
  }
  const linesA = _diffNormalize(a);
  const linesB = _diffNormalize(b);
  const diff   = _lcs(linesA, linesB);
  _renderDiff(out, diff);
}

function _diffNormalize(text) {
  try { return JSON.stringify(JSON.parse(text.trim()), null, 2).split('\n'); }
  catch { return text.split('\n'); }
}

function _lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
      result.push({ type: 'eq', val: a[i-1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.push({ type: 'add', val: b[j-1] }); j--;
    } else {
      result.push({ type: 'del', val: a[i-1] }); i--;
    }
  }
  return result.reverse();
}

function _renderDiff(out, diff) {
  const changed = diff.filter(d => d.type !== 'eq');
  if (!changed.length) {
    out.innerHTML = '<div class="diff-same">✓ sin diferencias — los textos son iguales</div>';
    return;
  }
  let html = '';
  diff.forEach(d => {
    const cls = d.type === 'add' ? 'diff-add' : d.type === 'del' ? 'diff-del' : 'diff-eq';
    const pfx = d.type === 'add' ? '+ ' : d.type === 'del' ? '- ' : '  ';
    html += `<div class="${cls}">${escT(pfx + d.val)}</div>`;
  });
  out.innerHTML = `<pre class="diff-pre">${html}</pre>`;
}

function useResponseForDiff(side) {
  const text = (typeof prettyBody !== 'undefined' && prettyBody) || (typeof rawBody !== 'undefined' && rawBody) || '';
  const id   = side === 'left' ? 'td-left-input' : 'td-right-input';
  document.getElementById(id).value = text;
  diffInputChanged();
}

function clearDiff() {
  document.getElementById('td-left-input').value  = '';
  document.getElementById('td-right-input').value = '';
  const out = document.getElementById('td-out');
  out.innerHTML = '<span style="color:var(--text3)">pegá dos JSONs o textos para comparar…</span>';
}
