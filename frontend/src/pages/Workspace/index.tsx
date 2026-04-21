import { GlassEffect, GlassFilter } from '@/components/ui/liquid-glass'
import { ArrowLeft, PanelsTopLeft, PanelLeftClose, PanelRightClose } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function WorkspacePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <GlassFilter />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,#06101d_0%,#0b1527_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <GlassEffect
          className="rounded-[2rem] px-5 py-4"
          contentClassName="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/20">
              <PanelsTopLeft className="h-6 w-6 text-cyan-100" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/75">Workspace</p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Approval & Preview Workspace</h1>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </GlassEffect>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[0.92fr_1.08fr]">
          <GlassEffect className="rounded-[2rem] p-6" contentClassName="flex h-full w-full flex-col">
            <div className="mb-5 flex items-center gap-3">
              <PanelLeftClose className="h-5 w-5 text-cyan-100" />
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/70">Left Pane</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Approval workflow placeholder</h2>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-black/20 px-6 text-center text-sm leading-7 text-white/65">
              这里预留审批表格、待确认任务、责任人字段和最终下发操作区。
            </div>
          </GlassEffect>

          <GlassEffect className="rounded-[2rem] p-6" contentClassName="flex h-full w-full flex-col">
            <div className="mb-5 flex items-center gap-3">
              <PanelRightClose className="h-5 w-5 text-cyan-100" />
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/70">Right Pane</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Preview & analysis placeholder</h2>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-black/20 px-6 text-center text-sm leading-7 text-white/65">
              这里预留源文件预览、OCR/结构化结果、分析摘要以及后续从旧 Vue 项目迁移来的详细查看面板。
            </div>
          </GlassEffect>
        </section>
      </div>
    </main>
  )
}
