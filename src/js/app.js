// src/js/app.js
const uploadArea = document.getElementById('uploadArea');
const fileInput  = document.getElementById('fileInput');

uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop',      e => { e.preventDefault(); uploadArea.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change',     () => handleFiles(fileInput.files));

document.addEventListener('paste', e => {
  const files = [];
  for (const item of (e.clipboardData?.items || []))
    if (item.kind === 'file' && item.type.startsWith('image/')) files.push(item.getAsFile());
  if (files.length) handleFiles(files);
});

function handleFiles(files) {
  const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 100);
  if (!arr.length) { alert('Nenhuma imagem válida encontrada.'); return; }
  Promise.all(arr.map(f => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res({ name: f.name, data: r.result });
    r.readAsDataURL(f);
  }))).then(imgs => {
    sessionStorage.setItem('ic_images', JSON.stringify(imgs));
    window.location.href = 'editor.html';
  });
}

function loadFromUrl() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return;
  sessionStorage.setItem('ic_images', JSON.stringify([{ name: 'imagem.png', data: url }]));
  window.location.href = 'editor.html';
}
