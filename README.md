# ImageClear v5

## Estrutura
```
project/
├── src/
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       └── editor.js
├── editor.html
├── index.html
├── netlify.toml
└── README.md
```

## Como rodar localmente
```bash
python -m http.server 5500
# Acesse http://localhost:5500
```
A imagem aparece imediatamente. A IA de remoção de fundo requer servidor HTTP (não funciona com file://).

## Deploy
Conecte o repositório ao Netlify. O netlify.toml já está configurado.
