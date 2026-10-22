import { useState, useEffect, useRef } from 'react'

const REPO_BASE = 'https://raw.githubusercontent.com/ctrlv88/cartoons/combining-html5-and-js-f6e35/src/'
const FILE_13 = REPO_BASE + 'puppet3%20(13).html'
const FILE_14 = REPO_BASE + 'puppet3%20(14).html'

type Tab = 'info' | 'compare' | 'sidebyside' | 'merged'

interface ScriptBlock {
  index: number
  content: string
  preview: string
  hasPhysics: boolean
  physicsType: string
}

function App() {
  const [file13, setFile13] = useState<string>('')
  const [file14, setFile14] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [scripts13, setScripts13] = useState<ScriptBlock[]>([])
  const [scripts14, setScripts14] = useState<ScriptBlock[]>([])
  const [diffDetails, setDiffDetails] = useState<{
    identical: string[]
    different: { name: string; len13: number; len14: number; firstDiff: number }[]
    onlyIn13: string[]
    onlyIn14: string[]
  }>({ identical: [], different: [], onlyIn13: [], onlyIn14: [] })
  const [error, setError] = useState('')
  const [sideBySideMode, setSideBySideMode] = useState<'both' | 'v13' | 'v14'>('both')

  useEffect(() => { loadFiles() }, [])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const [r13, r14] = await Promise.all([
        fetch(FILE_13).then(r => r.text()),
        fetch(FILE_14).then(r => r.text())
      ])
      setFile13(r13)
      setFile14(r14)
      
      const s13 = analyzeScripts(r13)
      const s14 = analyzeScripts(r14)
      setScripts13(s13)
      setScripts14(s14)
      compareScripts(s13, s14)
    } catch (e) {
      setError('Ошибка загрузки: ' + (e as Error).message)
    }
    setLoading(false)
  }

  const analyzeScripts = (html: string): ScriptBlock[] => {
    const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi
    const scripts: ScriptBlock[] = []
    let match
    let idx = 0
    
    while ((match = regex.exec(html)) !== null) {
      const content = match[1].trim()
      if (!content) continue
      
      const physicsTypes: string[] = []
      if (/v2.*моча|моча.*v2|LIQ\['моча'\]/i.test(content)) physicsTypes.push('Физика v2 (моча)')
      if (/ФИЗИКА v3|jetParcels|puddlesV3/i.test(content)) physicsTypes.push('Физика v3 (частицы)')
      if (/СБОРКА.*ЧАСТЕЙ|ASM.*parts|asmAdd/i.test(content)) physicsTypes.push('ASM (сборка)')
      if (/const CUT|openCutter|doCut/i.test(content)) physicsTypes.push('Cutter (вырезание)')
      if (/function layout|drawTL.*layout/i.test(content)) physicsTypes.push('Таймлайн v2')
      if (/buildScenario|parseText/i.test(content)) physicsTypes.push('Сценарий')
      if (/drawRig|rigMats|boneMode/i.test(content)) physicsTypes.push('Кости (rig)')
      if (/const \$=|FPS=8|let lib=/i.test(content)) physicsTypes.push('Ядро')
      if (/liftFx|addLift|взлёт/i.test(content)) physicsTypes.push('Взлёт')
      if (/wallSplat|contactStain|заляпать/i.test(content)) physicsTypes.push('Пятна/заляпывание')
      if (/drawLogs|колбаска/i.test(content)) physicsTypes.push('Колбаски')
      if (/drawGas|GAS\[/i.test(content)) physicsTypes.push('Газы')
      
      scripts.push({
        index: idx++,
        content,
        preview: content.substring(0, 120).replace(/\n/g, ' '),
        hasPhysics: physicsTypes.length > 0,
        physicsType: physicsTypes.join(', ') || 'Другое'
      })
    }
    return scripts
  }

  const compareScripts = (s13: ScriptBlock[], s14: ScriptBlock[]) => {
    const identical: string[] = []
    const different: { name: string; len13: number; len14: number; firstDiff: number }[] = []
    const onlyIn13: string[] = []
    const onlyIn14: string[] = []

    // Match scripts by content similarity
    const used14 = new Set<number>()
    
    s13.forEach((script, i) => {
      let bestMatch = -1
      let bestScore = 0
      
      s14.forEach((s14script, j) => {
        if (used14.has(j)) return
        const score = similarity(script.content, s14script.content)
        if (score > bestScore) {
          bestScore = score
          bestMatch = j
        }
      })
      
      if (bestMatch >= 0 && bestScore > 0.5) {
        used14.add(bestMatch)
        if (script.content === s14[bestMatch].content) {
          identical.push(script.physicsType || `Скрипт #${i + 1}`)
        } else {
          const fd = findFirstDiff(script.content, s14[bestMatch].content)
          different.push({
            name: script.physicsType || `Скрипт #${i + 1}`,
            len13: script.content.length,
            len14: s14[bestMatch].content.length,
            firstDiff: fd
          })
        }
      } else {
        onlyIn13.push(script.physicsType || `Скрипт #${i + 1}`)
      }
    })
    
    s14.forEach((script, j) => {
      if (!used14.has(j)) {
        onlyIn14.push(script.physicsType || `Скрипт #${j + 1}`)
      }
    })
    
    setDiffDetails({ identical, different, onlyIn13, onlyIn14 })
  }

  const similarity = (a: string, b: string): number => {
    if (a === b) return 1
    const len = Math.max(a.length, b.length)
    if (len === 0) return 1
    // Quick hash-based similarity
    let matches = 0
    const chunkSize = 100
    for (let i = 0; i < Math.min(a.length, b.length); i += chunkSize) {
      if (a.substring(i, i + chunkSize) === b.substring(i, i + chunkSize)) matches++
    }
    return matches / (len / chunkSize)
  }

  const findFirstDiff = (a: string, b: string): number => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return i
    }
    return Math.min(a.length, b.length)
  }

  const downloadFile = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔬</div>
          <p className="text-white text-xl font-bold">Загрузка и анализ файлов...</p>
          <p className="text-purple-300 mt-2">Скачиваю puppet3 (13).html и puppet3 (14).html</p>
          <div className="mt-4 w-48 h-2 bg-purple-900 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 max-w-md text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-red-300 text-lg">{error}</p>
          <button onClick={loadFiles} className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg">
            Повторить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">🔬 PUPPET 3 — Анализ и объединение</h1>
            <p className="text-purple-300 text-xs">
              v13: {(file13.length / 1024).toFixed(0)} KB ({scripts13.length} скриптов) • 
              v14: {(file14.length / 1024).toFixed(0)} KB ({scripts14.length} скриптов)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadFile(file13, 'puppet3_v13.html')} className="bg-pink-500/80 hover:bg-pink-500 text-white px-3 py-1.5 rounded-lg text-sm">
              💾 v13
            </button>
            <button onClick={() => downloadFile(file14, 'puppet3_v14.html')} className="bg-violet-500/80 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-sm">
              💾 v14
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-4">
          {([
            ['info', 'ℹ️ Анализ'],
            ['compare', '🔍 Сравнение скриптов'],
            ['sidebyside', '👁️ Визуальное сравнение'],
            ['merged', '🔗 Объединение']
          ] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-purple-500 text-white shadow-lg' : 'text-purple-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid md:grid-cols-4 gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{diffDetails.identical.length}</div>
                <div className="text-green-300 text-sm">Одинаковых</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{diffDetails.different.length}</div>
                <div className="text-yellow-300 text-sm">С различиями</div>
              </div>
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-pink-400">{diffDetails.onlyIn13.length}</div>
                <div className="text-pink-300 text-sm">Только в v13</div>
              </div>
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-violet-400">{diffDetails.onlyIn14.length}</div>
                <div className="text-violet-300 text-sm">Только в v14</div>
              </div>
            </div>

            {/* Script details */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-bold text-white mb-3">📋 Все скрипты в v13:</h3>
              <div className="space-y-1">
                {scripts13.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${
                    s.hasPhysics ? 'bg-yellow-500/10' : 'bg-white/5'
                  }`}>
                    <span className="text-purple-400 font-mono w-6">#{i + 1}</span>
                    <span className="text-white flex-1 truncate">{s.preview}</span>
                    {s.hasPhysics && <span className="text-yellow-300 text-xs bg-yellow-500/20 px-2 py-0.5 rounded">{s.physicsType}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-bold text-white mb-3">📋 Все скрипты в v14:</h3>
              <div className="space-y-1">
                {scripts14.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${
                    s.hasPhysics ? 'bg-yellow-500/10' : 'bg-white/5'
                  }`}>
                    <span className="text-purple-400 font-mono w-6">#{i + 1}</span>
                    <span className="text-white flex-1 truncate">{s.preview}</span>
                    {s.hasPhysics && <span className="text-yellow-300 text-xs bg-yellow-500/20 px-2 py-0.5 rounded">{s.physicsType}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            {diffDetails.different.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-3">⚠️ Скрипты с различиями:</h3>
                {diffDetails.different.map((d, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3 mb-2">
                    <div className="text-white font-medium">{d.name}</div>
                    <div className="flex gap-4 text-sm mt-1">
                      <span className="text-pink-300">v13: {(d.len13 / 1024).toFixed(1)} KB</span>
                      <span className="text-violet-300">v14: {(d.len14 / 1024).toFixed(1)} KB</span>
                      <span className="text-yellow-300">Разница: {Math.abs(d.len14 - d.len13)} символов</span>
                      <span className="text-gray-400">Первое отличие: позиция {d.firstDiff}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {diffDetails.onlyIn14.length > 0 && (
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-violet-300 mb-3">✨ Только в v14 (новые модули):</h3>
                {diffDetails.onlyIn14.map((name, i) => (
                  <div key={i} className="text-white p-2 bg-violet-500/10 rounded mb-1">🆕 {name}</div>
                ))}
              </div>
            )}

            {diffDetails.onlyIn13.length > 0 && (
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-pink-300 mb-3">🔙 Только в v13:</h3>
                {diffDetails.onlyIn13.map((name, i) => (
                  <div key={i} className="text-white p-2 bg-pink-500/10 rounded mb-1">📌 {name}</div>
                ))}
              </div>
            )}

            {diffDetails.identical.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-green-300 mb-3">✅ Идентичные скрипты:</h3>
                <div className="text-green-200 text-sm">{diffDetails.identical.join(', ')}</div>
              </div>
            )}
          </div>
        )}

        {/* Side by Side Tab */}
        {activeTab === 'sidebyside' && (
          <div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSideBySideMode('both')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${sideBySideMode === 'both' ? 'bg-purple-500 text-white' : 'bg-white/10 text-purple-300'}`}
              >
                👥 Обе версии
              </button>
              <button
                onClick={() => setSideBySideMode('v13')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${sideBySideMode === 'v13' ? 'bg-pink-500 text-white' : 'bg-white/10 text-purple-300'}`}
              >
                Только v13
              </button>
              <button
                onClick={() => setSideBySideMode('v14')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${sideBySideMode === 'v14' ? 'bg-violet-500 text-white' : 'bg-white/10 text-purple-300'}`}
              >
                Только v14
              </button>
            </div>

            <div className={`grid gap-2 ${sideBySideMode === 'both' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {(sideBySideMode === 'both' || sideBySideMode === 'v13') && (
                <div className="bg-black rounded-xl overflow-hidden border border-pink-500/30">
                  <div className="bg-pink-500/20 px-3 py-1.5 text-pink-300 text-sm font-bold">
                    PUPPET 3 v13
                  </div>
                  <iframe
                    src={FILE_13}
                    className="w-full border-0"
                    style={{ height: sideBySideMode === 'both' ? '70vh' : '85vh' }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
                    title="PUPPET 3 v13"
                  />
                </div>
              )}
              {(sideBySideMode === 'both' || sideBySideMode === 'v14') && (
                <div className="bg-black rounded-xl overflow-hidden border border-violet-500/30">
                  <div className="bg-violet-500/20 px-3 py-1.5 text-violet-300 text-sm font-bold">
                    PUPPET 3 v14
                  </div>
                  <iframe
                    src={FILE_14}
                    className="w-full border-0"
                    style={{ height: sideBySideMode === 'both' ? '70vh' : '85vh' }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
                    title="PUPPET 3 v14"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Merged Tab */}
        {activeTab === 'merged' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-3">🔗 Стратегия объединения</h2>
              <div className="text-blue-200 space-y-2">
                <p>📌 <strong>Основа:</strong> v14 (содержит всё из v13 + модуль ASM сборки из частей)</p>
                <p>📌 <strong>Физика:</strong> {diffDetails.different.length > 0 
                  ? `Обнаружено ${diffDetails.different.length} скриптов с различиями. Используйте визуальное сравнение для определения лучшей версии.`
                  : 'Все секции физики идентичны в обеих версиях.'
                }</p>
                <p>📌 <strong>Рекомендация:</strong> v14 является полной версией. Используйте её как основную.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <h3 className="text-lg font-bold text-white mb-2">💾 Скачать файлы</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => downloadFile(file13, 'puppet3_v13.html')}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-3 rounded-lg font-bold transition-colors"
                  >
                    📄 Скачать v13 ({(file13.length / 1024).toFixed(0)} KB)
                  </button>
                  <button
                    onClick={() => downloadFile(file14, 'puppet3_v14.html')}
                    className="w-full bg-violet-500 hover:bg-violet-600 text-white px-4 py-3 rounded-lg font-bold transition-colors"
                  >
                    📄 Скачать v14 ({(file14.length / 1024).toFixed(0)} KB) — рекомендуется
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <h3 className="text-lg font-bold text-white mb-2">🚀 Запустить</h3>
                <div className="space-y-2">
                  <a
                    href={FILE_13}
                    target="_blank"
                    rel="noopener"
                    className="block w-full bg-pink-500/80 hover:bg-pink-500 text-white px-4 py-3 rounded-lg font-bold transition-colors text-center"
                  >
                    🎬 Запустить v13 в новой вкладке
                  </a>
                  <a
                    href={FILE_14}
                    target="_blank"
                    rel="noopener"
                    className="block w-full bg-violet-500/80 hover:bg-violet-500 text-white px-4 py-3 rounded-lg font-bold transition-colors text-center"
                  >
                    🎭 Запустить v14 в новой вкладке
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-bold text-white mb-3">📊 Детальная статистика</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-pink-400 text-2xl font-bold">{scripts13.length}</div>
                  <div className="text-gray-400 text-xs">Скриптов в v13</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-violet-400 text-2xl font-bold">{scripts14.length}</div>
                  <div className="text-gray-400 text-xs">Скриптов в v14</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-green-400 text-2xl font-bold">{diffDetails.identical.length}</div>
                  <div className="text-gray-400 text-xs">Идентичных</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-yellow-400 text-2xl font-bold">{diffDetails.different.length}</div>
                  <div className="text-gray-400 text-xs">С различиями</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
