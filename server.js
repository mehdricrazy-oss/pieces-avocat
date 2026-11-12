/**
 * Serveur local HTTPS & HTTP pour l'Add-in Word
 * Génère automatiquement un certificat SSL local pour Word Online
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import selfsigned from 'selfsigned';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT_HTTPS = 3000; // Doit être 3000 car spécifié dans manifest.xml
const PORT_HTTP = 3001;

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.ts': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.xml': 'application/xml; charset=UTF-8',
    '.ico': 'image/x-icon'
};

// 1. Gestion des certificats SSL auto-signés pour HTTPS
const certDir = path.join(__dirname, 'certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');

if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

let sslOptions;
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('🔐 Génération du certificat SSL pour https://localhost:3000 ...');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = await selfsigned.generate(attrs, { days: 365 });
    fs.writeFileSync(certPath, pems.cert);
    fs.writeFileSync(keyPath, pems.private);
    sslOptions = { cert: pems.cert, key: pems.private };
} else {
    sslOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
    };
}

// 2. Gestionnaire des requêtes HTTP/HTTPS
function requestHandler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') {
        reqPath = '/src/taskpane/taskpane.html';
    } else if (reqPath === '/taskpane.html') {
        reqPath = '/src/taskpane/taskpane.html';
    } else if (reqPath === '/taskpane.js') {
        reqPath = '/src/taskpane/taskpane.js';
    } else if (reqPath === '/taskpane.css') {
        reqPath = '/src/taskpane/taskpane.css';
    }

    const filePath = path.join(__dirname, reqPath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
            res.end(`404 Not Found: ${reqPath}`);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
}

// 3. Démarrage du serveur HTTPS sur le port 3000 (requis par Word Online)
const httpsServer = https.createServer(sslOptions, requestHandler);
httpsServer.listen(PORT_HTTPS, () => {
    console.log(`\n================================================================`);
    console.log(`🔒 Serveur HTTPS Add-in Word prêt sur le port ${PORT_HTTPS} !`);
    console.log(`👉 URL requise par Word : https://localhost:${PORT_HTTPS}/src/taskpane/taskpane.html`);
    console.log(`================================================================\n`);
});

// 4. Serveur HTTP de secours sur le port 3001
const httpServer = http.createServer(requestHandler);
httpServer.listen(PORT_HTTP, () => {
    console.log(`🌐 Serveur HTTP classique de secours : http://localhost:${PORT_HTTP}\n`);
});
