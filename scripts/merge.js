#!/usr/bin/env node

/**
 * PUPPET 3 — Объединение версий
 * 
 * Использование: node scripts/merge.js [опции]
 * 
 * Опции:
 *   --base=v14          Базовая версия (по умолчанию v14)
 *   --physics-from=v13  Взять физику из v13 (если она лучше)
 *   --output=merged.html  Имя выходного файла
 *   --diff              Показать различия в физике
 * 
 * Примеры:
 *   node scripts/merge.js                        # объединить (v14 как основа)
 *   node scripts/merge.js --physics-from=v13     # взять физику из v13
 *   node scripts/merge.js --diff                 # показать различия
 */

const fs = require('fs');
const path = require('path');

// ============ ПАРСИНГ АРГУМЕНТОВ ============

const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

const BASE = args.base || 'v14';
const PHYSICS_FROM = args['physics-from'] || null;
const OUTPUT = args.output || 'puppet3_merged.html';
const SHOW_DIFF = args.diff || false;

// ============ УТИЛИТЫ ============

function loadFile(version) {
  const filename = version === 'v13' ? 'puppet3_v13.html' : 'puppet3_v14.html';
  const filepath = path.join(__dirname, '..', 'public', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Файл не найден: ${filepath}`);
    console.error('   Сначала запустите: node scripts/analyze.js');
    process.exit(1);
  }
  
  return fs.readFileSync(filepath, 'utf-8');
}

function extractScripts(html) {
  const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    scripts.push({
      full: match[0],
      content: match[1].trim(),
      index: match.index,
      length: match[0].length
    });
  }
  return scripts;
}

function extractPhysicsSection(html, funcName) {
  // Ищем функцию или блок кода
  const patterns = [
    new RegExp(`function ${funcName}\\([\\s\\S]*?\\n\\}`, 'm'),
    new RegExp(`const ${funcName}\\s*=[\\s\\S]*?\\n};?`, 'm'),
    new RegExp(`let ${funcName}\\s*=[\\s\\S]*?\\n};?`, 'm'),
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) return { content: match[0], index: match.index };
  }
  return null;
}

function findScriptBlock(html, keyword) {
  const scripts = extractScripts(html);
  for (const script of scripts) {
    if (script.content.includes(keyword)) {
      return script;
    }
  }
  return null;
}

function showPhysicsDiff(html13, html14) {
  console.log('\n🔍 Различия в физических модулях:\n');
  console.log('═'.repeat(70));
  
  const physicsFuncs = [
    'drawJet', 'drawLogs', 'drawGas', 'puddlesV3', 'wallSplat',
    'contactStain', 'trailPud', 'emitAt', 'liftFx', 'pfx',
    'nozzleV', 'jetParcels', 'natLand', 'lockV'
  ];
  
  for (const func of physicsFuncs) {
    const p13 = extractPhysicsSection(html13, func);
    const p14 = extractPhysicsSection(html14, func);
    
    if (!p13 && !p14) continue;
    
    console.log(`\n📌 ${func}:`);
    
    if (p13 && p14) {
      if (p13.content === p14.content) {
        console.log('   ✅ Идентичны');
      } else {
        console.log(`   ⚠️  РАЗЛИЧАЮТСЯ (v13: ${p13.content.length} симв., v14: ${p14.content.length} симв.)`);
        
        // Показать первое отличие
        for (let i = 0; i < Math.min(p13.content.length, p14.content.length); i++) {
          if (p13.content[i] !== p14.content[i]) {
            const start = Math.max(0, i - 30);
            console.log(`   Позиция ${i}:`);
            console.log(`   v13: ...${p13.content.substring(start, i + 50).replace(/\n/g, '\\n')}...`);
            console.log(`   v14: ...${p14.content.substring(start, Math.min(p14.content.length, i + 50)).replace(/\n/g, '\\n')}...`);
            break;
          }
        }
      }
    } else if (p13 && !p14) {
      console.log('   🔙 Только в v13');
    } else if (!p13 && p14) {
      console.log('   🆕 Только в v14');
    }
  }
  
  console.log('\n' + '═'.repeat(70));
}

function mergeFiles(html13, html14, physicsFrom) {
  console.log(`\n🔗 Объединение (база: ${BASE}, физика из: ${physicsFrom || BASE})...\n`);
  
  let merged = BASE === 'v14' ? html14 : html13;
  
  if (physicsFrom && physicsFrom !== BASE) {
    console.log(`  ⚠️  Замена физических модулей из ${physicsFrom}...\n`);
    
    const sourceHtml = physicsFrom === 'v13' ? html13 : html14;
    
    // Физические функции которые нужно заменить
    const physicsFuncs = [
      'drawJet', 'drawLogs', 'drawGas', 'puddlesV3', 'wallSplat',
      'contactStain', 'trailPud', 'emitAt', 'liftFx', 'pfx',
      'nozzleV', 'jetParcels', 'natLand', 'lockV'
    ];
    
    let replacedCount = 0;
    
    for (const func of physicsFuncs) {
      const sourceFunc = extractPhysicsSection(sourceHtml, func);
      if (!sourceFunc) continue;
      
      const targetFunc = extractPhysicsSection(merged, func);
      if (!targetFunc) continue;
      
      if (sourceFunc.content !== targetFunc.content) {
        // Заменяем функцию в merged
        merged = merged.replace(targetFunc.content, sourceFunc.content);
        replacedCount++;
        console.log(`  ✅ ${func}: заменён из ${physicsFrom}`);
      }
    }
    
    // Также заменяем LIQ, GAS, POOP если они различаются
    const constants = ['LIQ', 'GAS', 'POOP'];
    for (const constName of constants) {
      const sourceMatch = new RegExp(`(const ${constName}\\s*=\\s*[\\s\\S]*?\\n\\};?)`, 'm').exec(sourceHtml);
      const targetMatch = new RegExp(`(const ${constName}\\s*=\\s*[\\s\\S]*?\\n\\};?)`, 'm').exec(merged);
      
      if (sourceMatch && targetMatch && sourceMatch[1] !== targetMatch[1]) {
        merged = merged.replace(targetMatch[1], sourceMatch[1]);
        replacedCount++;
        console.log(`  ✅ ${constName}: заменён из ${physicsFrom}`);
      }
    }
    
    console.log(`\n  📊 Заменено модулей: ${replacedCount}`);
  }
  
  return merged;
}

// ============ MAIN ============

function main() {
  console.log('\n🔗 PUPPET 3 — Объединение версий\n');
  console.log('═'.repeat(60));
  
  const html13 = loadFile('v13');
  const html14 = loadFile('v14');
  
  console.log(`  v13: ${(html13.length / 1024).toFixed(1)} KB`);
  console.log(`  v14: ${(html14.length / 1024).toFixed(1)} KB`);
  
  if (SHOW_DIFF) {
    showPhysicsDiff(html13, html14);
    return;
  }
  
  const merged = mergeFiles(html13, html14, PHYSICS_FROM);
  
  // Сохраняем результат
  const outputPath = path.join(__dirname, '..', 'public', OUTPUT);
  fs.writeFileSync(outputPath, merged);
  
  console.log(`\n💾 Результат сохранён: ${outputPath}`);
  console.log(`   Размер: ${(merged.length / 1024).toFixed(1)} KB`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Объединение завершено!\n');
  console.log('Откройте файл в браузере или запустите приложение для проверки.\n');
}

main();
