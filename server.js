const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml'
};

/* El recorrido por la sede se ve buscando dentro del metraje segun el
   scroll. Para eso el navegador pide trozos sueltos del MP4 con una
   cabecera Range, y un servidor que responda siempre el archivo entero
   con un 200 deja el video sin poder rebobinar: `video.seekable` queda
   en [0,0], la busqueda no se aplica y la pagina cae al respaldo de
   fotografias. En produccion (Netlify) esto ya funciona; aqui hacia
   falta para que la vista previa se comporte igual que el sitio. */
function servir(req, res) {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';

  const filePath = path.join(DIR, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
      return;
    }

    const tipo = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const rango = req.headers.range;

    if (rango) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(rango.trim());
      if (m) {
        let ini = m[1] === '' ? null : parseInt(m[1], 10);
        let fin = m[2] === '' ? null : parseInt(m[2], 10);

        if (ini === null && fin !== null) {          // bytes=-500 (la cola)
          ini = Math.max(0, st.size - fin);
          fin = st.size - 1;
        } else {
          if (ini === null) ini = 0;
          if (fin === null || fin >= st.size) fin = st.size - 1;
        }

        if (ini > fin || ini >= st.size) {
          res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }).end();
          return;
        }

        res.writeHead(206, {
          'Content-Type': tipo,
          'Content-Length': fin - ini + 1,
          'Content-Range': 'bytes ' + ini + '-' + fin + '/' + st.size,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filePath, { start: ini, end: fin }).pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      'Content-Type': tipo,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

http.createServer(servir).listen(PORT, () => {
  console.log('Serving on http://localhost:' + PORT);
});
