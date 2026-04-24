// editor.js v7 – remove.bg API real
(function(){

var images=[], currentIndex=0, bgColor='transparent', usageType='site', profilePreview=false;
var zoom=1, panX=0, panY=0, isPanning=false, lastMX=0, lastMY=0;

var USAGE_META={
  site:     {label:'Dimensões: livre • Formato: retangular',   circle:false},
  linkedin: {label:'Dimensões: 400×400px • Formato: circular', circle:true},
  instagram:{label:'Dimensões: 1080×1080px • Formato: circular',circle:true},
  document: {label:'Dimensões: 3×4cm • Formato: retangular',   circle:false},
};

/* ===== INIT ===== */
window.addEventListener('DOMContentLoaded',function(){
  var raw=sessionStorage.getItem('ic_images');
  if(!raw){window.location.href='index.html';return;}

  // Carrega API key salva
  var savedKey=localStorage.getItem('rbg_api_key');
  if(savedKey) document.getElementById('apiKeyInput').value=savedKey;

  images=JSON.parse(raw).map(function(img){
    return {name:img.name,data:img.data,original:img.data,processed:null};
  });

  renderBatchList();
  drawImage(images[0].original);
  if(images.length>1) document.getElementById('btnDownloadAll').style.display='block';
  initPan();
  setStatus('Imagem carregada! Clique em "✂️ Remover Fundo" para remover o fundo automaticamente.','info');
});

/* ===== REMOVE.BG API ===== */
window.removeBgCurrent=function(){
  var apiKey=document.getElementById('apiKeyInput').value.trim();
  if(!apiKey){
    setStatus('⚠️ Cole sua API Key do remove.bg no campo acima. É grátis: remove.bg/pt-br/dashboard#api-key','warning');
    return;
  }
  if(document.getElementById('saveKey').checked){
    localStorage.setItem('rbg_api_key',apiKey);
  }

  var img=images[currentIndex];
  showLoading('Removendo fundo…','Usando remove.bg com IA real');

  // Converte dataURL para Blob
  dataURLtoBlob(img.original).then(function(blob){
    var formData=new FormData();
    formData.append('image_file',blob,'image.png');
    formData.append('size','auto');

    return fetch('https://api.remove.bg/v1.0/removebg',{
      method:'POST',
      headers:{'X-Api-Key':apiKey},
      body:formData
    });
  }).then(function(response){
    if(response.status===402){
      throw new Error('Créditos esgotados. Recarregue em remove.bg/pricing');
    }
    if(response.status===403){
      throw new Error('API Key inválida. Verifique em remove.bg/dashboard#api-key');
    }
    if(!response.ok){
      throw new Error('Erro '+response.status+': '+response.statusText);
    }
    return response.blob();
  }).then(function(resultBlob){
    var url=URL.createObjectURL(resultBlob);
    img.processed=url;
    hideLoading();
    setStatus('✅ Fundo removido com sucesso!','success');
    renderBatchList();
    drawImage(img.processed);
  }).catch(function(err){
    hideLoading();
    setStatus('❌ '+err.message,'error');
  });
};

/* ===== DESENHA CANVAS ===== */
function drawImage(src){
  var canvas=document.getElementById('mainCanvas');
  var ctx=canvas.getContext('2d');
  var image=new Image();
  image.onload=function(){
    var W=canvas.parentElement.clientWidth||720;
    var H=canvas.parentElement.clientHeight||540;
    canvas.width=W; canvas.height=H;
    ctx.clearRect(0,0,W,H);
    if(bgColor!=='transparent'){ctx.fillStyle=bgColor;ctx.fillRect(0,0,W,H);}
    var base=Math.min(W/image.width,H/image.height);
    var scale=base*zoom;
    var dW=image.width*scale, dH=image.height*scale;
    var x=(W-dW)/2+panX, y=(H-dH)/2+panY;
    ctx.filter=buildFilter();
    ctx.drawImage(image,x,y,dW,dH);
    ctx.filter='none';
    applyTemperature(ctx,canvas);
  };
  image.crossOrigin='anonymous';
  image.src=src;
}

function redraw(){
  var img=images[currentIndex];
  drawImage(img.processed||img.original);
}

function buildFilter(){
  var b=document.getElementById('brightnessSlider').value;
  var c=document.getElementById('contrastSlider').value;
  var s=document.getElementById('saturationSlider').value;
  return 'brightness('+b+'%) contrast('+c+'%) saturate('+s+'%)';
}

function applyTemperature(ctx,canvas){
  var temp=parseInt(document.getElementById('tempSlider').value);
  if(temp===0) return;
  try{
    var id=ctx.getImageData(0,0,canvas.width,canvas.height);
    var d=id.data;
    for(var i=0;i<d.length;i+=4){
      d[i]=clamp(d[i]+temp*1.8);
      d[i+2]=clamp(d[i+2]-temp*1.8);
    }
    ctx.putImageData(id,0,0);
  }catch(e){}
}
function clamp(v){return Math.max(0,Math.min(255,v));}

/* ===== STATUS ===== */
function setStatus(msg,type){
  var el=document.getElementById('statusBar');
  el.style.display='block';
  el.textContent=msg;
  el.className='status-bar '+(type||'info');
}

/* ===== LOADING ===== */
function showLoading(text,sub){
  document.getElementById('loadingOverlay').classList.add('active');
  document.getElementById('loadingText').textContent=text;
  document.getElementById('loadingSub').textContent=sub||'';
  document.getElementById('progressFill').style.width='60%';
}
function hideLoading(){
  document.getElementById('progressFill').style.width='100%';
  setTimeout(function(){document.getElementById('loadingOverlay').classList.remove('active');},300);
}

/* ===== BATCH ===== */
function renderBatchList(){
  var list=document.getElementById('batchList');
  list.innerHTML='';
  images.forEach(function(img,i){
    var div=document.createElement('div');
    div.className='batch-item'+(i===currentIndex?' active':'');
    var s=img.processed?'done':'';
    var l=img.processed?'✓':'–';
    div.innerHTML='<img src="'+img.data+'"/><div class="batch-status '+s+'">'+l+'</div>';
    div.onclick=function(){switchTo(i);};
    list.appendChild(div);
  });
  document.getElementById('imageCounter').textContent=(currentIndex+1)+' / '+images.length+' imagem'+(images.length>1?'s':'');
}

function switchTo(i){
  currentIndex=i; zoom=1; panX=0; panY=0;
  document.getElementById('zoomSlider').value=100;
  document.getElementById('zoomVal').textContent=100;
  renderBatchList();
  redraw();
}
window.prevImage=function(){if(currentIndex>0) switchTo(currentIndex-1);};
window.nextImage=function(){if(currentIndex<images.length-1) switchTo(currentIndex+1);};

/* ===== PAN & ZOOM ===== */
function initPan(){
  var wrapper=document.getElementById('canvasWrapper');
  wrapper.addEventListener('mousedown', function(e){isPanning=true;lastMX=e.clientX;lastMY=e.clientY;});
  wrapper.addEventListener('touchstart',function(e){isPanning=true;lastMX=e.touches[0].clientX;lastMY=e.touches[0].clientY;},{passive:true});
  document.addEventListener('mouseup',  function(){isPanning=false;});
  document.addEventListener('touchend', function(){isPanning=false;});
  document.addEventListener('mousemove',function(e){
    if(!isPanning) return;
    panX+=e.clientX-lastMX; panY+=e.clientY-lastMY;
    lastMX=e.clientX; lastMY=e.clientY; redraw();
  });
  document.addEventListener('touchmove',function(e){
    if(!isPanning) return;
    panX+=e.touches[0].clientX-lastMX; panY+=e.touches[0].clientY-lastMY;
    lastMX=e.touches[0].clientX; lastMY=e.touches[0].clientY; redraw();
  });
  wrapper.addEventListener('wheel',function(e){
    e.preventDefault();
    zoom=Math.max(0.3,Math.min(5,zoom+(e.deltaY<0?0.1:-0.1)));
    document.getElementById('zoomSlider').value=Math.round(zoom*100);
    document.getElementById('zoomVal').textContent=Math.round(zoom*100);
    redraw();
  },{passive:false});
}
window.updateZoom=function(){
  zoom=parseInt(document.getElementById('zoomSlider').value)/100;
  document.getElementById('zoomVal').textContent=document.getElementById('zoomSlider').value;
  redraw();
};
window.resetZoom=function(){
  zoom=1;panX=0;panY=0;
  document.getElementById('zoomSlider').value=100;
  document.getElementById('zoomVal').textContent=100;
  redraw();
};

/* ===== TIPO DE USO ===== */
window.selectUsageType=function(btn){
  document.querySelectorAll('.usage-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  usageType=btn.dataset.type;
  document.getElementById('usageHint').textContent=USAGE_META[usageType].label;
  var circle=USAGE_META[usageType].circle;
  document.getElementById('btnProfile').style.display=circle?'':'none';
  if(!circle&&profilePreview) window.toggleProfilePreview();
};
window.toggleProfilePreview=function(){
  profilePreview=!profilePreview;
  document.getElementById('profileMask').style.display=profilePreview?'block':'none';
  document.getElementById('btnProfile').textContent=profilePreview?'🔲 Ocultar círculo':'👤 Preview circular';
};

/* ===== FUNDO ===== */
window.setBg=function(color,btn){
  document.querySelectorAll('.bg-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  var picker=document.getElementById('customColorPicker');
  if(color==='custom'){picker.style.display='block';bgColor=picker.value;}
  else{picker.style.display='none';bgColor=color;}
  redraw();
};
window.applyCustomColor=function(val){
  bgColor=val;
  document.getElementById('customColorThumb').style.background=val;
  redraw();
};

/* ===== FILTROS ===== */
window.updateFilter=function(){
  document.getElementById('brightnessVal').textContent=document.getElementById('brightnessSlider').value;
  document.getElementById('contrastVal').textContent=document.getElementById('contrastSlider').value;
  document.getElementById('saturationVal').textContent=document.getElementById('saturationSlider').value;
  document.getElementById('tempVal').textContent=document.getElementById('tempSlider').value;
  redraw();
};
window.resetFilters=function(){
  ['brightnessSlider','contrastSlider','saturationSlider'].forEach(function(id){document.getElementById(id).value=100;});
  document.getElementById('tempSlider').value=0;
  window.updateFilter();
};
window.autoEnhance=function(){
  document.getElementById('brightnessSlider').value=108;
  document.getElementById('contrastSlider').value=115;
  document.getElementById('saturationSlider').value=112;
  document.getElementById('tempSlider').value=6;
  window.updateFilter();
};

/* ===== DOWNLOAD ===== */
window.downloadImage=function(){
  var canvas=document.getElementById('mainCanvas');
  var a=document.createElement('a');
  a.download=images[currentIndex].name.replace(/\.[^.]+$/,'')+'_sem_fundo.png';
  a.href=canvas.toDataURL('image/png');
  a.click();
};
window.downloadAll=function(){
  if(typeof JSZip==='undefined'){alert('JSZip não carregou.');return;}
  var zip=new JSZip();
  var chain=Promise.resolve();
  images.forEach(function(img,i){
    chain=chain.then(function(){
      return new Promise(function(res){
        currentIndex=i; redraw();
        setTimeout(function(){
          var data=document.getElementById('mainCanvas').toDataURL('image/png').split(',')[1];
          zip.file(img.name.replace(/\.[^.]+$/,'')+'_sem_fundo.png',data,{base64:true});
          res();
        },350);
      });
    });
  });
  chain.then(function(){
    zip.generateAsync({type:'blob'}).then(function(blob){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='imageclear_lote.zip';
      a.click();
    });
  });
};

/* ===== UTILS ===== */
function dataURLtoBlob(dataURL){
  return new Promise(function(resolve,reject){
    if(!dataURL.startsWith('data:')){
      fetch(dataURL).then(function(r){return r.blob();}).then(resolve).catch(reject);
      return;
    }
    var parts=dataURL.split(',');
    var mime=parts[0].match(/:(.*?);/)[1];
    var raw=atob(parts[1]);
    var arr=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
    resolve(new Blob([arr],{type:mime}));
  });
}

})();
