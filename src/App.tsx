import { useState } from 'react'

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'program1' | 'program2'>('home')

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Мои программы</h1>
        <p className="text-gray-500 mb-8">
          Загрузите ваши файлы на GitHub и пришлите ссылку — я объединю их сюда!
        </p>

        <div className="flex flex-col gap-4">
          <button className="bg-gradient-to-r from-pink-400 to-red-500 text-white font-bold py-4 px-8 rounded-xl text-lg hover:scale-105 transition-transform shadow-lg">
            📄 Программа 1
          </button>
          <button className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white font-bold py-4 px-8 rounded-xl text-lg hover:scale-105 transition-transform shadow-lg">
            📄 Программа 2
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-xl text-left">
          <p className="text-sm text-gray-600 font-semibold mb-2">📋 Инструкция:</p>
          <ol className="text-sm text-gray-500 list-decimal list-inside space-y-1">
            <li>Создайте репозиторий на github.com/new</li>
            <li>Загрузите ваши HTML/JS файлы</li>
            <li>Пришлите ссылку: github.com/ваш-username/ваш-репо</li>
            <li>Я прочитаю код и объединю программы!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default App
