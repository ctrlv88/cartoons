#!/usr/bin/env node

/**
 * PUPPET 3 — Локальный сервер
 * 
 * Использование: node scripts/server.js
 * 
 * Запускает Express-сервер на http://localhost:3000
 * - Отдаёт React-приложение (собранный dist/)
 * - API для загрузки и анализа файлов
 * - Прокси для GitHub (обход CORS)
 * 
 * Опции:
 *   --port=3000    Порт сервера (по умолчанию 3000)
 *   --open         Открыть браузер автоматически
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1]) || 3000;
const OPEN_BROWSER = process.argv.includes('--open');

// ============ MIME TYPES ============

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ============ PROXY ============

function proxyRequest(url, res) {
  console.log(`  🔗 Прокси: ${url}`);
  
  https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (proxyRes) => {
    if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
      return proxyRequest(proxyRes.headers.location, res);
    }
    
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'text/html',
      'Access-Control-Allow-Origin': '*',
    });
    
    proxyRes.pipe(res);
  }).on('error', (err) => {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  });
}

// ============ API ============

function handleApi(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/api/files') {
    // Список локальных файлов
    const publicDir = path.join(__dirname, '..', 'public');
    const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html') || f.endsWith('.json'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ files }));
    return;
  }
  
  if (url.pathname === '/api/results') {
    const resultsPath = path.join(__dirname, '..', 'public', 'results.json');
    if (fs.existsSync(resultsPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(resultsPath));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'results.json не найден. Запустите: node scripts/analyze.js' }));
    }
    return;
  }
  
  if (url.pathname === '/api/proxy') {
    const target = url.searchParams.get('url');
    if (!target) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Параметр ?url= обязателен' }));
      return;
    }
    proxyRequest(target, res);
    return;
  }
  
  if (url.pathname === '/api/analyze') {
    // Запускаем анализ
    const { exec } = require('child_process');
    exec('node scripts/analyze.js', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message, stderr }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, output: stdout }));
    });
    return;
  }
  
  if (url.pathname === '/api/merge') {
    const physicsFrom = url.searchParams.get('physics-from') || null;
    let cmd = 'node scripts/merge.js';
    if (physicsFrom) cmd += ` --physics-from=${physicsFrom}`;
    
    const { exec } = require('child_process');
    exec(cmd, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message, stderr }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, output: stdout }));
    });
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

// ============ STATIC FILES ============

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = url.pathname;
  
  // SPA fallback — отдаём index.html для всех маршрутов
  if (filePath === '/') filePath = '/index.html';
  
  // Ищем в dist/ (собранный Vite) или public/
  const distPath = path.join(__dirname, '..', 'dist', filePath);
  const publicPath = path.join(__dirname, '..', 'public', filePath);
  
  let targetPath = null;
  if (fs.existsSync(distPath) && fs.statSync(distPath).isFile()) {
    targetPath = distPath;
  } else if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
    targetPath = publicPath;
  } else {
    // SPA fallback
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      targetPath = indexPath;
    } else {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
  }
  
  const ext = path.extname(targetPath);
  const contentType = MIME[ext] || 'application/octet-stream';
  
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(targetPath).pipe(res);
}

// ============ SERVER ============

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  console.log(`  ${req.method} ${url.pathname}`);
  
  // API routes
  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, res);
  }
  
  // Static files
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('\n🚀 PUPPET 3 — Сервер запущен!\n');
  console.log('═'.repeat(50));
  console.log(`\n  🌐 Адрес: http://localhost:${PORT}`);
  console.log(`\n  📡 API:`);
  console.log(`     GET /api/files       — список файлов`);
  console.log(`     GET /api/results     — результаты анализа`);
  console.log(`     GET /api/analyze     — запустить анализ`);
  console.log(`     GET /api/merge       — объединить файлы`);
  console.log(`     GET /api/proxy?url=  — прокси запроса`);
  console.log(`\n  📁 Статика: dist/ и public/`);
  console.log(`\n  Ctrl+C для остановки\n`);
  console.log('═'.repeat(50) + '\n');
  
  if (OPEN_BROWSER) {
    const { exec } = require('child_process');
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} http://localhost:${PORT}`);
  }
});
