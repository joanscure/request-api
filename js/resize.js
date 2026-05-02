(function () {
  const handle = document.getElementById('resize-handle');
  const pane   = document.getElementById('response-pane');
  const saved  = localStorage.getItem('httpclient_resp_h');
  pane.style.height = (saved ? +saved : Math.round(window.innerHeight * 0.4)) + 'px';

  let dragging=false, startY=0, startH=0;

  handle.addEventListener('mousedown', e => {
    dragging=true; startY=e.clientY; startH=pane.offsetHeight;
    handle.classList.add('dragging'); document.body.classList.add('resizing'); e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    pane.style.height = Math.max(80, Math.min(window.innerHeight-180, startH+(startY-e.clientY))) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return; dragging=false;
    handle.classList.remove('dragging'); document.body.classList.remove('resizing');
    localStorage.setItem('httpclient_resp_h', pane.offsetHeight);
  });
})();
