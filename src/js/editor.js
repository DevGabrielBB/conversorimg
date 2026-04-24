// src/js/editor.js – v4 – remoção 100% client-side
import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.browser.mjs';

// ---------- STATE ----------
let images = [], currentIndex = 0;
let bgColor = 'transparent', usageType = 'site';
let baMode = true, profilePreview = false;
let zoom = 1, panX = 0, panY = 0;
let isDraggingSlider = false, isPanning = false;
let lastMX = 0, lastMY = 0;

const USAGE_META = {
  site:      { label: 'Dimensões: livre • Formato: retangular',     circle: false },
  linkedin:  { label: 'Dimensões: 400×400px • Formato: circular',   circle: true  },
  instagram: { label: 'Dimensões: 1080×1080px • Formato: circular', circle: true  },
  document:  { label: 'Dimensões: 3×4cm • Formato: retangular',     circle: false },
};

// ---------- INIT ----------
window.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('ic_images');
  if (!raw) { window.location.href = 'index.html'; return; }
  images = JSON.parse(raw).map(img => ({ name: img.name, data: img.data, original: img.data, processed: null }));
  renderBatchList();
  processImage(0);
  if (images.length > 1) document.getElementById('btnDownloadAll').style.display = 'block';
  initPan();
});

// ---------- LOADING ----------
function showLoading(text, pct, sub = '') {
  document.getElementById('loadingOverlay').classList.add('active');
  document.getElementById('loadingText').textContent  = text;
  document.getElementById('loadingSub').textContent   = sub;
  document.getElementById('progressFill').style.width = pct + '%';
}
function hideLoading() {
  document.getElementById('progressFill').style.width = '100%';
  setTimeout(() => document.getElementById('loadingOverlay').classList.remove('active'), 300);
}

// ---------- BATCH ----------
function renderBatchList() {
  const list = document.getElementById('batchList');
  list.innerHTML = '';
  images.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'batch-item' + (i === currentIndex ? ' active' : '');
    const s = img.processed ? 'done' : (i === currentIndex ? 'processing' : '');
    const l = img.processed ? '✓'   : (i === currentIndex ? '…'          : '–');
    div.innerHTML = `<img src="${img.data}" /><div class="batch-status ${s}">${l}</div>`;
    div.onclick = () => switchTo(i);
    list.appendChild(div);
  });
  document.getElementById('imageCounter').textContent =
    `${currentIndex + 1} / ${images.length} imagem${images.length > 1 ? 's' : ''}`;
}

function switchTo(i) {
  currentIndex = i; zoom = 1; panX = 0; panY = 0;
  document.getElementById('zoomSlider').value = 100;
  document.getElementById('zoomVal').textContent = 100;
  renderBatchList();
  images[i].processed ? drawCanvases() : processImage(i);
}
window.prevImage = () => { if (currentIndex > 0) switchTo(currentIndex - 1); };
window.nextImage = () => { if (currentIndex < images.length - 1) switchTo(currentIndex + 1); };

// ---------- REMOVE BACKGROUND ----------
async function processImage(index) {
  const img = images[index];
  showLoading('Carregando modelo de IA…', 15, 'Apenas na primeira vez, depois fica em cache');
  try {
    const blob = await dataURLtoBlob(img.data);
    showLoading('Removendo fundo…', 45, 'Processando localmente no seu navegador');
    const resultBlob = await removeBackground(blob, {
      publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/',
      progress: (key, current, total) => {
        const pct = total > 0 ? Math.round(45 + (current / total) * 45) : 70;
        document.getElementById('progressFill').style.width = pct + '%';
      }
    });
    img.processed = URL.createObjectURL(resultBlob);
    showLoading('Concluído!', 100, '');
    await delay(400);
    hideLoading();
    renderBatchList();
    drawCanvases();
  } catch (e) {
    console.error('Erro ao remover fundo:', e);
    img.processed = img.data;
    hideLoading();
    renderBatchList();
    drawCanvases();
    alert('Não foi possível remover o fundo.\nUse o servidor local: python -m http.server 5500\nOu faça deploy no Netlify.');
  }
}

window.reprocessCurrent = () => { images[currentIndex].processed = null; processImage(currentIndex); };

// ---------- DRAW CANVAS ----------
function drawCanvases() {
  const img = images[currentIndex];
  drawOnCanvas('canvasBefore', img.original,                bgColor === 'transparent' ? 'transparent' : bgColor);
  drawOnCanvas('canvasAfter',  img.processed || img.original, bgColor);
}

// O "Antes" sempre mostra a original SEM fundo aplicado (transparente)
function drawOnCanvas(id, src, bg) {
  const canvas = document.getElementById(id);
  const ctx    = canvas.getContext('2d');
  const image  = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    const W = canvas.parentElement.clientWidth  || 680;
    const H = canvas.parentElement.clientHeight || 510;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
    const base  = Math.min(W / image.width, H / image.height);
    const scale = base * zoom;
    const dW = image.width * scale, dH = image.height * scale;
    const x  = (W - dW) / 2 + panX, y = (H - dH) / 2 + panY;
    ctx.filter = buildFilter();
    ctx.drawImage(image, x, y, dW, dH);
    ctx.filter = 'none';
    applyTemperature(ctx, canvas);
  };
  image.src = src;
}

function buildFilter() {
  const b = document.getElementById('brightnessSlider').value;
  const c = document.getElementById('contrastSlider').value;
  const s = document.getElementById('saturationSlider').value;
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
}
function applyTemperature(ctx, canvas) {
  const temp = parseInt(document.getElementById('tempSlider').value);
  if (temp === 0) return;
  try {
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = clamp(d[i]   + temp * 1.8);
      d[i+2] = clamp(d[i+2] - temp * 1.8);
    }
    ctx.putImageData(id, 0, 0);
  } catch(e) {}
}
function clamp(v) { return Math.max(0, Math.min(255, v)); }

// ---------- BA SLIDER ----------
const baSlider = document.getElementById('baSlider');
baSlider.addEventListener('mousedown',  e => { isDraggingSlider = true; e.stopPropagation(); });
baSlider.addEventListener('touchstart', e => { isDraggingSlider = true; e.stopPropagation(); }, { passive: true });
document.addEventListener('mouseup',    () => isDraggingSlider = false);
document.addEventListener('touchend',   () => isDraggingSlider = false);
document.addEventListener('mousemove',  e => { if (isDraggingSlider) moveSlider(e.clientX); });
document.addEventListener('touchmove',  e => { if (isDraggingSlider) moveSlider(e.touches[0].clientX); });

function moveSlider(clientX) {
  const rect = document.getElementById('canvasWrapper').getBoundingClientRect();
  let pct = ((clientX - rect.left) / rect.width) * 100;
  pct = Math.max(2, Math.min(98, pct));
  baSlider.style.left = pct + '%';
  document.getElementById('canvasAfter').style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
}

window.toggleBeforeAfter = () => {
  baMode = !baMode;
  const after  = document.getElementById('canvasAfter');
  const before = document.getElementById('canvasBefore');
  baSlider.style.display = baMode ? '' : 'none';
  document.querySelector('.ba-label-left').style.display  = baMode ? '' : 'none';
  document.querySelector('.ba-label-right').style.display = baMode ? '' : 'none';
  if (baMode) { after.style.clipPath = 'inset(0 50% 0 0)'; baSlider.style.left = '50%'; before.style.display = ''; }
  else        { after.style.clipPath = 'none'; before.style.display = 'none'; }
  document.getElementById('btnToggleBA').textContent = baMode ? '👁️ Antes/Depois' : '↔️ Só depois';
};

// ---------- PAN & ZOOM ----------
function initPan() {
  const wrapper = document.getElementById('canvasWrapper');
  wrapper.addEventListener('mousedown',  e => { if (!isDraggingSlider) { isPanning = true; lastMX = e.clientX; lastMY = e.clientY; }});
  wrapper.addEventListener('touchstart', e => { isPanning = true; lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('mouseup',   () => isPanning = false);
  document.addEventListener('touchend',  () => isPanning = false);
  document.addEventListener('mousemove', e => {
    if (!isPanning || isDraggingSlider) return;
    panX += e.clientX - lastMX; panY += e.clientY - lastMY;
    lastMX = e.clientX; lastMY = e.clientY; drawCanvases();
  });
  document.addEventListener('touchmove', e => {
    if (!isPanning) return;
    panX += e.touches[0].clientX - lastMX; panY += e.touches[0].clientY - lastMY;
    lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; drawCanvases();
  });
  wrapper.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.max(0.3, Math.min(5, zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
    document.getElementById('zoomSlider').value = Math.round(zoom * 100);
    document.getElementById('zoomVal').textContent = Math.round(zoom * 100);
    drawCanvases();
  }, { passive: false });
}

window.updateZoom = () => {
  zoom = parseInt(document.getElementById('zoomSlider').value) / 100;
  document.getElementById('zoomVal').textContent = document.getElementById('zoomSlider').value;
  drawCanvases();
};
window.resetZoom = () => {
  zoom = 1; panX = 0; panY = 0;
  document.getElementById('zoomSlider').value = 100;
  document.getElementById('zoomVal').textContent = 100;
  drawCanvases();
};

// ---------- USAGE TYPE ----------
window.selectUsageType = btn => {
  document.querySelectorAll('.usage-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  usageType = btn.dataset.type;
  document.getElementById('usageHint').textContent = USAGE_META[usageType].label;
  const circle = USAGE_META[usageType].circle;
  document.getElementById('btnProfile').style.display = circle ? '' : 'none';
  if (!circle && profilePreview) window.toggleProfilePreview();
};

window.toggleProfilePreview = () => {
  profilePreview = !profilePreview;
  document.getElementById('profileMask').style.display = profilePreview ? 'block' : 'none';
  document.getElementById('btnProfile').textContent = profilePreview ? '🔲 Ocultar círculo' : '👤 Preview perfil';
};

// ---------- BACKGROUND ----------
window.setBg = (color, btn) => {
  document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const picker = document.getElementById('customColorPicker');
  if (color === 'custom') { picker.style.display = 'block'; bgColor = picker.value; }
  else { picker.style.display = 'none'; bgColor = color; }
  drawCanvases();
};
window.applyCustomColor = val => {
  bgColor = val;
  document.getElementById('customColorThumb').style.background = val;
  drawCanvases();
};

// ---------- FILTERS ----------
window.updateFilter = () => {
  document.getElementById('brightnessVal').textContent = document.getElementById('brightnessSlider').value;
  document.getElementById('contrastVal').textContent   = document.getElementById('contrastSlider').value;
  document.getElementById('saturationVal').textContent = document.getElementById('saturationSlider').value;
  document.getElementById('tempVal').textContent       = document.getElementById('tempSlider').value;
  document.getElementById('sharpVal').textContent      = document.getElementById('sharpSlider').value;
  drawCanvases();
};
window.resetFilters = () => {
  ['brightnessSlider','contrastSlider','saturationSlider'].forEach(id => document.getElementById(id).value = 100);
  document.getElementById('tempSlider').value = 0;
  document.getElementById('sharpSlider').value = 0;
  window.updateFilter();
};
window.autoEnhance = () => {
  document.getElementById('brightnessSlider').value = 108;
  document.getElementById('contrastSlider').value   = 115;
  document.getElementById('saturationSlider').value = 112;
  document.getElementById('tempSlider').value       = 6;
  document.getElementById('sharpSlider').value      = 3;
  window.updateFilter();
};

// ---------- DOWNLOAD ----------
window.downloadImage = () => {
  const canvas = document.getElementById('canvasAfter');
  const prev   = canvas.style.clipPath;
  canvas.style.clipPath = 'none';
  setTimeout(() => {
    const a = document.createElement('a');
    a.download = images[currentIndex].name.replace(/\.[^.]+$/, '') + '_sem_fundo.png';
    a.href     = canvas.toDataURL('image/png');
    a.click();
    if (baMode) canvas.style.clipPath = prev;
  }, 120);
};
window.downloadAll = async () => {
  if (typeof JSZip === 'undefined') { alert('JSZip não carregou.'); return; }
  const zip  = new JSZip();
  const prev = document.getElementById('canvasAfter').style.clipPath;
  document.getElementById('canvasAfter').style.clipPath = 'none';
  for (let i = 0; i < images.length; i++) {
    if (!images[i].processed) continue;
    currentIndex = i; drawCanvases(); await delay(250);
    const data = document.getElementById('canvasAfter').toDataURL('image/png').split(',')[1];
    zip.file(images[i].name.replace(/\.[^.]+$/, '') + '_sem_fundo.png', data, { base64: true });
  }
  if (baMode) document.getElementById('canvasAfter').style.clipPath = prev;
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'imageclear_lote.zip'; a.click();
};

// ---------- UTILS ----------
async function dataURLtoBlob(dataURL) {
  if (!dataURL.startsWith('data:')) { const res = await fetch(dataURL); return res.blob(); }
  const [header, data] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
