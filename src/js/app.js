(function(){
  var uploadArea = document.getElementById('uploadArea');
  var fileInput  = document.getElementById('fileInput');
  uploadArea.addEventListener('dragover',  function(e){e.preventDefault();uploadArea.classList.add('drag-over');});
  uploadArea.addEventListener('dragleave', function(){uploadArea.classList.remove('drag-over');});
  uploadArea.addEventListener('drop',      function(e){e.preventDefault();uploadArea.classList.remove('drag-over');handleFiles(e.dataTransfer.files);});
  fileInput.addEventListener('change',     function(){handleFiles(fileInput.files);});
  document.addEventListener('paste', function(e){
    var files=[];
    var items=e.clipboardData?e.clipboardData.items:[];
    for(var i=0;i<items.length;i++) if(items[i].kind==='file'&&items[i].type.startsWith('image/')) files.push(items[i].getAsFile());
    if(files.length) handleFiles(files);
  });
  function handleFiles(files){
    var arr=Array.from(files).filter(function(f){return f.type.startsWith('image/');}).slice(0,100);
    if(!arr.length){alert('Nenhuma imagem válida.');return;}
    var promises=arr.map(function(f){
      return new Promise(function(res){
        var r=new FileReader();
        r.onload=function(){res({name:f.name,data:r.result});};
        r.readAsDataURL(f);
      });
    });
    Promise.all(promises).then(function(imgs){
      sessionStorage.setItem('ic_images',JSON.stringify(imgs));
      window.location.href='editor.html';
    });
  }
})();
