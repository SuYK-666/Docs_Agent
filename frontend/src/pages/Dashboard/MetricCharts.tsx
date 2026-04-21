import { GlassEffect } from '@/components/ui/liquid-glass'
import * as echarts from 'echarts'
import { Activity, BarChart3, BrainCircuit } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type MetricKey = 'throughput' | 'hitRate' | 'confidence'

type MetricState = Record<
  MetricKey,
  {
    current: number
    target: number
  }
>

const defaultMetricState: MetricState = {
  throughput: { current: 0, target: 0 },
  hitRate: { current: 0, target: 0 },
  confidence: { current: 0, target: 0 },
}

const fallbackSeries = {
  dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  throughputs: [1250, 1800, 2100, 1500, 2600, 1100, 2908],
  confidences: [0.95, 0.96, 0.94, 0.98, 0.97, 0.92, 0.98],
}

const statFormatter = new Intl.NumberFormat('zh-CN')

export default function MetricCharts() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [kpi, setKpi] = useState<MetricState>(defaultMetricState)

  const animateValue = (key: MetricKey, start: number, end: number, duration: number) => {
    let startTimestamp: number | null = null

    const step = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4)
      const current = start + ease * (end - start)

      setKpi((previous) => ({
        ...previous,
        [key]: {
          ...previous[key],
          current,
        },
      }))

      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setKpi((previous) => ({
          ...previous,
          [key]: {
            ...previous[key],
            current: end,
          },
        }))
      }
    }

    window.requestAnimationFrame(step)
  }

  const triggerKPIUpdate = (filesCount: number) => {
    setKpi((previous) => {
      const nextThroughputTarget = previous.throughput.target + filesCount
      const hitFluctuation = Math.random() * 0.4 - 0.1
      const nextHitTarget = Math.min(99.9, previous.hitRate.target + hitFluctuation)
      const confFluctuation = Math.random() * 0.01 - 0.002
      const nextConfidenceTarget = Math.min(0.99, previous.confidence.target + confFluctuation)

      animateValue('throughput', previous.throughput.target, nextThroughputTarget, 1500)
      animateValue('hitRate', previous.hitRate.target, nextHitTarget, 1500)
      animateValue('confidence', previous.confidence.target, nextConfidenceTarget, 1500)

      return {
        throughput: { current: previous.throughput.current, target: nextThroughputTarget },
        hitRate: { current: previous.hitRate.current, target: nextHitTarget },
        confidence: { current: previous.confidence.current, target: nextConfidenceTarget },
      }
    })
  }

  const applyChartSeries = (dates: string[], throughputs: number[], confidences: number[]) => {
    chartInstanceRef.current?.setOption({
      xAxis: [{ data: dates }],
      series: [
        { name: '日均吞吐量', data: throughputs },
        { name: '平均置信度', data: confidences },
      ],
    })
  }

  const initTrendChart = () => {
    if (!chartContainerRef.current) return

    chartInstanceRef.current = echarts.init(chartContainerRef.current)
    chartInstanceRef.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#64748b' },
        },
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0' },
      },
      grid: {
        left: '3%',
        right: '3%',
        top: '15%',
        bottom: '5%',
        containLabel: true,
      },
      xAxis: [
        {
          type: 'category',
          data: fallbackSeries.dates,
          axisPointer: { type: 'shadow' },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
        },
      ],
      yAxis: [
        {
          type: 'value',
          name: '吞吐量',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          min: 0,
          max: 3000,
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
        },
        {
          type: 'value',
          name: '置信度',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          min: 0.8,
          max: 1.0,
          splitLine: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
        },
      ],
      series: [
        {
          name: '日均吞吐量',
          type: 'bar',
          barWidth: '30%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1d4ed8' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          data: fallbackSeries.throughputs,
        },
        {
          name: '平均置信度',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          itemStyle: { color: '#10b981' },
          lineStyle: {
            width: 2,
            shadowColor: 'rgba(16, 185, 129, 0.5)',
            shadowBlur: 10,
          },
          data: fallbackSeries.confidences,
        },
      ],
    })
  }

  const fetchChartData = async () => {
    try {
      const response = await fetch('/api/chart_stats')
      if (!response.ok) throw new Error('获取图表数据失败')

      const result = await response.json()
      const dates = result.series.map((item: { date: string }) => item.date)
      const throughputs = result.series.map((item: { throughput: number }) => item.throughput)
      const confidences = result.series.map((item: { confidence: number }) => item.confidence)

      applyChartSeries(dates, throughputs, confidences)
    } catch {
      applyChartSeries(fallbackSeries.dates, fallbackSeries.throughputs, fallbackSeries.confidences)
    }
  }

  const fetchRealSystemStats = async () => {
    try {
      const response = await fetch('/api/system_stats')
      if (!response.ok) throw new Error('无法获取监控数据')

      const realData = await response.json()
      setKpi((previous) => ({
        throughput: { current: previous.throughput.current, target: realData.throughput },
        hitRate: { current: previous.hitRate.current, target: realData.hit_rate },
        confidence: { current: previous.confidence.current, target: realData.confidence },
      }))

      animateValue('throughput', 0, realData.throughput, 1500)
      animateValue('hitRate', 0, realData.hit_rate, 1500)
      animateValue('confidence', 0, realData.confidence, 1500)
    } catch {
      setKpi((previous) => ({
        throughput: { current: previous.throughput.current, target: 14208 },
        hitRate: { current: previous.hitRate.current, target: 94.2 },
        confidence: { current: previous.confidence.current, target: 0.98 },
      }))

      animateValue('throughput', 0, 14208, 1500)
      animateValue('hitRate', 0, 94.2, 1500)
      animateValue('confidence', 0, 0.98, 1500)
    }
  }

  useEffect(() => {
    initTrendChart()
    void fetchRealSystemStats()
    void fetchChartData()

    const resizeChart = () => {
      chartInstanceRef.current?.resize()
    }

    window.addEventListener('resize', resizeChart)
    return () => {
      window.removeEventListener('resize', resizeChart)
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: '吞吐量 (Docs)',
            value: statFormatter.format(Math.floor(kpi.throughput.current)),
            detail: '从旧版 `/api/system_stats` 逻辑迁移而来，保留缓动动画。',
            icon: Activity,
            accent: 'text-cyan-100',
          },
          {
            label: 'RAG 命中率',
            value: `${kpi.hitRate.current.toFixed(1)}%`,
            detail: '对应旧版 hitRate 指标与 triggerKPIUpdate 的浮动增长逻辑。',
            icon: BarChart3,
            accent: 'text-emerald-100',
          },
          {
            label: '系统平均置信度',
            value: kpi.confidence.current.toFixed(2),
            detail: '沿用 Vue 版本 confidence 的动画更新与渐进目标值。',
            icon: BrainCircuit,
            accent: 'text-amber-100',
          },
        ].map((metric) => (
          <GlassEffect key={metric.label} className="rounded-[1.75rem] p-5" contentClassName="w-full">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm uppercase tracking-[0.16em] text-white/60">{metric.label}</p>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12">
                  <metric.icon className={`h-5 w-5 ${metric.accent}`} />
                </span>
              </div>
              <div>
                <p className="text-4xl font-semibold text-white">{metric.value}</p>
                <p className="mt-3 text-sm leading-6 text-white/68">{metric.detail}</p>
              </div>
            </div>
          </GlassEffect>
        ))}
      </div>

      <GlassEffect className="rounded-[2rem] p-6" contentClassName="w-full">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/70">Metric Trends</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Legacy KPI + ECharts board</h3>
          </div>
          <button
            onClick={() => triggerKPIUpdate(1)}
            className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16"
          >
            Trigger KPI Pulse
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/18 p-4">
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-100/70">Logic Notes</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
              <p>这里保留了旧版 `animateValue` 的缓动效果，让 KPI 数字以相同节奏刷新。</p>
              <p>图表初始化保留了原版的双轴结构：柱状图展示吞吐量，折线图展示平均置信度。</p>
              <p>接口仍然使用旧版约定的 `/api/chart_stats` 与 `/api/system_stats`，失败时自动回落到旧版 mock 值。</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/18 p-4">
            <div ref={chartContainerRef} className="h-[320px] w-full" />
          </div>
        </div>
      </GlassEffect>
    </div>
  )
}
