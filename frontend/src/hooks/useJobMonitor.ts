import { useEffect, useRef, useState } from 'react'

export type JobInputTab = 'upload' | 'paste' | 'crawl'
export type JobMode = 'preview' | 'email'

export type UploadSourceFile =
  | File
  | {
      name: string
      raw?: File | null
    }

export interface StartJobOptions {
  provider: string
  apiKey: string
  mode: JobMode | string
  inputTab: JobInputTab | string
  emailTypes: string[]
  pastedText?: string
  crawlUrl?: string
  crawlKeyword?: string
  crawlCount?: number
  files?: UploadSourceFile[]
}

export interface JobFileMetric {
  percent: number
  tokens: number
  detail: string
  status: 'pending' | 'active' | 'done' | 'error'
}

export interface JobStreamMessage {
  id: number
  time: string
  fileName: string
  event: string
  agent: string
  content: string
  raw: Record<string, unknown>
}

export interface JobDraft {
  doc_id?: string
  title?: string
  draft_token?: string
  draft_json?: unknown
  [key: string]: unknown
}

export interface JobReport {
  doc_id?: string
  title?: string
  [key: string]: unknown
}

export interface JobStatusData {
  currentJobId: string
  isSubmitting: boolean
  jobStatus: 'idle' | 'uploading' | 'pending_approval' | 'success' | 'failed'
  error: string | null
  drafts: JobDraft[]
  reports: JobReport[]
  recipientEmails: string[]
  emailResult: unknown
  fileMetrics: Record<string, JobFileMetric>
  streamMessages: JobStreamMessage[]
  agentStatuses: Record<string, 'active' | 'done'>
}

const initialStatusData: JobStatusData = {
  currentJobId: '',
  isSubmitting: false,
  jobStatus: 'idle',
  error: null,
  drafts: [],
  reports: [],
  recipientEmails: [''],
  emailResult: null,
  fileMetrics: {},
  streamMessages: [],
  agentStatuses: {},
}

function normalizeUploadFiles(files: UploadSourceFile[] = []) {
  return files
    .map((file) => {
      if (file instanceof File) {
        return { name: file.name, raw: file }
      }

      if (file.raw) {
        return { name: file.name || file.raw.name, raw: file.raw }
      }

      return null
    })
    .filter((file): file is { name: string; raw: File } => Boolean(file))
}

function estimateTokenDelta(text: unknown) {
  const normalized = String(text || '').trim()
  return normalized ? Math.max(1, Math.ceil(normalized.length / 2)) : 0
}

export function useJobMonitor() {
  const [statusData, setStatusData] = useState<JobStatusData>(initialStatusData)
  const eventSourceRef = useRef<EventSource | null>(null)
  const messageIdRef = useRef(0)

  function closeEventSource() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  function updateFileMetric(fileName: string, updates: Partial<JobFileMetric>) {
    if (!fileName) return

    setStatusData((current) => {
      const existingMetric = current.fileMetrics[fileName] ?? {
        percent: 0,
        tokens: 0,
        detail: '等待调度',
        status: 'pending' as const,
      }

      return {
        ...current,
        fileMetrics: {
          ...current.fileMetrics,
          [fileName]: {
            ...existingMetric,
            ...updates,
          },
        },
      }
    })
  }

  function startStatusTracking(jobId: string) {
    closeEventSource()

    const nextEventSource = new EventSource(`/api/jobs/${jobId}/events?from_seq=0`)
    eventSourceRef.current = nextEventSource

    nextEventSource.addEventListener('stream', (event) => {
      try {
        const streamData = JSON.parse(event.data) as Record<string, unknown>
        const fileName = String(streamData.file_name || '合并任务')
        const eventType = String(streamData.event || 'token')
        const now = new Date()
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

        setStatusData((current) => {
          const existingMetric = current.fileMetrics[fileName] ?? {
            percent: 0,
            tokens: 0,
            detail: '等待调度',
            status: 'pending' as const,
          }

          const nextMetric: JobFileMetric = { ...existingMetric, status: 'active' }
          const nextAgentStatuses = { ...current.agentStatuses }
          const content = String(streamData.content || '')
          const agent = String(streamData.agent || 'System')

          if (eventType === 'token_update') {
            nextMetric.tokens = Number(streamData.tokens || streamData.usage_tokens || 0)
          } else if (eventType === 'token') {
            nextMetric.tokens += estimateTokenDelta(streamData.content)
          }

          if (eventType === 'stage_start') {
            const agentKey = String(streamData.agent || '').toLowerCase()
            if (agentKey) nextAgentStatuses[agentKey] = 'active'

            const percent = agentKey === 'reader' ? 25 : agentKey === 'reviewer' ? 55 : 85
            nextMetric.percent = percent
            nextMetric.detail = content || '处理中...'
            nextMetric.status = 'active'
          } else if (eventType === 'stage_done') {
            const agentKey = String(streamData.agent || '').toLowerCase()
            if (agentKey) nextAgentStatuses[agentKey] = 'done'

            const percent = agentKey === 'reader' ? 50 : 80
            nextMetric.percent = percent
            nextMetric.detail = '节点处理完成'
          }

          const nextStreamMessages =
            eventType === 'token' && content
              ? [
                  ...current.streamMessages,
                  {
                    id: messageIdRef.current++,
                    time,
                    fileName,
                    event: eventType,
                    agent,
                    content,
                    raw: streamData,
                  },
                ]
              : current.streamMessages

          return {
            ...current,
            fileMetrics: {
              ...current.fileMetrics,
              [fileName]: nextMetric,
            },
            agentStatuses: nextAgentStatuses,
            streamMessages: nextStreamMessages,
          }
        })
      } catch {}
    })

    nextEventSource.addEventListener('job', (event) => {
      try {
        const jobData = JSON.parse(event.data) as Record<string, unknown>

        if (jobData.status === 'pending_approval') {
          closeEventSource()
          setStatusData((current) => ({
            ...current,
            isSubmitting: false,
            jobStatus: 'pending_approval',
            drafts: Array.isArray(jobData.drafts) ? (jobData.drafts as JobDraft[]) : [],
            recipientEmails:
              Array.isArray(jobData.recipient_emails) && jobData.recipient_emails.length > 0
                ? (jobData.recipient_emails as string[])
                : [''],
          }))
        } else if (jobData.status === 'success') {
          closeEventSource()
          setStatusData((current) => {
            const nextFileMetrics = Object.fromEntries(
              Object.entries(current.fileMetrics).map(([fileName, metric]) => [
                fileName,
                {
                  ...metric,
                  percent: 100,
                  detail: '任务执行完毕',
                  status: 'done' as const,
                },
              ]),
            )

            return {
              ...current,
              isSubmitting: false,
              jobStatus: 'success',
              reports: Array.isArray(jobData.reports) ? (jobData.reports as JobReport[]) : [],
              emailResult: jobData.email_result ?? null,
              fileMetrics: nextFileMetrics,
            }
          })
        } else if (jobData.status === 'failed') {
          closeEventSource()
          setStatusData((current) => ({
            ...current,
            isSubmitting: false,
            jobStatus: 'failed',
          }))
        }
      } catch {}
    })
  }

  async function startJob(options: StartJobOptions) {
    if (!options.apiKey) {
      setStatusData((current) => ({
        ...current,
        error: '请先填写 API Key',
      }))
      return
    }

    const normalizedFiles = normalizeUploadFiles(options.files)
    const nextFileMetrics = normalizedFiles.reduce<Record<string, JobFileMetric>>((metrics, file) => {
      metrics[file.name] = {
        percent: 2,
        tokens: 0,
        detail: '正在初始化...',
        status: 'active',
      }
      return metrics
    }, {})

    const formData = new FormData()
    formData.append('llm_provider', options.provider)
    formData.append('api_key', options.apiKey)
    formData.append('mode', options.mode)
    formData.append('input_tab', options.inputTab)
    formData.append('email_file_types', options.emailTypes.join(','))
    formData.append('report_layout_md', 'separate')
    formData.append('report_layout_html', 'separate')
    formData.append('report_layout_docx', 'bundle')

    if (options.inputTab === 'crawl') {
      formData.append('crawl_url', options.crawlUrl || '')
      formData.append('crawl_count', String(options.crawlCount ?? 5))
      if (options.crawlKeyword) formData.append('crawl_keyword', options.crawlKeyword)
    } else if (options.inputTab === 'paste') {
      formData.append('pasted_text', options.pastedText || '')
    } else {
      normalizedFiles.forEach((file) => formData.append('files', file.raw))
    }

    setStatusData((current) => ({
      ...current,
      isSubmitting: true,
      jobStatus: 'uploading',
      error: null,
      drafts: [],
      reports: [],
      recipientEmails: [''],
      emailResult: null,
      streamMessages: [],
      agentStatuses: {},
      fileMetrics: nextFileMetrics,
    }))

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '提交失败')

      setStatusData((current) => ({
        ...current,
        currentJobId: data.job_id,
        error: null,
      }))

      startStatusTracking(data.job_id)
    } catch (error) {
      closeEventSource()
      setStatusData((current) => ({
        ...current,
        isSubmitting: false,
        jobStatus: 'failed',
        error: error instanceof Error ? error.message : '提交失败',
      }))
    }
  }

  useEffect(() => {
    return () => {
      closeEventSource()
    }
  }, [])

  return {
    startJob,
    statusData,
  }
}

export default useJobMonitor
