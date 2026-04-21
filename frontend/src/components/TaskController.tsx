import { GlassEffect } from '@/components/ui/liquid-glass'
import type { JobInputTab, JobStatusData, StartJobOptions } from '@/hooks/useJobMonitor'
import { FileText, Globe, KeyRound, Link2, Mail, Play, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const SETTINGS_UPDATED_EVENT = 'docs-agent-settings-updated'

interface TaskControllerProps {
  startJob: (options: StartJobOptions) => Promise<void>
  statusData: JobStatusData
}

type FormState = {
  provider: string
  apiKey: string
  mode: 'preview' | 'email'
  emailTypes: string[]
  inputTab: JobInputTab
  pastedText: string
  crawlUrl: string
  crawlKeyword: string
  crawlCount: number
}

const inputTabs: Array<{ key: JobInputTab; label: string; icon: typeof Upload }> = [
  { key: 'upload', label: '文件上传', icon: Upload },
  { key: 'paste', label: '快捷粘贴', icon: FileText },
  { key: 'crawl', label: '全网抓取', icon: Globe },
]

const emailTypeOptions = [
  { value: 'md', label: 'MD' },
  { value: 'docx', label: 'Word' },
  { value: 'ics', label: 'ICS' },
]

const emptyStateText = '暂无待处理任务'

const formatMetricStatus = (status: string) => {
  if (status === 'error') return '异常'
  if (status === 'done') return '完成'
  if (status === 'active') return '处理中'
  return '等待调度'
}

export default function TaskController({ startJob, statusData }: TaskControllerProps) {
  const [fileList, setFileList] = useState<File[]>([])
  const [formState, setFormState] = useState<FormState>({
    provider: window.localStorage.getItem('docs_agent_ui_provider') || 'tongyi',
    apiKey: window.localStorage.getItem('docs_agent_ui_api_key') || '',
    mode: 'preview',
    emailTypes: ['md', 'docx', 'ics'],
    inputTab: 'upload',
    pastedText: '',
    crawlUrl: '',
    crawlKeyword: '',
    crawlCount: 5,
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const syncSettings = () => {
      setFormState((current) => ({
        ...current,
        provider: window.localStorage.getItem('docs_agent_ui_provider') || 'tongyi',
        apiKey: window.localStorage.getItem('docs_agent_ui_api_key') || '',
      }))
    }

    window.addEventListener(SETTINGS_UPDATED_EVENT, syncSettings)
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, syncSettings)
  }, [])

  const removeSingleFile = (index: number, fileName: string) => {
    setFileList((current) => current.filter((_, currentIndex) => currentIndex !== index))
    void fileName
  }

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setFileList((current) => [...current, ...files])
    event.target.value = ''
  }

  const toggleEmailType = (value: string) => {
    setFormState((current) => ({
      ...current,
      emailTypes: current.emailTypes.includes(value)
        ? current.emailTypes.filter((item) => item !== value)
        : [...current.emailTypes, value],
    }))
  }

  const handleStartJob = async () => {
    window.localStorage.setItem('docs_agent_ui_provider', formState.provider)
    window.localStorage.setItem('docs_agent_ui_api_key', formState.apiKey)

    await startJob({
      provider: formState.provider,
      apiKey: formState.apiKey,
      mode: formState.mode,
      inputTab: formState.inputTab,
      emailTypes: formState.emailTypes,
      pastedText: formState.pastedText,
      crawlUrl: formState.crawlUrl,
      crawlKeyword: formState.crawlKeyword,
      crawlCount: formState.crawlCount,
      files: fileList,
    })
  }

  return (
    <GlassEffect className="rounded-[2rem] p-6" contentClassName="w-full">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelection} />

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/70">Task Controller</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">任务输入与启动面板</h3>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/75">
          {statusData.isSubmitting ? '任务提交中' : '待命'}
        </span>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">LLM Provider</span>
            <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3">
              <select
                value={formState.provider}
                onChange={(event) => setFormState((current) => ({ ...current, provider: event.target.value }))}
                className="w-full bg-transparent text-sm text-white outline-none"
              >
                <option value="tongyi" className="bg-slate-900">
                  tongyi
                </option>
                <option value="openai" className="bg-slate-900">
                  openai
                </option>
                <option value="deepseek" className="bg-slate-900">
                  deepseek
                </option>
              </select>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">API Key</span>
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3">
              <KeyRound className="h-4 w-4 text-cyan-100" />
              <input
                type="password"
                value={formState.apiKey}
                onChange={(event) => setFormState((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder="填写接口密钥"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
              />
            </div>
          </label>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/18 p-3">
          <div className="grid grid-cols-3 gap-2">
            {inputTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFormState((current) => ({ ...current, inputTab: tab.key }))}
                className={`flex items-center justify-center gap-2 rounded-[1.1rem] px-3 py-2.5 text-sm font-medium transition ${
                  formState.inputTab === tab.key ? 'bg-white/18 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {formState.inputTab === 'upload' && (
              <div className="grid gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[1.5rem] border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center transition hover:bg-white/8"
                >
                  <Upload className="mx-auto h-6 w-6 text-cyan-100" />
                  <p className="mt-3 text-sm font-semibold text-white">拖拽或点击上传</p>
                  <p className="mt-1 text-xs text-white/55">支持多文件选择，后续将继续补充拖拽体验</p>
                </button>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {fileList.map((file, index) => {
                    const metric = statusData.fileMetrics[file.name]

                    return (
                      <div
                        key={`${file.name}-${index}`}
                        className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-900/80 p-3"
                      >
                        {metric && (
                          <div
                            className="absolute inset-y-0 left-0 z-0 bg-blue-900/20 transition-all duration-500"
                            style={{ width: `${metric.percent || 0}%` }}
                          />
                        )}

                        <div className="relative z-10 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                              <p className="text-xs text-white/55">{metric ? formatMetricStatus(metric.status) : '等待调度'}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-mono font-bold ${metric?.status === 'error' ? 'text-red-400' : 'text-cyan-100'}`}>
                                {metric ? `${metric.percent || 0}%` : '0%'}
                              </span>
                              {!statusData.isSubmitting && (
                                <button
                                  onClick={() => removeSingleFile(index, file.name)}
                                  className="rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-red-400"
                                  aria-label={`remove-${file.name}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {metric && (
                            <div className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="flex min-w-0 items-center gap-1 truncate text-white/60" title={metric.detail}>
                                {metric.status === 'active' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />}
                                <span className="truncate">{metric.detail}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-white/70">
                                <Link2 className="h-3 w-3" />
                                {metric.tokens || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {fileList.length === 0 && (
                    <div className="flex h-36 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/12 text-center text-white/45">
                      <Upload className="h-8 w-8" />
                      <p className="mt-3 text-sm">{emptyStateText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {formState.inputTab === 'paste' && (
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3">
                <textarea
                  value={formState.pastedText}
                  onChange={(event) => setFormState((current) => ({ ...current, pastedText: event.target.value }))}
                  rows={9}
                  placeholder="直接粘贴微信/钉钉里的公文正文..."
                  className="w-full resize-none bg-transparent text-sm leading-7 text-white placeholder:text-white/35 outline-none"
                />
              </div>
            )}

            {formState.inputTab === 'crawl' && (
              <div className="grid gap-3">
                <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3">
                  <input
                    value={formState.crawlUrl}
                    onChange={(event) => setFormState((current) => ({ ...current, crawlUrl: event.target.value }))}
                    placeholder="输入抓取 URL"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                  />
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3">
                  <input
                    value={formState.crawlKeyword}
                    onChange={(event) => setFormState((current) => ({ ...current, crawlKeyword: event.target.value }))}
                    placeholder="过滤关键词"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                  />
                </div>
                <div className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3">
                  <span className="text-sm text-white/65">抓取条数</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formState.crawlCount}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        crawlCount: Math.max(1, Math.min(20, Number(event.target.value) || 1)),
                      }))
                    }
                    className="w-20 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-right text-sm text-white outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/18 p-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'preview', label: '仅预览' },
              { value: 'email', label: '邮件下发' },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setFormState((current) => ({ ...current, mode: mode.value as FormState['mode'] }))}
                className={`rounded-[1.1rem] px-3 py-2.5 text-sm font-medium transition ${
                  formState.mode === mode.value ? 'bg-white/18 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {formState.mode === 'email' && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-black/18 p-3">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/55">
                <Mail className="h-3.5 w-3.5" />
                附件格式
              </span>
              <div className="flex flex-wrap gap-2">
                {emailTypeOptions.map((option) => {
                  const active = formState.emailTypes.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleEmailType(option.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        active ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {statusData.error && (
          <div className="rounded-[1.25rem] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {statusData.error}
          </div>
        )}

        <button
          onClick={() => void handleStartJob()}
          disabled={statusData.isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-3 text-sm font-bold tracking-[0.2em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {statusData.isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              安全通道传输中...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              启动智能解析
            </>
          )}
        </button>
      </div>
    </GlassEffect>
  )
}
