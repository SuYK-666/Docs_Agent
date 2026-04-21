import type { JobStatusData, JobStreamMessage } from '@/hooks/useJobMonitor'
import { useEffect, useMemo, useRef, useState } from 'react'

interface ThinkingConsoleProps {
  logs: JobStreamMessage[]
  jobStatus: JobStatusData['jobStatus']
  currentJobId?: string
  error?: string | null
  isDesensitized?: boolean
}

type SystemLogType = 'info' | 'success' | 'warning' | 'error'

type SystemLog = {
  id: string
  time: string
  agent: string
  content: string
  type: SystemLogType
}

type StageKey = 'reader' | 'reviewer' | 'dispatcher'

type GroupedStageLogs = Record<StageKey, JobStreamMessage[]>

const stageOrder: StageKey[] = ['reader', 'reviewer', 'dispatcher']

const stageTitleMap: Record<StageKey, string> = {
  reader: 'STAGE 1: READER',
  reviewer: 'STAGE 2: REVIEWER & CRITIC',
  dispatcher: 'STAGE 3: DISPATCHER',
}

const statusMap: Record<
  JobStatusData['jobStatus'],
  { text: string; color: string; spinning: boolean }
> = {
  idle: { text: 'IDLE', color: 'text-slate-500', spinning: false },
  uploading: { text: 'UPLOADING', color: 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]', spinning: true },
  pending_approval: {
    text: 'PENDING_APPROVAL',
    color: 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)] animate-pulse',
    spinning: false,
  },
  success: { text: 'SUCCESS', color: 'text-emerald-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]', spinning: false },
  failed: { text: 'FAILED', color: 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]', spinning: false },
}

function mapAgentToStage(agent: string): StageKey {
  const normalized = String(agent).toLowerCase()
  if (normalized.includes('review') || normalized.includes('critic')) return 'reviewer'
  if (normalized.includes('dispatch') || normalized.includes('email')) return 'dispatcher'
  return 'reader'
}

function getAgentColor(agent: string) {
  const normalized = String(agent).toLowerCase()
  if (normalized === 'reader') return 'text-blue-400'
  if (normalized === 'dispatcher') return 'text-emerald-400'
  if (normalized === 'critic') return 'text-amber-400'
  if (normalized === 'reviewer') return 'text-slate-400'
  if (normalized === 'system') return 'text-slate-400'
  return 'text-slate-400'
}

function getLogColor(type: string) {
  if (type === 'error') return 'text-red-400'
  if (type === 'success') return 'text-emerald-400'
  if (type === 'warning') return 'text-amber-400'
  return 'text-slate-300'
}

function formatText(text: string, isDesensitized: boolean) {
  if (!isDesensitized || !text) return text

  let safeText = String(text)
  safeText = safeText.replace(/(\d{3})\d{4}(\d{4})/g, '$1****$2')
  safeText = safeText.replace(/(\d{6})\d{8}(\d{4}|\d{3}[Xx])/g, '$1********$2')
  safeText = safeText.replace(/(^.)(.*)(?=@)/g, (_, first, rest) => first + '*'.repeat(rest.length))
  return safeText
}

function nowTimeString() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

function createEmptyStageLogs(): GroupedStageLogs {
  return {
    reader: [],
    reviewer: [],
    dispatcher: [],
  }
}

export default function ThinkingConsole({
  logs,
  jobStatus,
  currentJobId,
  error,
  isDesensitized = false,
}: ThinkingConsoleProps) {
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([])
  const systemScrollRef = useRef<HTMLDivElement | null>(null)
  const stageScrollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const previousJobIdRef = useRef<string>('')
  const previousJobStatusRef = useRef<JobStatusData['jobStatus']>('idle')
  const previousErrorRef = useRef<string | null>(null)

  const groupedFileLogs = useMemo(() => {
    return logs.reduce<Record<string, GroupedStageLogs>>((accumulator, log) => {
      if (!log.fileName || log.fileName === 'Global' || log.agent === 'System') return accumulator

      if (!accumulator[log.fileName]) {
        accumulator[log.fileName] = createEmptyStageLogs()
      }

      accumulator[log.fileName][mapAgentToStage(log.agent)].push(log)
      return accumulator
    }, {})
  }, [logs])

  const statusMeta = statusMap[jobStatus]

  const pushSystemLog = (agent: string, content: string, type: SystemLogType) => {
    setSystemLogs((current) => [
      ...current,
      {
        id: `${agent}-${type}-${current.length}-${Date.now()}`,
        time: nowTimeString(),
        agent,
        content,
        type,
      },
    ])
  }

  useEffect(() => {
    if (currentJobId && previousJobIdRef.current !== currentJobId) {
      pushSystemLog('System', `任务创建成功，JobID: ${currentJobId}`, 'success')
      previousJobIdRef.current = currentJobId
    }
  }, [currentJobId])

  useEffect(() => {
    if (previousJobStatusRef.current === jobStatus) return

    if (jobStatus === 'uploading') pushSystemLog('System', '安全通道已建立，开始接收流式处理日志。', 'info')
    if (jobStatus === 'pending_approval') pushSystemLog('System', '系统进入待审批状态，请核验草稿后继续。', 'warning')
    if (jobStatus === 'success') pushSystemLog('System', '任务全部执行完毕，结果已经写回工作台。', 'success')
    if (jobStatus === 'failed') pushSystemLog('System', '任务执行失败，请检查接口响应与任务参数。', 'error')

    previousJobStatusRef.current = jobStatus
  }, [jobStatus])

  useEffect(() => {
    if (!error || previousErrorRef.current === error) return
    pushSystemLog('System', error, 'error')
    previousErrorRef.current = error
  }, [error])

  useEffect(() => {
    if (systemScrollRef.current) {
      systemScrollRef.current.scrollTop = systemScrollRef.current.scrollHeight
    }
  }, [systemLogs])

  useEffect(() => {
    Object.values(stageScrollRefs.current).forEach((element) => {
      if (!element) return
      element.scrollTop = element.scrollHeight
    })
  }, [logs])

  const renderContent = (content: string, colorClass: string) => {
    const safeText = formatText(content, isDesensitized)
    const isBlock = safeText.includes('\n') || /^[\[{]/.test(safeText.trim())

    if (isBlock) {
      return <pre className={`${colorClass} max-w-full whitespace-pre-wrap break-all`}>{safeText}</pre>
    }

    return <span className={`flex-1 whitespace-pre-wrap break-all ${colorClass}`}>{safeText}</span>
  }

  return (
    <div className="terminal-window flex h-full flex-col overflow-hidden rounded-lg border border-slate-700/50 bg-[#02060d] font-mono shadow-inner">
      <div className="z-20 flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-800/80 px-4 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-3 text-[11px] font-bold tracking-wider text-slate-400">
            root@docs-agent-core:~/pipeline_monitor
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
          {statusMeta.spinning && <span className="animate-spin text-slate-300">↻</span>}
          <span className={`transition-colors duration-300 ${statusMeta.color}`}>{statusMeta.text}</span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto bg-[#050b14]/50 p-4">
        {systemLogs.length > 0 && (
          <div className="flex h-[150px] shrink-0 flex-col overflow-hidden rounded-lg border border-slate-700/50 bg-[#050b14] shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-700/50 bg-slate-800/80 px-3 py-2 text-[10px] font-bold text-slate-400">
              <span>System Kernel (全局调度)</span>
            </div>
            <div ref={systemScrollRef} className="flex-1 overflow-y-auto p-2 text-[11px] leading-relaxed">
              {systemLogs.map((log) => (
                <div key={log.id} className="mb-1 flex items-start rounded px-1 py-0.5 transition-colors hover:bg-slate-800/30">
                  <span className="w-16 shrink-0 tabular-nums text-slate-600">[{log.time}]</span>
                  <span className="w-24 shrink-0 font-bold text-slate-400">[{log.agent.toUpperCase()}]</span>
                  {renderContent(log.content, getLogColor(log.type))}
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.entries(groupedFileLogs).map(([fileName, stages]) => {
          const isTyping = stageOrder.some((stage) => stages[stage].length > 0)

          return (
            <div key={fileName} className="flex h-[460px] max-h-[90%] shrink-0 flex-col overflow-hidden rounded-lg border border-slate-700/50 bg-[#050b14] shadow-lg">
              <div className="flex shrink-0 items-center justify-between border-b border-blue-900/40 bg-blue-900/20 px-4 py-2 text-[11px] font-bold text-blue-400">
                <div className="flex items-center gap-2">
                  <span>{fileName}</span>
                  {isTyping && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />}
                </div>
                <span className="text-[9px] font-normal tracking-widest text-slate-500">
                  PIPELINE VIEW (Shift+Scroll 横向滚动)
                </span>
              </div>

              <div className="custom-scrollbar-horizontal flex flex-1 overflow-x-auto bg-[#02060d]">
                {stageOrder.map((stage) => (
                  <div
                    key={`${fileName}-${stage}`}
                    className={`flex w-[525px] shrink-0 flex-col ${stage !== 'dispatcher' ? 'border-r border-slate-800/50' : ''} ${
                      stage === 'reviewer' ? 'bg-slate-900/10' : stage === 'dispatcher' ? 'bg-slate-900/20' : ''
                    }`}
                  >
                    <div className="sticky top-0 shrink-0 border-b border-slate-800 bg-slate-900/50 py-1 text-center text-[10px] font-bold tracking-widest text-slate-500">
                      {stageTitleMap[stage]}
                    </div>
                    <div
                      ref={(element) => {
                        stageScrollRefs.current[`${fileName}_${stage}`] = element
                      }}
                      className="flex-1 overflow-y-auto p-2 text-[10px]"
                    >
                      {stages[stage].map((log) => (
                        <div key={log.id} className="mb-1.5 flex items-start rounded px-1 py-0.5 hover:bg-slate-800/30">
                          <span className="w-14 shrink-0 tabular-nums text-slate-600">[{log.time}]</span>
                          {stage === 'reviewer' && (
                            <span className={`mr-1 shrink-0 font-bold ${getAgentColor(log.agent)}`}>
                              [{log.agent.slice(0, 3).toUpperCase()}]
                            </span>
                          )}
                          {renderContent(log.content, stage === 'reviewer' ? getLogColor(log.event === 'token' ? 'info' : log.event) : getAgentColor(log.agent))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {systemLogs.length === 0 && Object.keys(groupedFileLogs).length === 0 && (
          <div className="flex h-full select-none items-center justify-center gap-2 italic text-slate-600/70">
            <span className="inline-block h-4 w-1.5 animate-pulse bg-slate-600" />
            Waiting for internal server streams to initialize...
          </div>
        )}
      </div>
    </div>
  )
}
