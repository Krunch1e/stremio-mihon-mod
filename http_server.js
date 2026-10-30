#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const HTTP_PORT = process.env.PORT || 8080;
const STREAMING_SERVER_PORT = 11470;
const BUILD_PATH = path.resolve(__dirname, 'build');
const INDEX_PATH = path.join(BUILD_PATH, 'index.html');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json'
};

const server = http.createServer((req, res) => {
    // Add full CORS headers for local Stremio shell integration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname === '/api/log' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            fs.appendFileSync(path.join(__dirname, 'client_debug.log'), '[' + new Date().toISOString() + '] ' + body + '\n');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        });
        return;
    }

    // Clean up any previously installed service worker
    if (pathname === '/service-worker.js') {
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(`
            self.addEventListener('install', () => { self.skipWaiting(); });
            self.addEventListener('activate', (e) => {
                self.registration.unregister().then(() => {
                    return self.clients.matchAll();
                }).then((clients) => {
                    clients.forEach((client) => client.navigate(client.url));
                });
            });
        `);
        return;
    }

    let filePath = path.join(BUILD_PATH, pathname);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(BUILD_PATH)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    // Check if target file exists in build
    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        fs.stat(filePath, (statErr, fileStats) => {
            if (!statErr && fileStats.isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = MIME_TYPES[ext] || 'application/octet-stream';

                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');

                res.writeHead(200, { 'Content-Type': contentType });

                if (req.method === 'HEAD') {
                    res.end();
                    return;
                }

                const stream = fs.createReadStream(filePath);
                stream.pipe(res);
                return;
            }

            // If not a static file and method is POST/PUT or known streaming path, proxy to local streaming server
            const streamingPaths = ['/settings', '/stats.json', '/hlp', '/subtitles', '/stremioget'];
            const isStreamingRequest = streamingPaths.some(p => pathname.startsWith(p)) || req.method !== 'GET';

            if (isStreamingRequest) {
                const proxyReq = http.request({
                    hostname: '127.0.0.1',
                    port: STREAMING_SERVER_PORT,
                    path: req.url,
                    method: req.method,
                    headers: {
                        ...req.headers,
                        host: `127.0.0.1:${STREAMING_SERVER_PORT}`
                    }
                }, (proxyRes) => {
                    res.writeHead(proxyRes.statusCode, {
                        ...proxyRes.headers,
                        'Access-Control-Allow-Origin': '*'
                    });
                    proxyRes.pipe(res);
                });

                proxyReq.on('error', () => {
                    res.writeHead(502, { 'Content-Type': 'text/plain' });
                    res.end('Streaming Server Unavailable');
                });

                req.pipe(proxyReq);
                return;
            }

            // SPA Fallback: serve index.html for client-side routing
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.createReadStream(INDEX_PATH).pipe(res);
        });
    });
});

server.listen(HTTP_PORT, () => {
    console.log(`Stremio Mihon WebUI server listening at http://localhost:${HTTP_PORT}`);
});
