// collections = [{id, name, open, requests:[{id,name,method,url,headers,params,body,auth,tests}]}]
let collections   = [];
let activeCollId  = null;
let activeReqId   = null;

// history = [{id,ts,method,url,status,statusText,cls,ctype,ms,size,body,prettyBody,isJSON,respHeaders}]
let reqHistory    = [];
let activeHistIdx = -1;

let _sidebarTab = 'coll';
let hasResp     = false;
let rawBody     = '';
let prettyBody  = '';
let isJSON      = false;
let showRaw     = false;
// response display state (for tab persistence)
let respStatusText = '';
let respCls        = '';
let respMs         = 0;
let respCtype      = '';
let respSize       = 0;
let respHeaders    = {};
let _authType   = 'none';
let _confirmCb  = null;

let envState   = { envs: [], active: null };
let envEditing = null;

try { collections = JSON.parse(localStorage.getItem('httpclient_v2') || '[]'); }             catch {}
try { reqHistory  = JSON.parse(localStorage.getItem('httpclient_hist_v1') || '[]'); }        catch {}
try { envState    = JSON.parse(localStorage.getItem('httpclient_envs_v1') || '{"envs":[],"active":null}'); } catch {}

(function migrateV1() {
  if (localStorage.getItem('httpclient_v2') !== null) return;
  const old = localStorage.getItem('httpclient_v1');
  if (old) {
    try {
      const reqs = JSON.parse(old);
      if (reqs.length) {
        collections.push({ id: genId(), name: 'General', open: true,
          requests: reqs.map(r => ({ id: genId(), ...r })) });
        persist();
      }
    } catch {}
  } else {
    // Primera ejecución: colección General con un request vacío por defecto
    const firstReq = { id: genId(), name: 'nuevo request', method: 'GET', url: '', headers: { Accept: 'application/json' }, params: {}, body: '', auth: { type: 'none' } };
    collections.push({ id: genId(), name: 'General', open: true, requests: [firstReq] });
    persist();
  }
})();

function persist() {
  try { localStorage.setItem('httpclient_v2', JSON.stringify(collections)); } catch {}
}

// Tabs
function createTabState() {
  return {
    id: genId(), label: 'nuevo',
    method: 'GET', url: '',
    headers: { Accept: 'application/json' },
    params: {}, body: '',
    auth: { type: 'none' },
    tests: [],
    collId: null, reqId: null,
    hasResp: false,
    rawBody: '', prettyBody: '', isJSON: false, showRaw: false,
    respStatusText: '', respCls: '', respMs: 0,
    respCtype: '', respSize: 0, respHeaders: {}
  };
}
let tabs         = [createTabState()];
let activeTabIdx = 0;

function showConfirm(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  _confirmCb = cb;
  document.getElementById('confirm-modal').style.display = 'flex';
}
function closeConfirmModal() { document.getElementById('confirm-modal').style.display = 'none'; _confirmCb = null; }
function execConfirm() { if (_confirmCb) _confirmCb(); closeConfirmModal(); }
