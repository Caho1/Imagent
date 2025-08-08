import { useState } from 'react'
import { CloudArrowUpIcon, PhotoIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import Upload from './pages/Upload'

export default function App() {
  const [tab, setTab] = useState<'upload'|'gallery'|'admin'>('upload')

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 bg-dots">
      <header className="glass-panel sticky top-0 z-10">
        <div className="container-lg py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-400 shadow-glow" />
            <h1 className="text-xl font-semibold text-gradient">Primitive 编排器</h1>
          </div>
          <nav className="flex gap-2">
            <button onClick={() => setTab('upload')} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-primary-100 ${tab==='upload'?'bg-primary-100 text-primary-700':'text-gray-700'}`}>
              <CloudArrowUpIcon className="h-5 w-5"/> 上传与生成
            </button>
            <button onClick={() => setTab('gallery')} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-primary-100 ${tab==='gallery'?'bg-primary-100 text-primary-700':'text-gray-700'}`}>
              <PhotoIcon className="h-5 w-5"/> 图库
            </button>
            <button onClick={() => setTab('admin')} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-primary-100 ${tab==='admin'?'bg-primary-100 text-primary-700':'text-gray-700'}`}>
              <Cog6ToothIcon className="h-5 w-5"/> 管理
            </button>
          </nav>
        </div>
      </header>

      <main className="container-lg py-8">
        {tab === 'upload' && <Upload layout="split" />}
        {tab === 'gallery' && (
          <div className="text-gray-500">图库功能稍后提供</div>
        )}
        {tab === 'admin' && (
          <div className="text-gray-500">管理后台稍后提供</div>
        )}
      </main>

      <footer className="container-lg py-8 text-sm text-gray-500">
        引擎基于 <a className="underline" href="https://github.com/fogleman/primitive" target="_blank" rel="noreferrer">fogleman/primitive</a>
      </footer>
    </div>
  )
} 