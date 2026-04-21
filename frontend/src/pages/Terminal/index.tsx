import ThinkingConsole from '@/components/ThinkingConsole'
import type { JobStatusData } from '@/hooks/useJobMonitor'
import { ArrowLeft, Gauge, RadioTower, TerminalSquare } from 'lucide-react'
import { Link } from 'react-router-dom'

interface TerminalPageProps {
  statusData: JobStatusData
}

const statusLabelMap: Record<JobStatusData['jobStatus'], string> = {
  idle: 'Idle',
  uploading: 'Streaming',
  pending_approval: 'Pending Approval',
  success: 'Completed',
  failed: 'Failed',
}

export default function TerminalPage({ statusData }: TerminalPageProps) {
  const totalFiles = Object.keys(statusData.fileMetrics).length
  const activeFiles = Object.values(statusData.fileMetrics).filter((metric) => metric.percent > 0 && metric.percent < 100).length
  const completedFiles = Object.values(statusData.fileMetrics).filter((metric) => metric.percent >= 100).length

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#010409] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.28),transparent_24%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.88),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(30,64,175,0.2),transparent_28%),linear-gradient(180deg,#010409_0%,#03101f_44%,#010409_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.18)_1px,transparent_1px)] bg-[size:32px_32px] opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(1,4,9,0.12)_46%,rgba(1,4,9,0.85)_100%)]" />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 rounded-[1.75rem] border border-cyan-400/15 bg-black/35 px-4 py-4 shadow-[0_18px_60px_rgba(2,6,23,0.5)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/14"
              >
                <ArrowLeft className="h-4 w-4" />
                Return /dashboard
              </Link>

              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                  <TerminalSquare className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/60">Monitor Terminal</p>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">Full-Screen Streaming Console</h1>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Job Status</p>
                <p className="mt-2 text-lg font-semibold text-cyan-50">{statusLabelMap[statusData.jobStatus]}</p>
                <p className="mt-1 text-xs text-slate-500">{statusData.currentJobId ? `Job ${statusData.currentJobId}` : 'Waiting for next run'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Stream Events</p>
                <p className="mt-2 text-lg font-semibold text-cyan-50">{statusData.streamMessages.length}</p>
                <p className="mt-1 text-xs text-slate-500">{activeFiles} active / {completedFiles} completed</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Tracked Files</p>
                <p className="mt-2 text-lg font-semibold text-cyan-50">{totalFiles}</p>
                <p className="mt-1 text-xs text-slate-500">{statusData.error ? 'Review latest error below' : 'JSON output wraps safely in console'}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-cyan-500/12 bg-black/30 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.42)] backdrop-blur-xl">
            <div className="rounded-[1.4rem] border border-white/8 bg-[#02060d]/90 p-4">
              <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-100/65">Control Plane</p>
              <h2 className="mt-3 text-xl font-semibold text-white">Realtime Monitor</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                独立监控页直接消费全局 `useJobMonitor` 流式状态，日志、JSON 块和彩色胶囊样式都沿用旧终端规范。
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-cyan-100">
                  <Gauge className="h-4 w-4" />
                  <p className="text-sm font-semibold">Pipeline Pulse</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#38bdf8_45%,#22d3ee_100%)] shadow-[0_0_18px_rgba(34,211,238,0.55)] transition-[width] duration-500"
                    style={{
                      width: `${Math.max(
                        6,
                        totalFiles === 0
                          ? statusData.streamMessages.length > 0
                            ? 18
                            : 6
                          : Math.round(
                              Object.values(statusData.fileMetrics).reduce((sum, metric) => sum + metric.percent, 0) / totalFiles,
                            ),
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-400">
                  当前进度由真实 `fileMetrics.percent` 聚合而来；若尚未进入文件级处理，则使用流事件数维持最小活跃反馈。
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-cyan-100">
                  <RadioTower className="h-4 w-4" />
                  <p className="text-sm font-semibold">Live Notes</p>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-400">
                  <p>胶囊 Badge、`pre-wrap` 自动换行和 JSON 区块样式由全局 `.terminal-window` 规则接管。</p>
                  <p>终端区域会持续复用同一份全局日志，不会在切到 `/terminal` 后丢失已收到的 SSE 内容。</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-h-0 rounded-[1.9rem] border border-cyan-400/12 bg-black/30 p-3 shadow-[0_22px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl">
            <ThinkingConsole
              logs={statusData.streamMessages}
              jobStatus={statusData.jobStatus}
              currentJobId={statusData.currentJobId}
              error={statusData.error}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
