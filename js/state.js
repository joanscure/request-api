// collections = [{id, name, open, requests:[{id,name,method,url,headers,params,body,auth}]}]
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
    persist();
  }
})();

function persist() {
  try { localStorage.setItem('httpclient_v2', JSON.stringify(collections)); } catch {}
}

function showConfirm(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  _confirmCb = cb;
  document.getElementById('confirm-modal').style.display = 'flex';
}
function closeConfirmModal() { document.getElementById('confirm-modal').style.display = 'none'; _confirmCb = null; }
function execConfirm() { if (_confirmCb) _confirmCb(); closeConfirmModal(); }
