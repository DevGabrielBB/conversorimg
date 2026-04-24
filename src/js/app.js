// src/js/app.js
(function () {
  var uploadArea = document.getElementById('uploadArea');
  var fileInput  = document.getElementById('fileInput');

  uploadArea.addEventListener('dragover',  function(e){ e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea.addEventListener('dragleave', function(){ uploadArea.classList.remove('drag-over'); });
  uploadArea.addEventListener('drop', function(e){
    e.preventDefault(); uploadArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', function(){ handleFiles(fileInput.files); });

  document.addEventListener('paste', function(e) {
    var files = [];
    var items = e.clipboardData ? e.clipboardData.items : [];
    for (var i = 0; i < items.length; i++)
      if (items[i].kind === 'file' && items[i].type.startsWith('image/'))
        files.push(items[i].getAsFile());
    if (files.length) handleFiles(files);
  });

  function handleFiles(files) {
    var arr = Array.from(files).filter(function(f){ return f.type.startsWith('image/'); }).slice(0, 100);
    if (!arr.length) { alert('Nenhuma imagem válida encontrada.'); return; }
    var promises = arr.map(function(f){
      return new Promise(function(res){
        var r = new FileReader();
        r.onload = function(){ res({ name: f.name, data: r.result }); };
        r.readAsDataURL(f);
      });
    });
    Promise.all(promises).then(function(imgs){
      sessionStorage.setItem('ic_images', JSON.stringify(imgs));
      window.location.href = 'editor.html';
    });
  }

  window.loadFromUrl = function() {
    var url = document.getElementById('urlInput').value.trim();
    if (!url) return;
    sessionStorage.setItem('ic_images', JSON.stringify([{ name: 'imagem.png', data: url }]));
    window.location.href = 'editor.html';
  };

  // Slider demo na página inicial
  var demoSliding = false;
  var demoSlider  = document.getElementById('demoSlider');
  var demoAfter   = document.getElementById('demoAfter');
  var demoContainer = document.getElementById('demoContainer');
  if (demoSlider) {
    demoSlider.addEventListener('mousedown',  function(){ demoSliding = true; });
    demoSlider.addEventListener('touchstart', function(){ demoSliding = true; }, { passive: true });
    document.addEventListener('mouseup',  function(){ demoSliding = false; });
    document.addEventListener('touchend', function(){ demoSliding = false; });
    document.addEventListener('mousemove', function(e){ if (demoSliding) moveDemoSlider(e.clientX); });
    document.addEventListener('touchmove', function(e){ if (demoSliding) moveDemoSlider(e.touches[0].clientX); });
  }
  function moveDemoSlider(clientX) {
    var rect = demoContainer.getBoundingClientRect();
    var pct  = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(2, Math.min(98, pct));
    demoSlider.style.left  = pct + '%';
    demoAfter.style.width  = pct + '%';
  }
})();
