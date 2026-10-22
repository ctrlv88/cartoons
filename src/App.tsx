import { useState, useRef, useCallback } from 'react'

interface UploadedFile {
  name: string
  content: string
  size: number
  type: string
}

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = []
    
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        newFiles.push({
          name: file.name,
          content: content,
          size: file.size,
          type: file.type || 'text/plain'
        })
        
        if (newFiles.length === fileList.length) {
          setFiles(prev => [...prev, ...newFiles])
        }
      }
      reader.readAsText(file)
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
  }

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = content
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const copyAll = async () => {
    const allContent = files.map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(allContent)
      alert('Все файлы скопированы в буфер обмена!')
    } catch {
      alert('Не удалось скопировать')
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (name: string) => {
    if (name.endsWith('.html')) return '🌐'
    if (name.endsWith('.js')) return '⚡'
    if (name.endsWith('.css')) return '🎨'
    if (name.endsWith('.json')) return '📋'
    return '📄'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            📂 Загрузчик файлов
          </h1>
          <p className="text-purple-200 text-lg">
            Загрузите ваши HTML/JS файлы, скопируйте код и пришлите мне в чат
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 mb-8
            ${dragOver 
              ? 'border-purple-400 bg-purple-500/20 scale-105' 
              : 'border-purple-400/50 bg-white/5 hover:bg-white/10 hover:border-purple-400'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".html,.htm,.js,.css,.json,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-6xl mb-4">
            {dragOver ? '📥' : '📁'}
          </div>
          <p className="text-white text-xl font-semibold mb-2">
            {dragOver ? 'Отпустите файлы здесь!' : 'Перетащите файлы сюда'}
          </p>
          <p className="text-purple-300">
            или нажмите для выбора • Поддерживаются: HTML, JS, CSS, JSON, TXT
          </p>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                📋 Загруженные файлы ({files.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={copyAll}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  📋 Скопировать всё
                </button>
                <button
                  onClick={() => setFiles([])}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  🗑️ Очистить
                </button>
              </div>
            </div>

            {files.map((file, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden"
              >
                {/* File Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(file.name)}</span>
                    <div>
                      <p className="text-white font-semibold">{file.name}</p>
                      <p className="text-purple-300 text-sm">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(file.content, index)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        copiedIndex === index
                          ? 'bg-green-500 text-white'
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {copiedIndex === index ? '✅ Скопировано!' : '📋 Копировать'}
                    </button>
                    <button
                      onClick={() => removeFile(index)}
                      className="px-3 py-1.5 rounded-lg font-medium text-sm bg-red-500/80 hover:bg-red-600 text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* File Content Preview */}
                <div className="p-4 max-h-64 overflow-y-auto">
                  <pre className="text-green-300 text-xs font-mono whitespace-pre-wrap break-all bg-black/30 p-3 rounded-lg">
                    {file.content.length > 3000 
                      ? file.content.substring(0, 3000) + '\n\n... (обрезано, полный код доступен через кнопку "Копировать")'
                      : file.content
                    }
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">📖 Инструкция:</h3>
          <ol className="text-purple-200 space-y-3 list-decimal list-inside">
            <li>Загрузите файлы обеих программ (HTML, JS, CSS)</li>
            <li>Нажмите <strong className="text-white">"📋 Копировать"</strong> рядом с каждым файлом</li>
            <li>Вставьте скопированный код в чат со мной</li>
            <li>Или нажмите <strong className="text-white">"📋 Скопировать всё"</strong> чтобы скопировать все файлы разом</li>
            <li>Я объединю ваши программы в одно приложение! 🚀</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default App
