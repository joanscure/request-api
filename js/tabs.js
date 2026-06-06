function _tabLabel(method, url) {
  if (!url || !url.trim()) return 'nuevo';
  try {
    const raw = url.trim();
    const u   = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    const path = u.pathname.length > 1 ? u.pathname : u.hostname;
    return method + ' ' + path.slice(0, 22);
  } catch {
    return method + ' ' + url.replace(/^https?:\/\//i,'').slice(0, 20);
  }
}

function captureTab() {
  const t    = tabs[activeTabIdx];
  t.method   = document.getElementById('method').value;
  t.url      = document.getElementById('url').value;
  t.headers  = getFields('headers');
  t.params   = getFields('params');
  t.body     = document.getElementById('body-input').value;
  t.auth     = getAuthState();
  t.tests    = typeof getTests === 'function' ? getTests() : [];
  t.collId   = activeCollId;
  t.reqId    = activeReqId;
  t.hasResp  = hasResp;
  t.rawBody  = rawBody;   t.prettyBody = prettyBody;
  t.isJSON   = isJSON;    t.showRaw    = showRaw;
  t.respStatusText = respStatusText; t.respCls  = respCls;
  t.respMs   = respMs;    t.respCtype  = respCtype;
  t.respSize = respSize;  t.respHeaders = respHeaders;
  t.label    = _tabLabel(t.method, t.url);
}

function applyTab(tab) {
  document.getElementById('method').value     = tab.method || 'GET';
  document.getElementById('url').value        = tab.url    || '';
  document.getElementById('body-input').value = tab.body   || '';
  document.getElementById('headers-list').innerHTML = '';
  document.getElementById('params-list').innerHTML  = '';
  Object.entries(tab.headers || {}).forEach(([k,v]) => addField('headers', k, v));
  Object.entries(tab.params  || {}).forEach(([k,v]) => addField('params',  k, v));
  loadAuthState(tab.auth);
  if (typeof loadTests === 'function') loadTests(tab.tests || []);
  activeCollId = tab.collId || null;
  activeReqId  = tab.reqId  || null;
  // restore response globals before calling showResponse
  isJSON     = tab.isJSON   || false;
  showRaw    = false;
  rawBody    = tab.rawBody  || '';
  prettyBody = tab.prettyBody || '';
  respStatusText = tab.respStatusText || '';
  respCls    = tab.respCls  || '';
  respMs     = tab.respMs   || 0;
  respCtype  = tab.respCtype  || '';
  respSize   = tab.respSize   || 0;
  respHeaders = tab.respHeaders || {};
  if (tab.hasResp) {
    showResponse(tab.prettyBody || tab.rawBody, tab.respStatusText, tab.respCls,
                 tab.respMs, tab.respCtype, tab.respSize, tab.respHeaders);
    if (tab.showRaw) toggleRaw();
  } else {
    clearResponse();
  }
}

function renderTabs() {
  const bar = document.getElementById('tabs-bar');
  if (!bar) return;
  bar.innerHTML = tabs.map((t, i) =>
    `<div class="ws-tab${i === activeTabIdx ? ' active' : ''}" onclick="switchTab(${i})">
       <span class="ws-tab-label" title="${escA(t.label)}">${escT(t.label)}</span>
       ${tabs.length > 1 ? `<span class="ws-tab-close" onclick="closeTab(${i},event)">×</span>` : ''}
     </div>`
  ).join('') + '<button class="tab-new-btn" onclick="newTab()" title="nueva pestaña (Ctrl+T)">+</button>';
}

function switchTab(idx) {
  if (idx === activeTabIdx) return;
  captureTab();
  activeTabIdx = idx;
  applyTab(tabs[activeTabIdx]);
  renderTabs();
  renderCollTree();
}

function newTab() {
  captureTab();
  tabs.push(createTabState());
  activeTabIdx = tabs.length - 1;
  applyTab(tabs[activeTabIdx]);
  renderTabs();
  renderCollTree();
  document.getElementById('url').focus();
}

function closeTab(idx, e) {
  if (e) e.stopPropagation();
  if (tabs.length === 1) return;
  const wasActive = idx === activeTabIdx;
  tabs.splice(idx, 1);
  if (wasActive) {
    activeTabIdx = Math.min(idx, tabs.length - 1);
    applyTab(tabs[activeTabIdx]);
  } else if (idx < activeTabIdx) {
    activeTabIdx--;
  }
  renderTabs();
  renderCollTree();
}

function updateCurrentTabLabel() {
  const method = document.getElementById('method').value;
  const url    = document.getElementById('url').value;
  tabs[activeTabIdx].label = _tabLabel(method, url);
  renderTabs();
}
