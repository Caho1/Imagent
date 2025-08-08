import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

// 添加 Framer Motion 和其他依赖的类型声明
declare global {
  interface Window {
    motion: any;
  }
}

type UploadProps = { layout?: 'split' | 'stack' }

function useApiBase() {
  return useMemo(() => {
    const base = import.meta.env.VITE_API_BASE as string | undefined
    return (base?.replace(/\/$/, '')) || 'http://localhost:8000'
  }, [])
}

interface JobInfo {
  id: string
  status: string
  progress: number
}

export default function Upload({ layout = 'split' }: UploadProps) {
  const apiBase = useApiBase()
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState<JobInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [files, setFiles] = useState<string[]>([])

  // params
  const [n, setN] = useState(100)
  const [m, setM] = useState(1)
  const [s, setS] = useState(1024)
  const [r, setR] = useState(256)
  const [a, setA] = useState(128)
  const [bg, setBg] = useState('avg')
  const [rep, setRep] = useState(0)
  const [nth, setNth] = useState<number | ''>('')
  const [jWorkers, setJWorkers] = useState(0)
  const [v, setV] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)

  // Framer Motion 组件
  const motion = typeof window !== 'undefined' ? window.motion : null

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setLogs([])
    setFiles([])

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('n', String(n))
      fd.append('m', String(m))
      fd.append('s', String(s))
      fd.append('r', String(r))
      fd.append('a', String(a))
      fd.append('bg', String(bg))
      fd.append('rep', String(rep))
      if (nth !== '') fd.append('nth', String(nth))
      fd.append('j', String(jWorkers))
      fd.append('v', String(v))

      const res = await fetch(`${apiBase}/api/jobs`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as JobInfo
      setJob(data)

      // open websocket
      const wsUrl = `${apiBase.replace(/^http/, 'ws')}/ws/jobs/${data.id}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data)
          if (typeof msg.progress === 'number') {
            setJob(prev => prev ? { ...prev, progress: msg.progress } : prev)
          }
          if (msg.message) setLogs(prev => [...prev, msg.message].slice(-400))
        } catch {}
      }
      ws.onclose = () => { wsRef.current = null }
    } catch (err: any) {
      setLogs(prev => [...prev, `提交失败: ${err?.message || err}`])
    } finally {
      setSubmitting(false)
    }
  }

  // poll outputs when we have a job
  useEffect(() => {
    if (!job) return
    let timer: number | undefined

    const tick = async () => {
      try {
        const res = await fetch(`${apiBase}/api/jobs/${job.id}/outputs`)
        if (res.ok) {
          const data = await res.json() as { files: string[] }
          setFiles(data.files)
        }
      } catch {}
      timer = window.setTimeout(tick, 2000)
    }
    tick()
    return () => { if (timer) window.clearTimeout(timer) }
  }, [apiBase, job])

  const inputClass = 'w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg border border-gray-200 focus:outline-none focus:border-[#E31937] bg-white transition-all duration-300 text-xs sm:text-sm font-medium'

  // derived
  const originalUrl = file ? URL.createObjectURL(file) : ''
  const generatedUrl = (job && files.find(f => f.toLowerCase().endsWith('.png') && f.startsWith('output'))) ? `${apiBase}/api/jobs/${job.id}/outputs/output.png` : ''

  // 动效配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Hero Section - 响应式标题区域 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-red-50">
          <div className="absolute inset-0 opacity-30"></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
            <div className="text-center">
              <h1 className="text-4xl sm:text-6xl lg:text-8xl xl:text-9xl font-black text-gray-900 mb-2 sm:mb-4 tracking-tight">
                <span className="text-[#E31937]">AI</span>
                <br />
                <span className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl">图像生成器</span>
              </h1>
              <p className="text-sm sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Advanced Primitive Shape Generation
                <br />
                <span className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900">将复杂图像转换为简洁几何形状</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bento Grid 配置面板 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
          <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

            {/* 文件上传 - 响应式大卡片 */}
            <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border-2 border-gray-200 p-4 sm:p-6 lg:p-8 hover:border-[#E31937] transition-all duration-500 hover:shadow-2xl group">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#E31937] to-[#E31937]/70 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <i className="fas fa-upload text-white text-lg sm:text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900">上传图片</h2>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600">Upload Image File</p>
                </div>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 sm:border-3 border-dashed border-gray-300 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 text-center group-hover:border-[#E31937] transition-colors duration-300">
                  {file ? (
                    <div className="space-y-2 sm:space-y-4">
                      <i className="fas fa-check-circle text-[#E31937] text-2xl sm:text-4xl"></i>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm sm:text-base text-gray-600">Ready to process</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-4">
                      <i className="fas fa-cloud-upload-alt text-gray-400 text-3xl sm:text-4xl lg:text-6xl"></i>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">拖拽文件或点击上传</p>
                      <p className="text-xs sm:text-sm lg:text-base text-gray-600">支持 PNG, JPG 格式 • 建议 256×256 像素</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 快速操作 - 响应式小卡片 */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-[#E31937] to-[#E31937]/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl lg:text-6xl font-black mb-1 sm:mb-2">{n}</div>
                  <div className="text-sm sm:text-base lg:text-lg font-medium opacity-90">Shapes</div>
                  <div className="text-xs sm:text-sm opacity-70">形状数量</div>
                </div>
              </div>

              <button
                disabled={!file || submitting}
                className="w-full bg-gray-900 hover:bg-[#E31937] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 font-bold text-lg sm:text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm sm:text-base">Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <i className="fas fa-play text-sm sm:text-lg lg:text-xl"></i>
                    开始生成
                  </div>
                )}
              </button>
            </div>

            {/* 基础参数网格 */}
            <div className="lg:col-span-12">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <span className="text-[#E31937]">基础参数</span>
                <span className="text-lg sm:text-xl lg:text-2xl font-normal text-gray-500">Basic Parameters</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <BentoParam
                  icon="fas fa-shapes"
                  label="形状数"
                  sublabel="Shape Count"
                  value={n}
                  hint="推荐 50-200 获得最佳效果"
                >
                  <NumberInput value={n} setValue={setN} min={1} max={5000} inputClass={inputClass} />
                </BentoParam>

                <BentoParam
                  icon="fas fa-cube"
                  label="模式"
                  sublabel="Shape Mode"
                  value={m}
                  hint="0=混合 1=三角 2=矩形 3=椭圆 4=圆形"
                >
                  <NumberInput value={m} setValue={setM} min={0} max={8} inputClass={inputClass} />
                </BentoParam>

                <BentoParam
                  icon="fas fa-expand-arrows-alt"
                  label="输出尺寸"
                  sublabel="Output Size"
                  value={s}
                  hint="输出图像的像素尺寸"
                >
                  <NumberInput value={s} setValue={setS} min={64} max={4096} inputClass={inputClass} />
                </BentoParam>
              </div>
            </div>

            {/* 高级参数网格 */}
            <div className="lg:col-span-12">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <span className="text-[#E31937]">高级参数</span>
                <span className="text-lg sm:text-xl lg:text-2xl font-normal text-gray-500">Advanced Parameters</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                <BentoParam
                  icon="fas fa-compress-arrows-alt"
                  label="预采样"
                  sublabel="Resample"
                  value={r}
                  hint="预缩放输入图像"
                >
                  <NumberInput value={r} setValue={setR} min={64} max={4096} inputClass={inputClass} />
                </BentoParam>

                <BentoParam
                  icon="fas fa-adjust"
                  label="透明度"
                  sublabel="Alpha"
                  value={a}
                  hint="颜色透明度，0=自选"
                >
                  <NumberInput value={a} setValue={setA} min={0} max={255} inputClass={inputClass} />
                </BentoParam>

                <BentoParam
                  icon="fas fa-palette"
                  label="背景"
                  sublabel="Background"
                  value={bg}
                  hint="初始背景色"
                >
                  <input value={bg} onChange={e => setBg(e.target.value)} className={inputClass} />
                </BentoParam>

                <BentoParam
                  icon="fas fa-plus"
                  label="附加"
                  sublabel="Repeat"
                  value={rep}
                  hint="每轮附加形状数"
                >
                  <NumberInput value={rep} setValue={setRep} min={0} max={50} inputClass={inputClass} />
                </BentoParam>

                <BentoParam
                  icon="fas fa-film"
                  label="帧间隔"
                  sublabel="Frame Nth"
                  value={nth || 0}
                  hint="输出帧间隔"
                >
                  <input value={nth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNth(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} placeholder="留空=不保存帧" />
                </BentoParam>

                <BentoParam
                  icon="fas fa-cogs"
                  label="并行"
                  sublabel="Workers"
                  value={jWorkers}
                  hint="并行处理数，0=全部"
                >
                  <NumberInput value={jWorkers} setValue={setJWorkers} min={0} max={64} inputClass={inputClass} />
                </BentoParam>

                <BentoParam
                  icon="fas fa-terminal"
                  label="日志"
                  sublabel="Verbose"
                  value={v}
                  hint="日志详尽度"
                >
                  <NumberInput value={v} setValue={setV} min={0} max={2} inputClass={inputClass} />
                </BentoParam>
              </div>
            </div>
          </form>
        </div>

        {/* 结果展示区域 - 响应式 Bento Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* 原图展示 */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 hover:border-[#E31937] transition-all duration-500">
              <h2 className="text-4xl font-black text-gray-900 mb-6 flex items-center gap-4">
                <i className="fas fa-image text-[#E31937]"></i>
                原图
                <span className="text-lg font-normal text-gray-500">Original</span>
              </h2>
              <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                {originalUrl ? (
                  <img src={originalUrl} alt="original" className="max-w-full max-h-full object-contain rounded-xl" />
                ) : (
                  <div className="text-center text-gray-400">
                    <i className="fas fa-image text-4xl mb-4"></i>
                    <p className="text-lg">请先上传图片</p>
                  </div>
                )}
              </div>
            </div>

            {/* 生成结果 */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 hover:border-[#E31937] transition-all duration-500">
              <h2 className="text-4xl font-black text-gray-900 mb-6 flex items-center gap-4">
                <i className="fas fa-magic text-[#E31937]"></i>
                生成结果
                <span className="text-lg font-normal text-gray-500">Generated</span>
              </h2>
              <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                {generatedUrl ? (
                  <img src={generatedUrl} alt="generated" className="max-w-full max-h-full object-contain rounded-xl" />
                ) : (
                  <div className="text-center text-gray-400">
                    <i className="fas fa-cog fa-spin text-4xl mb-4"></i>
                    <p className="text-lg">等待生成结果</p>
                  </div>
                )}
              </div>
              {job && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-900">进度</span>
                    <span className="text-2xl font-black text-[#E31937]">{job.progress}%</span>
                  </div>
                  <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E31937] to-[#E31937]/70 transition-all duration-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 日志和文件区域 */}
        {job && (
          <div className="max-w-7xl mx-auto px-6 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-900 rounded-3xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <i className="fas fa-terminal text-[#E31937]"></i>
                  实时日志
                  <span className="text-sm font-normal opacity-70">Live Logs</span>
                </h3>
                <div className="h-64 overflow-auto bg-black/30 rounded-xl p-4 font-mono text-sm">
                  {logs.length === 0 ? (
                    <div className="text-gray-400">等待输出...</div>
                  ) : (
                    logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl border-2 border-gray-200 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <i className="fas fa-download text-[#E31937]"></i>
                  生成文件
                  <span className="text-sm font-normal text-gray-500">Output Files</span>
                </h3>
                <div className="space-y-3">
                  {files.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                      <i className="fas fa-file text-2xl mb-2"></i>
                      <p>暂无文件</p>
                    </div>
                  ) : (
                    files.map(f => (
                      <a
                        key={f}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-[#E31937]/10 transition-colors group"
                        href={`${apiBase}/api/jobs/${job!.id}/outputs/${encodeURIComponent(f)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="fas fa-file-download text-[#E31937]"></i>
                        <span className="font-medium text-gray-900 group-hover:text-[#E31937]">{f}</span>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )


// Bento Grid 参数组件
function BentoParam({
  icon,
  label,
  sublabel,
  value,
  hint,
  children
}: {
  icon: string
  label: string
  sublabel: string
  value: string | number
  hint: string
  children: ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:border-[#E31937] transition-all duration-300 hover:shadow-sm group">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-gradient-to-br from-[#E31937] to-[#E31937]/70 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
          <i className={`${icon} text-white text-xs`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 truncate">{label}</h4>
          <p className="text-xs text-gray-500">{sublabel}</p>
        </div>
        <div className="text-lg font-black text-[#E31937]">{value}</div>
      </div>

      <div className="mb-2">
        {children}
      </div>

      <p className="text-xs text-gray-500 leading-tight line-clamp-2">{hint}</p>
    </div>
  )
}

function Param({ label, hint, children }: { label: string, hint: string, children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200 hover:border-primary-300 transition-colors">
      <label className="text-sm font-medium text-gray-700 block mb-2">{label}</label>
      {children}
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{hint}</p>
    </div>
  )
}

function NumberInput({ value, setValue, min, max, inputClass }: { value: number, setValue: (v: number) => void, min?: number, max?: number, inputClass: string }) {
  const [raw, setRaw] = useState<string>(String(value ?? ''))

  useEffect(() => {
    setRaw(String(value ?? ''))
  }, [value])

  const clamp = (n: number) => {
    if (typeof min === 'number' && n < min) n = min
    if (typeof max === 'number' && n > max) n = max
    return n
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    if (!/^[-]?\d*$/.test(t)) return
    setRaw(t)
  }

  const commit = () => {
    if (raw === '' || raw === '-') {
      const n = clamp(value)
      setRaw(String(n))
      setValue(n)
      return
    }
    let parsed = Number(raw)
    if (Number.isNaN(parsed)) parsed = value
    parsed = clamp(parsed)
    setValue(parsed)
    setRaw(String(parsed))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      pattern="[0-9]*"
      value={raw}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
      className={inputClass}
    />
  )
}}