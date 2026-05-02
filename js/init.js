// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key==='Escape') { closeSaveModal(); closeEnvModal(); closeConfirmModal(); return; }
  if (e.target.id==='save-name-input'     && e.key==='Enter') { confirmSave(); return; }
  if (e.target.id==='save-new-coll-input' && e.key==='Enter') { confirmSave(); return; }
  if (e.target.id==='new-env-input'       && e.key==='Enter') { createEnv();   return; }
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); sendRequest(); return; }
  if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveRequest(); }
});

// Bootstrap
addField('headers', 'Accept', 'application/json');
renderCollTree();
renderHistory();
renderEnvSelect();
initVSplit('tj-split', 'tj-left', 'tj-right');
initVSplit('tm-split', 'tm-left', 'tm-right');
initVSplit('th-split', 'th-left', 'th-right');
