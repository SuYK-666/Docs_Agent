import TaskController from '@/components/TaskController'
import { GlassEffect, GlassFilter } from '@/components/ui/liquid-glass'
import type { JobStatusData, StartJobOptions } from '@/hooks/useJobMonitor'
import MetricCharts from '@/pages/Dashboard/MetricCharts'
import {
  Activity,
  ArrowRight,
  ChartColumnBig,
  FileStack,
  PanelsTopLeft,
  Sparkles,
  TerminalSquare,
  Workflow,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const timelineBlocks = [
  {
    title: 'Document Intake',
    owner: 'Reader Agent',
    status: 'Queued',
    note: '预留文件级时间轴卡片、首段解析状态和数据进入调度室的入口信息。',
  },
  {
    title: 'Review Pipeline',
    owner: 'Reviewer Group',
    status: 'Running',
    note: '预留阶段状态、节点 ETA、关键摘要和多智能体协同过程中的横向信息流。',
  },
  {
    title: 'Dispatch Window',
    owner: 'Dispatcher',
    status: 'Pending',
    note: '预留最终下发、审批确认、结果回写以及失败重试的时间轴节点。',
  },
]

const dashboardSignals = [
  '左侧聚焦任务发起与参数配置，减少对图表横向空间的挤压。',
  '右侧上半区横向展开 KPI 与图表，给 ECharts 和拓扑视图留出更多宽度。',
  '右侧下半区保留为执行时间轴，方便后续接入旧版任务流与节点状态。',
]

interface DashboardPageProps {
  startJob: (options: StartJobOptions) => Promise<void>
  statusData: JobStatusData
}

export default function DashboardPage({ startJob, statusData }: DashboardPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <GlassFilter />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.16),transparent_24%),linear-gradient(145deg,#07111f_0%,#0d1728_45%,#081018_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <GlassEffect
          className="rounded-[2rem] px-5 py-4"
          contentClassName="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/20">
              <Workflow className="h-6 w-6 text-cyan-100" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/75">Dashboard</p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">System Command Room</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
              Wide-Screen Layout
            </span>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16"
            >
              Back to landing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </GlassEffect>

        <section className="grid flex-1 gap-6 py-6 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <div className="flex h-full flex-col gap-6">
              <GlassEffect className="rounded-[2rem] p-6" contentClassName="w-full">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/70">Command Rail</p>
                    <h2 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                      Task control and launch
                    </h2>
                  </div>

                  <div className="grid gap-2 text-sm text-white/72">
                    {dashboardSignals.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl bg-black/18 px-4 py-3">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-none text-cyan-100" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassEffect>

              <TaskController startJob={startJob} statusData={statusData} />
            </div>
          </div>

          <div className="xl:col-span-9">
            <div className="flex h-full flex-col gap-6">
              <div className="grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <MetricCharts />
                </div>

                <div className="xl:col-span-4">
                  <GlassEffect className="h-full rounded-[2rem] p-6" contentClassName="flex h-full w-full flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/70">Topology / Actions</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Wide-side utility rail</h3>
                      </div>
                      <ChartColumnBig className="h-6 w-6 text-cyan-100" />
                    </div>

                    <div className="mt-5 flex-1 space-y-3">
                      <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Workflow className="h-5 w-5 text-cyan-100" />
                          <div>
                            <p className="font-semibold text-white">Topology placeholder</p>
                            <p className="text-sm text-white/62">预留系统拓扑、Agent 连线图和节点健康度的横向展示区。</p>
                          </div>
                        </div>
                      </div>

                      <Link
                        to="/terminal"
                        className="block rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 transition hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">Open terminal page</p>
                            <p className="mt-1 text-sm text-white/62">跳转到全屏监控终端，查看实时流式日志与系统状态。</p>
                          </div>
                          <TerminalSquare className="h-5 w-5 text-cyan-100" />
                        </div>
                      </Link>

                      <Link
                        to="/workspace"
                        className="block rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 transition hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">Open workspace page</p>
                            <p className="mt-1 text-sm text-white/62">跳转到审批与预览工作台，后续承接旧 Vue 的审阅流。</p>
                          </div>
                          <PanelsTopLeft className="h-5 w-5 text-cyan-100" />
                        </div>
                      </Link>

                      <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <FileStack className="h-5 w-5 text-cyan-100" />
                          <div>
                            <p className="font-semibold text-white">Reserved card slot</p>
                            <p className="text-sm text-white/62">保留给上传摘要、筛选器、拓扑控制器或未来的快捷调度面板。</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassEffect>
                </div>
              </div>

              <GlassEffect className="rounded-[2rem] p-6" contentClassName="w-full">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/70">Execution Timeline</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Horizontal timeline region</h3>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/75">
                    <Activity className="h-4 w-4 text-emerald-200" />
                    {statusData.isSubmitting ? 'Streaming live queue' : 'Timeline placeholder'}
                  </span>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  {timelineBlocks.map((block, index) => (
                    <div key={block.title} className="rounded-[1.6rem] border border-white/10 bg-black/18 px-5 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/42">Step {index + 1}</p>
                          <p className="mt-2 text-xl font-semibold text-white">{block.title}</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/78">{block.status}</span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-white/58">{block.note}</p>
                      <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-white/44">Owner</span>
                        <span className="font-medium text-cyan-100">{block.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassEffect>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
