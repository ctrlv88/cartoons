import { useState } from 'react'

const FILES = [
  {
    id: 'puppet13',
    name: 'PUPPET 3 (v13)',
    description: 'Базовая версия — мультик с костями, таймлайн, эффекты, сценарий',
    url: 'https://raw.githubusercontent.com/ctrlv88/cartoons/combining-html5-and-js-f6e35/src/puppet3%20(13).html',
    color: 'from-pink-500 to-rose-600',
    emoji: '🎬'
  },
  {
    id: 'puppet14',
    name: 'PUPPET 3 (v14)',
    description: 'Расширенная версия — + сборка героя из готовых PNG-частей',
    url: 'https://raw.githubusercontent.com/ctrlv88/cartoons/combining-html5-and-js-f6e35/src/puppet3%20(14).html',
    color: 'from-violet-500 to-purple-600',
    emoji: '🎭'
  }
]

function App() {
  const [activeProgram, setActiveProgram] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const activeFile = FILES.find(f => f.id === activeProgram)

  if (fullscreen && activeFile) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          <button
            onClick={() => setFullscreen(false)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/20"
          >
            ← Назад к выбору
          </button>
        </div>
        <iframe
          src={activeFile.url}
          className="w-full h-full border-0"
          title={activeFile.name}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
      </div>
    )
  }

  if (activeFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setActiveProgram(null)}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ← Назад
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeFile.emoji}</span>
            <h1 className="text-white font-bold text-lg">{activeFile.name}</h1>
          </div>
          <span className="text-purple-300 text-sm hidden md:block">{activeFile.description}</span>
          <div className="flex-1" />
          <button
            onClick={() => setFullscreen(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ⛶ Полный экран
          </button>
        </div>

        {/* Program iframe */}
        <div className="flex-1 relative">
          <iframe
            src={activeFile.url}
            className="w-full h-full border-0"
            style={{ minHeight: 'calc(100vh - 60px)' }}
            title={activeFile.name}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
          />
        </div>
      </div>
    )
  }

  // Main menu
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            PUPPET 3
          </h1>
          <p className="text-purple-200 text-lg">
            Мультик с костями — выберите версию
          </p>
        </div>

        {/* Program cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {FILES.map(file => (
            <button
              key={file.id}
              onClick={() => setActiveProgram(file.id)}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${file.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`} />
              <div className="relative">
                <div className="text-4xl mb-3">{file.emoji}</div>
                <h2 className="text-xl font-bold text-white mb-2">{file.name}</h2>
                <p className="text-purple-300 text-sm mb-4">{file.description}</p>
                <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${file.color} text-white px-4 py-2 rounded-lg text-sm font-semibold`}>
                  Запустить →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="mt-10 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-3">📖 О программах</h3>
          <div className="text-purple-200 text-sm space-y-2">
            <p><strong className="text-white">PUPPET 3 (v13)</strong> — базовая версия с полной функциональностью: библиотека персонажей, таймлайн с ключевыми кадрами, анимация костей, эффекты (струи, колбаски, газы), система сценариев, запись видео.</p>
            <p><strong className="text-white">PUPPET 3 (v14)</strong> — расширенная версия: всё из v13 + модуль «Сборка героя из готовых частей» (загрузка PNG-частей и автоматическая раскладка по ролям).</p>
          </div>
          <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <p className="text-purple-300 text-xs">
              💡 Источник: <a href="https://github.com/ctrlv88/cartoons" target="_blank" rel="noopener" className="underline hover:text-white">github.com/ctrlv88/cartoons</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
