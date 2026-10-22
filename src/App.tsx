import { useState, useEffect } from 'react'

const GITHUB_BASE = 'https://raw.githubusercontent.com/ctrlv88/cartoons/combining-html5-and-js-f6e35/src/'
const FILE_13 = GITHUB_BASE + 'puppet3%20(13).html'
const FILE_14 = GITHUB_BASE + 'puppet3%20(14).html'

type Tab = 'info' | 'compare' | 'sidebyside' | 'nodejs'

interface ScriptBlock {
  index: number
  content: string
  preview: string
  tags: string[]
  length: number
}

interface DiffResult {
  identical: { name: string; length: number }[]
  different: { name: string; len13: number; len14: number; similarity: string; diffPercent: string }[]
  onlyIn13: { name: string; length: number; preview: string }[]
  onlyIn14: { name: string; length: number; preview: string }[]
}

function App() {
  const [file13, setFile13] = useState('')
  const [file14, setFile14] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [scripts13, setScripts13] = useState<ScriptBlock[]>([])
  const [scripts14, setScripts14] = useState<ScriptBlock[]>([])
  const [diffs, setDiffs] = useState<DiffResult>({ identical: [], different: [], onlyIn13: [], onlyIn14: [] })
  const [error, setError] = useState('')
  const [sideMode, setSideMode] = useState<'both' | 'v13' | 'v14'>('both')
  const [hasNodeServer, setHasNodeServer] = useState(false)

  useEffect(() => {
    loadFiles()
    checkNodeServer()
  }, [])

  const checkNodeServer = async () => {
    try {
      const res = await fetch('/api/files', { signal: AbortSignal.timeout(2000) })
      if (res.ok) setHasNodeServer(true)
    } catch { /* no server */ }
  }

  const loadFiles = async () => {
    setLoading(true)
    try {
      const [r13, r14] = await Promise.all([
        fetch(FILE_13).then(r => r.text()),
        fetch(FILE_14).then(r => r.text())
      ])
      setFile13(r13)
      setFile14(r14)
      
      const s13 = extractScripts(r13)
      const s14 = extractScripts(r14)
      setScripts13(s13)
      setScripts14(s14)
      compareScripts(s13, s14)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  const extractScripts = (html: string): ScriptBlock[] => {
    const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi
    const scripts: ScriptBlock[] = []
    let match, idx = 0
    
    while ((match = regex.exec(html)) !== null) {
      const content = match[1].trim()
      if (!content) continue
      
      const tags: string[] = []
      if (/v2.*моча|LIQ\['моча'\]/i.test(content)) tags.push('Физика v2')
      if (/ФИЗИКА v3|jetParcels|puddlesV3/i.test(content)) tags.push('Физика v3')
      if (/СБОРКА.*ЧАСТЕЙ|asmAdd/i.test(content)) tags.push('ASM')
      if (/const CUT|openCutter/i.test(content)) tags.push('Cutter')
      if (/function layout|drawTL/i.test(content)) tags.push('Таймлайн')
      if (/buildScenario/i.test(content)) tags.push('Сценарий')
      if (/drawRig|boneMode/i.test(content)) tags.push('Кости')
      if (/const \$=|FPS=8/i.test(content)) tags.push('Ядро')
      if (/liftFx|addLift/i.test(content)) tags.push('Взлёт')
      if (/wallSplat|contactStain/i.test(content)) tags.push('Пятна')
      if (/drawLogs|колбаска/i.test(content)) tags.push('Колбаски')
      if (/drawGas|GAS\[/i.test(content)) tags.push('Газы')
      
      scripts.push({
        index: idx++,
        content,
        preview: content.substring(0, 120).replace(/\n/g, ' '),
        tags: tags.length > 0 ? tags : ['Другое'],
        length: content.length
      })
    }
    return scripts
  }

  const similarity = (a: string, b: string): number => {
    if (a === b) return 1
    const len = Math.max(a.length, b.length)
    if (len === 0) return 1
    const chunk = 200
    let matches = 0
    for (let i = 0; i < Math.min(a.length, b.length); i += chunk) {
      if (a.substring(i, i + chunk) === b.substring(i, i + chunk)) matches++
    }
    return matches / (len / chunk)
  }

  const compareScripts = (s13: ScriptBlock[], s14: ScriptBlock[]) => {
    const identical: DiffResult['identical'] = []
    const different: DiffResult['different'] = []
    const onlyIn13: DiffResult['onlyIn13'] = []
    const onlyIn14: DiffResult['onlyIn14'] = []
    const used14 = new Set<number>()
    
    s13.forEach((s, i) => {
      let best = -1, bestScore = 0
      s14.forEach((t, j) => {
        if (used14.has(j)) return
        const score = similarity(s.content, t.content)
        if (score > bestScore) { bestScore = score; best = j }
      })
      
      if (best >= 0 && bestScore > 0.3) {
        used14.add(best)
        if (s.content === s14[best].content) {
          identical.push({ name: s.tags.join(', '), length: s.length })
        } else {
          different.push({
            name: s.tags.join(', '),
            len13: s.length,
            len14: s14[best].length,
            similarity: (bestScore * 100).toFixed(1),
            diffPercent: (Math.abs(s14[best].length - s.length) / Math.max(s.length, s14[best].length) * 100).toFixed(1)
          })
        }
      } else {
        onlyIn13.push({ name: s.tags.join(', '), length: s.length, preview: s.preview })
      }
    })
    
    s14.forEach((s, j) => {
      if (!used14.has(j)) {
        onlyIn14.push({ name: s.tags.join(', '), length: s.length, preview: s.preview })
      }
    })
    
    setDiffs({ identical, different, onlyIn13, onlyIn14 })
  }

  const download = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔬</div>
          <p className="text-white text-xl font-bold">Загрузка и анализ...</p>
          <p className="text-purple-300 mt-2">Скачиваю файлы с GitHub</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 max-w-md text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-red-300">{error}</p>
          <button onClick={loadFiles} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg">Повторить</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">🔬 PUPPET 3 — Анализ физики</h1>
            <p className="text-purple-300 text-xs">
              v13: {(file13.length/1024).toFixed(0)}KB • v14: {(file14.length/1024).toFixed(0)}KB
              {hasNodeServer && <span className="ml-2 text-green-400">• Node.js сервер активен ✓</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => download(file13, 'puppet3_v13.html')} className="bg-pink-500/80 hover:bg-pink-500 text-white px-3 py-1.5 rounded-lg text-sm">💾 v13</button>
            <button onClick={() => download(file14, 'puppet3_v14.html')} className="bg-violet-500/80 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-sm">💾 v14</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {([
            ['info', 'ℹ️ Анализ'],
            ['compare', '🔍 Сравнение'],
            ['sidebyside', '👁️ Визуально'],
            ['nodejs', '⚡ Node.js']
          ] as [Tab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-purple-500 text-white shadow-lg' : 'text-purple-300 hover:text-white hover:bg-white/10'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Info */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{diffs.identical.length}</div>
                <div className="text-green-300 text-sm">Одинаковых</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{diffs.different.length}</div>
                <div className="text-yellow-300 text-sm">С различиями</div>
              </div>
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-pink-400">{diffs.onlyIn13.length}</div>
                <div className="text-pink-300 text-sm">Только v13</div>
              </div>
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-violet-400">{diffs.onlyIn14.length}</div>
                <div className="text-violet-300 text-sm">Только v14</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-bold text-white mb-3">📋 Скрипты v13 ({scripts13.length})</h3>
              {scripts13.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm mb-1 ${s.tags.includes('Физика v2') || s.tags.includes('Физика v3') ? 'bg-yellow-500/10' : 'bg-white/5'}`}>
                  <span className="text-purple-400 font-mono w-6">#{i+1}</span>
                  <span className="text-white flex-1 truncate text-xs">{s.preview}</span>
                  <span className="text-yellow-300 text-xs bg-yellow-500/20 px-2 py-0.5 rounded whitespace-nowrap">{s.tags.join(', ')}</span>
                </div>
              ))}
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-bold text-white mb-3">📋 Скрипты v14 ({scripts14.length})</h3>
              {scripts14.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm mb-1 ${s.tags.includes('Физика v2') || s.tags.includes('Физика v3') ? 'bg-yellow-500/10' : 'bg-white/5'}`}>
                  <span className="text-purple-400 font-mono w-6">#{i+1}</span>
                  <span className="text-white flex-1 truncate text-xs">{s.preview}</span>
                  <span className="text-yellow-300 text-xs bg-yellow-500/20 px-2 py-0.5 rounded whitespace-nowrap">{s.tags.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compare */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            {diffs.different.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-3">⚠️ Различия в физике:</h3>
                {diffs.different.map((d, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3 mb-2">
                    <div className="text-white font-medium">{d.name}</div>
                    <div className="flex gap-4 text-sm mt-1 flex-wrap">
                      <span className="text-pink-300">v13: {(d.len13/1024).toFixed(1)}KB</span>
                      <span className="text-violet-300">v14: {(d.len14/1024).toFixed(1)}KB</span>
                      <span className="text-yellow-300">Δ {d.diffPercent}%</span>
                      <span className="text-gray-400">Сходство: {d.similarity}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {diffs.onlyIn14.length > 0 && (
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-violet-300 mb-2">🆕 Только в v14:</h3>
                {diffs.onlyIn14.map((m, i) => (
                  <div key={i} className="text-white text-sm p-2 bg-violet-500/10 rounded mb-1">• {m.name} ({(m.length/1024).toFixed(1)}KB)</div>
                ))}
              </div>
            )}

            {diffs.identical.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-green-300 mb-2">✅ Идентичные:</h3>
                <div className="text-green-200 text-sm flex flex-wrap gap-2">
                  {diffs.identical.map((d, i) => (
                    <span key={i} className="bg-green-500/20 px-2 py-1 rounded">{d.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Side by side */}
        {activeTab === 'sidebyside' && (
          <div>
            <div className="flex gap-2 mb-3">
              {(['both', 'v13', 'v14'] as const).map(m => (
                <button key={m} onClick={() => setSideMode(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${sideMode === m ? 'bg-purple-500 text-white' : 'bg-white/10 text-purple-300'}`}>
                  {m === 'both' ? '👥 Обе' : m === 'v13' ? '🎬 v13' : '🎭 v14'}
                </button>
              ))}
            </div>
            <div className={`grid gap-2 ${sideMode === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {(sideMode === 'both' || sideMode === 'v13') && (
                <div className="bg-black rounded-xl overflow-hidden border border-pink-500/30">
                  <div className="bg-pink-500/20 px-3 py-1.5 text-pink-300 text-sm font-bold">PUPPET 3 v13</div>
                  <iframe src={FILE_13} className="w-full border-0" style={{ height: sideMode === 'both' ? '65vh' : '82vh' }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads" title="v13" />
                </div>
              )}
              {(sideMode === 'both' || sideMode === 'v14') && (
                <div className="bg-black rounded-xl overflow-hidden border border-violet-500/30">
                  <div className="bg-violet-500/20 px-3 py-1.5 text-violet-300 text-sm font-bold">PUPPET 3 v14</div>
                  <iframe src={FILE_14} className="w-full border-0" style={{ height: sideMode === 'both' ? '65vh' : '82vh' }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads" title="v14" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Node.js */}
        {activeTab === 'nodejs' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-2">⚡ Node.js инструменты</h2>
              <p className="text-green-300 mb-4">
                Три скрипта для анализа, объединения и запуска локально:
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <h3 className="text-green-400 font-bold mb-2">📊 analyze.js</h3>
                  <p className="text-gray-300 text-sm mb-3">Скачивает файлы, сравнивает все скрипты, находит различия в физике</p>
                  <code className="text-green-300 text-xs bg-black/50 p-2 rounded block">node scripts/analyze.js</code>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h3 className="text-blue-400 font-bold mb-2">🔗 merge.js</h3>
                  <p className="text-gray-300 text-sm mb-3">Объединяет версии, заменяет физику из выбранной версии</p>
                  <code className="text-blue-300 text-xs bg-black/50 p-2 rounded block">node scripts/merge.js --physics-from=v13</code>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h3 className="text-purple-400 font-bold mb-2">🚀 server.js</h3>
                  <p className="text-gray-300 text-sm mb-3">Локальный сервер с API, прокси GitHub, авто-обновлением</p>
                  <code className="text-purple-300 text-xs bg-black/50 p-2 rounded block">node scripts/server.js --open</code>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📖 Быстрый старт</h3>
              <div className="space-y-3">
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-yellow-300 font-bold text-sm mb-2">1️⃣ Клонировать проект</div>
                  <code className="text-green-300 text-sm">git clone https://github.com/ctrlv88/cartoons.git && cd cartoons</code>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-yellow-300 font-bold text-sm mb-2">2️⃣ Установить зависимости</div>
                  <code className="text-green-300 text-sm">npm install</code>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-yellow-300 font-bold text-sm mb-2">3️⃣ Запустить анализ</div>
                  <code className="text-green-300 text-sm">node scripts/analyze.js</code>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-yellow-300 font-bold text-sm mb-2">4️⃣ Объединить (физика из v13, остальное из v14)</div>
                  <code className="text-green-300 text-sm">node scripts/merge.js --physics-from=v13</code>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-yellow-300 font-bold text-sm mb-2">5️⃣ Запустить локальный сервер</div>
                  <code className="text-green-300 text-sm">npm run build && node scripts/server.js --open</code>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📡 API сервера</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3 items-center p-2 bg-black/20 rounded">
                  <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-mono">GET</span>
                  <code className="text-white">/api/files</code>
                  <span className="text-gray-400">— список локальных файлов</span>
                </div>
                <div className="flex gap-3 items-center p-2 bg-black/20 rounded">
                  <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-mono">GET</span>
                  <code className="text-white">/api/results</code>
                  <span className="text-gray-400">— результаты анализа (JSON)</span>
                </div>
                <div className="flex gap-3 items-center p-2 bg-black/20 rounded">
                  <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-mono">GET</span>
                  <code className="text-white">/api/analyze</code>
                  <span className="text-gray-400">— запустить анализ</span>
                </div>
                <div className="flex gap-3 items-center p-2 bg-black/20 rounded">
                  <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-mono">GET</span>
                  <code className="text-white">/api/merge?physics-from=v13</code>
                  <span className="text-gray-400">— объединить</span>
                </div>
                <div className="flex gap-3 items-center p-2 bg-black/20 rounded">
                  <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-mono">GET</span>
                  <code className="text-white">/api/proxy?url=...</code>
                  <span className="text-gray-400">— прокси GitHub (без CORS)</span>
                </div>
              </div>
            </div>

            {hasNodeServer ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-300 text-lg">✅ Node.js сервер обнаружен и работает!</p>
                <p className="text-green-200 text-sm mt-1">API доступен на этом же хосте</p>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                <p className="text-yellow-300 text-lg">⚠️ Node.js сервер не запущен</p>
                <p className="text-yellow-200 text-sm mt-1">Запустите <code className="bg-black/30 px-2 py-0.5 rounded">node scripts/server.js</code> для API и прокси</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
