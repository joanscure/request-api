// Atajos de teclado
document.addEventListener('keydown', e => {
  if (e.key==='Escape') { closeSaveModal(); closeEnvModal(); closeConfirmModal(); closeRespSearch(); closeCurlModal(); closeRepeatModal(); closeTjCtxMenu(); return; }
  if (e.target.id==='save-name-input'     && e.key==='Enter') { confirmSave(); return; }
  if (e.target.id==='save-new-coll-input' && e.key==='Enter') { confirmSave(); return; }
  if (e.target.id==='new-env-input'       && e.key==='Enter') { createEnv();   return; }
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); sendRequest(); return; }
  if ((e.ctrlKey||e.metaKey) && e.key==='f')     { e.preventDefault(); openRespSearch(); return; }
  if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  if ((e.ctrlKey||e.metaKey) && e.key==='t') { e.preventDefault(); newTab(); return; }
  if ((e.ctrlKey||e.metaKey) && e.key==='w') { e.preventDefault(); closeTab(activeTabIdx, null); return; }
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveRequest(); }
});

// Auto-save: escucha cambios en todos los campos del formulario
document.getElementById('url').addEventListener('input', () => { scheduleAutoSave(); updateCurrentTabLabel(); });
document.getElementById('method').addEventListener('change', () => { scheduleAutoSave(); updateCurrentTabLabel(); });
document.getElementById('body-input').addEventListener('input', scheduleAutoSave);
document.getElementById('headers-list').addEventListener('input', scheduleAutoSave);
document.getElementById('headers-list').addEventListener('change', scheduleAutoSave);
document.getElementById('params-list').addEventListener('input', scheduleAutoSave);
document.getElementById('auth-fields').addEventListener('input', scheduleAutoSave);
// Cambio de tipo de auth (los botones corren setAuthType() via onclick primero,
// luego disparamos auto-save con setTimeout para capturar el estado ya actualizado)
document.querySelector('.auth-type-row').addEventListener('click', e => {
  if (e.target.classList.contains('atype-btn')) setTimeout(scheduleAutoSave, 0);
});

// Bootstrap
renderTabs();
renderCollTree();
renderHistory();
renderEnvSelect();
initVSplit('tj-split', 'tj-left', 'tj-right');
initVSplit('tm-split', 'tm-left', 'tm-right');
initVSplit('th-split', 'th-left', 'th-right');
initVSplit('td-split', 'td-left', 'td-right');

// Navegación con Enter/Shift+Enter en la barra de búsqueda
document.getElementById('resp-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); navRespSearch(e.shiftKey ? -1 : 1); }
});

// Cargar el primer request disponible al iniciar
if (collections.length && collections[0].requests.length) {
  loadRequest(collections[0].id, collections[0].requests[0].id);
}
