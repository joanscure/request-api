function genId() { return Math.random().toString(36).slice(2, 10); }
function escT(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escA(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'ahora';
  if (d < 3600000)  return Math.round(d/60000)+'min';
  if (d < 86400000) return Math.round(d/3600000)+'h';
  return Math.round(d/86400000)+'d';
}

function fmtSize(n) {
  if (n<1024)    return n+' B';
  if (n<1048576) return (n/1024).toFixed(1)+' KB';
  return (n/1048576).toFixed(2)+' MB';
}

function shortUrl(url) {
  try { const u = new URL(url); return u.hostname + u.pathname; } catch { return url.slice(0,40); }
}
