#!/usr/bin/env node

/**
 * PUPPET 3 — Анализ различий между версиями
 * 
 * Использование: node scripts/analyze.js
 * 
 * Скачивает puppet3 (13).html и puppet3 (14).html с GitHub,
 * сравнивает все <script> блоки, находит различия в физике,
 * и сохраняет результат в public/results.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_BASE = 'https://raw.githubusercontent.com/ctrlv88/cartoons/combining-html5-and-js-f6e35/src/';
const FILES = {
  v13: REPO_BASE + 'puppet3%20(13).html',
  v14: REPO_BASE + 'puppet3%20(14).html'
};

// ============ УТИЛИТЫ ============

function fetch(url) {
  return new Promise((resolve, reject) => {
    console.log(`  ⬇️  Загрузка: ${url.split('/').pop()}`);
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractScripts(html) {
  const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match, idx = 0;
  
  while ((match = regex.exec(html)) !== null) {
    const content = match[1].trim();
    if (!content) continue;
    
    // Классифицируем скрипт
    const tags = [];
    if (/v2.*моча|моча.*v2|LIQ\['моча'\]/i.test(content)) tags.push('Физика v2 (моча)');
    if (/ФИЗИКА v3|jetParcels|puddlesV3/i.test(content)) tags.push('Физика v3 (частицы)');
    if (/СБОРКА.*ЧАСТЕЙ|ASM.*parts|asmAdd/i.test(content)) tags.push('ASM (сборка из частей)');
    if (/const CUT|openCutter|doCut/i.test(content)) tags.push('Cutter (вырезание)');
    if (/function layout|drawTL/i.test(content)) tags.push('Таймлайн');
    if (/buildScenario|parseText/i.test(content)) tags.push('Сценарий');
    if (/drawRig|rigMats|boneMode/i.test(content)) tags.push('Кости (rig)');
    if (/const \$=|FPS=8|let lib=/i.test(content)) tags.push('Ядро');
    if (/liftFx|addLift|взлёт/i.test(content)) tags.push('Взлёт');
    if (/wallSplat|contactStain|заляпать/i.test(content)) tags.push('Пятна/заляпывание');
    if (/drawLogs|колбаска/i.test(content)) tags.push('Колбаски');
    if (/drawGas|GAS\[/i.test(content)) tags.push('Газы');
    if (/trailPud|puddles/i.test(content)) tags.push('Лужи');
    if (/record|MediaRecorder/i.test(content)) tags.push('Запись видео');
    if (/play\(\)|stop\(\)|requestAnimationFrame/i.test(content)) tags.push('Анимация');
    
    scripts.push({
      index: idx++,
      content,
      length: content.length,
      preview: content.substring(0, 150).replace(/\n/g, ' '),
      tags: tags.length > 0 ? tags : ['Другое'],
      startLine: html.substring(0, match.index).split('\n').length
    });
  }
  return scripts;
}

function similarity(a, b) {
  if (a === b) return 1.0;
  const len = Math.max(a.length, b.length);
  if (len === 0) return 1.0;
  
  // Поблочное сравнение
  const chunkSize = 200;
  let matches = 0;
  const total = Math.ceil(len / chunkSize);
  
  for (let i = 0; i < Math.min(a.length, b.length); i += chunkSize) {
    if (a.substring(i, i + chunkSize) === b.substring(i, i + chunkSize)) {
      matches++;
    }
  }
  return matches / total;
}

function findFirstDiff(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      // Найдём контекст вокруг отличия
      const start = Math.max(0, i - 40);
      const end = Math.min(a.length, i + 40);
      return {
        position: i,
        context13: a.substring(start, end),
        context14: b.substring(start, Math.min(b.length, i + 40))
      };
    }
  }
  return { position: Math.min(a.length, b.length), context13: '', context14: '' };
}

function compareScripts(scripts13, scripts14) {
  const identical = [];
  const different = [];
  const onlyIn13 = [];
  const onlyIn14 = [];
  const used14 = new Set();
  
  // Сопоставляем скрипты по сходству
  for (let i = 0; i < scripts13.length; i++) {
    let bestMatch = -1;
    let bestScore = 0;
    
    for (let j = 0; j < scripts14.length; j++) {
      if (used14.has(j)) continue;
      const score = similarity(scripts13[i].content, scripts14[j].content);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = j;
      }
    }
    
    if (bestMatch >= 0 && bestScore > 0.3) {
      used14.add(bestMatch);
      
      if (scripts13[i].content === scripts14[bestMatch].content) {
        identical.push({
          name: scripts13[i].tags.join(', '),
          index13: i,
          index14: bestMatch,
          length: scripts13[i].length
        });
      } else {
        const diff = findFirstDiff(scripts13[i].content, scripts14[bestMatch].content);
        different.push({
          name: scripts13[i].tags.join(', '),
          index13: i,
          index14: bestMatch,
          len13: scripts13[i].length,
          len14: scripts14[bestMatch].length,
          diffPercent: Math.abs(scripts14[bestMatch].length - scripts13[i].length) / Math.max(scripts13[i].length, scripts14[bestMatch].length) * 100,
          similarity: (bestScore * 100).toFixed(1),
          firstDiff: diff
        });
      }
    } else {
      onlyIn13.push({
        name: scripts13[i].tags.join(', '),
        index: i,
        length: scripts13[i].length,
        preview: scripts13[i].preview
      });
    }
  }
  
  // Скрипты только в v14
  for (let j = 0; j < scripts14.length; j++) {
    if (!used14.has(j)) {
      onlyIn14.push({
        name: scripts14[j].tags.join(', '),
        index: j,
        length: scripts14[j].length,
        preview: scripts14[j].preview
      });
    }
  }
  
  return { identical, different, onlyIn13, onlyIn14 };
}

// ============ АНАЛИЗ ФИЗИКИ ============

function analyzePhysics(html, version) {
  const physics = {};
  
  // Извлекаем секции физики
  const sections = [
    { name: 'LIQ (жидкости)', regex: /LIQ\s*=\s*\{[\s\S]*?\n\};?/ },
    { name: 'GAS (газы)', regex: /const GAS\s*=\s*\{[\s\S]*?\n\};?/ },
    { name: 'POOP (типы)', regex: /const POOP\s*=\s*\[[\s\S]*?\];?/ },
    { name: 'drawJet (струя)', regex: /function drawJet\([\s\S]*?\n\}/ },
    { name: 'drawLogs (колбаски)', regex: /function drawLogs\([\s\S]*?\n\}/ },
    { name: 'drawGas (газы)', regex: /function drawGas\([\s\S]*?\n\}/ },
    { name: 'puddlesV3 (лужи)', regex: /function puddlesV3\([\s\S]*?\n\}/ },
    { name: 'wallSplat (пятна)', regex: /function wallSplat\([\s\S]*?\n\}/ },
    { name: 'contactStain (заляпывание)', regex: /function contactStain\([\s\S]*?\n\}/ },
    { name: 'trailPud (след луж)', regex: /function trailPud\([\s\S]*?\n\}/ },
    { name: 'emitAt (точка испускания)', regex: /function emitAt\([\s\S]*?\n\}/ },
    { name: 'liftFx (взлёт)', regex: /function liftFx\([\s\S]*?\n\}/ },
    { name: 'pfx (параметры по умолчанию)', regex: /function pfx\([\s\S]*?\n\}/ },
    { name: 'nozzleV (скорость сопла)', regex: /function nozzleV\([\s\S]*?\n\}/ },
    { name: 'jetParcels (частицы)', regex: /function jetParcels\([\s\S]*?\n\}/ },
  ];
  
  for (const { name, regex } of sections) {
    const match = regex.exec(html);
    if (match) {
      physics[name] = {
        found: true,
        content: match[0],
        length: match[0].length,
        position: match.index
      };
    } else {
      physics[name] = { found: false };
    }
  }
  
  return physics;
}

// ============ MAIN ============

async function main() {
  console.log('\n🔬 PUPPET 3 — Анализ различий между версиями\n');
  console.log('═'.repeat(60));
  
  // 1. Загрузка файлов
  console.log('\n📥 Шаг 1: Загрузка файлов с GitHub...\n');
  const [html13, html14] = await Promise.all([
    fetch(FILES.v13),
    fetch(FILES.v14)
  ]);
  
  console.log(`\n  ✅ v13: ${(html13.length / 1024).toFixed(1)} KB`);
  console.log(`  ✅ v14: ${(html14.length / 1024).toFixed(1)} KB`);
  
  // 2. Извлечение скриптов
  console.log('\n📋 Шаг 2: Извлечение <script> блоков...\n');
  const scripts13 = extractScripts(html13);
  const scripts14 = extractScripts(html14);
  
  console.log(`  v13: ${scripts13.length} скриптов`);
  scripts13.forEach((s, i) => {
    console.log(`    #${i + 1} [${(s.length / 1024).toFixed(1)} KB] ${s.tags.join(', ')}`);
  });
  
  console.log(`\n  v14: ${scripts14.length} скриптов`);
  scripts14.forEach((s, i) => {
    console.log(`    #${i + 1} [${(s.length / 1024).toFixed(1)} KB] ${s.tags.join(', ')}`);
  });
  
  // 3. Сравнение
  console.log('\n🔍 Шаг 3: Сравнение скриптов...\n');
  const comparison = compareScripts(scripts13, scripts14);
  
  console.log(`  ✅ Идентичных: ${comparison.identical.length}`);
  console.log(`  ⚠️  С различиями: ${comparison.different.length}`);
  console.log(`  🔙 Только в v13: ${comparison.onlyIn13.length}`);
  console.log(`  🆕 Только в v14: ${comparison.onlyIn14.length}`);
  
  if (comparison.different.length > 0) {
    console.log('\n  ⚠️  РАЗЛИЧИЯ В СЛЕДУЮЩИХ СЕКЦИЯХ:');
    comparison.different.forEach(d => {
      console.log(`\n  📌 ${d.name}`);
      console.log(`     v13: ${(d.len13 / 1024).toFixed(1)} KB → v14: ${(d.len14 / 1024).toFixed(1)} KB`);
      console.log(`     Разница: ${d.diffPercent.toFixed(1)}% | Сходство: ${d.similarity}%`);
      if (d.firstDiff.context13) {
        console.log(`     Позиция: ${d.firstDiff.position}`);
        console.log(`     v13: ...${d.firstDiff.context13.substring(0, 80)}...`);
        console.log(`     v14: ...${d.firstDiff.context14.substring(0, 80)}...`);
      }
    });
  }
  
  if (comparison.onlyIn14.length > 0) {
    console.log('\n  🆕 НОВЫЕ МОДУЛИ В v14:');
    comparison.onlyIn14.forEach(m => {
      console.log(`     • ${m.name} (${(m.length / 1024).toFixed(1)} KB)`);
    });
  }
  
  // 4. Анализ физики
  console.log('\n🧪 Шаг 4: Анализ физических модулей...\n');
  const physics13 = analyzePhysics(html13, 'v13');
  const physics14 = analyzePhysics(html14, 'v14');
  
  console.log('  Физическая секция              | v13      | v14      | Статус');
  console.log('  ─────────────────────────────────────────────────────────────');
  
  const allPhysicsKeys = [...new Set([...Object.keys(physics13), ...Object.keys(physics14)])];
  for (const key of allPhysicsKeys) {
    const p13 = physics13[key];
    const p14 = physics14[key];
    const s13 = p13?.found ? `${(p13.length / 1024).toFixed(1)} KB` : '—';
    const s14 = p14?.found ? `${(p14.length / 1024).toFixed(1)} KB` : '—';
    
    let status = '✅';
    if (p13?.found && p14?.found) {
      if (p13.content === p14.content) status = '✅ одинаковые';
      else status = '⚠️  РАЗЛИЧАЮТСЯ';
    } else if (p13?.found && !p14?.found) status = '🔙 только v13';
    else if (!p13?.found && p14?.found) status = '🆕 только v14';
    else status = '— отсутствует';
    
    console.log(`  ${key.padEnd(32)} | ${s13.padEnd(8)} | ${s14.padEnd(8)} | ${status}`);
  }
  
  // 5. Сохранение результатов
  console.log('\n💾 Шаг 5: Сохранение результатов...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    files: {
      v13: { size: html13.length, scripts: scripts13.length },
      v14: { size: html14.length, scripts: scripts14.length }
    },
    comparison,
    physics: {
      v13: Object.fromEntries(
        Object.entries(physics13).map(([k, v]) => [k, { found: v.found, length: v.length || 0 }])
      ),
      v14: Object.fromEntries(
        Object.entries(physics14).map(([k, v]) => [k, { found: v.found, length: v.length || 0 }])
      )
    },
    scripts: {
      v13: scripts13.map(s => ({ index: s.index, tags: s.tags, length: s.length, preview: s.preview })),
      v14: scripts14.map(s => ({ index: s.index, tags: s.tags, length: s.length, preview: s.preview }))
    }
  };
  
  const outputPath = path.join(__dirname, '..', 'public', 'results.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`  ✅ Результаты сохранены: ${outputPath}`);
  
  // Также сохраняем полные содержимые для merge
  const v13Path = path.join(__dirname, '..', 'public', 'puppet3_v13.html');
  const v14Path = path.join(__dirname, '..', 'public', 'puppet3_v14.html');
  fs.writeFileSync(v13Path, html13);
  fs.writeFileSync(v14Path, html14);
  console.log(`  ✅ v13 сохранён: ${v13Path}`);
  console.log(`  ✅ v14 сохранён: ${v14Path}`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Анализ завершён!\n');
  console.log('Далее запустите: node scripts/merge.js');
  console.log('Или откройте приложение в браузере для визуализации.\n');
}

main().catch(err => {
  console.error('\n❌ Ошибка:', err.message);
  process.exit(1);
});
