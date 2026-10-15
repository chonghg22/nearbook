import { Injectable, Logger } from '@nestjs/common'

export const CURATION_JOBS = {
  'curation:loan': '10 3 * * *',
  'curation:trend': '20 3 * * *',
  'curation:keywords': '30 3 1 * *',
  'curation:categories': '35 3 * * *',
  'curation:new-arrivals': '40 3 * * *',
} as const
export type CurationJob = keyof typeof CURATION_JOBS
type RefreshResult = {
  refreshed: boolean | number
  count?: number
  skipped?: number
  periodKey?: string
  reason?: string
}
type RunState = {
  state: 'running' | 'success' | 'partial' | 'empty' | 'failed' | 'blocked'
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  count: number | null
  periodKey: string | null
  lastSuccessAt: string | null
  reason: string | null
}

@Injectable()
export class JobStatusService {
  private readonly logger = new Logger(JobStatusService.name)
  readonly runtimeStartedAt = new Date().toISOString()
  private readonly states = new Map<CurationJob, RunState>()

  getStatus() {
    return Object.fromEntries([...this.states].map(([key, value]) => [key, { ...value }]))
  }

  /** Same-process overlap guard. Does not claim a distributed job lock or persistence after restart. */
  async run(name: CurationJob, task: () => Promise<RefreshResult>): Promise<void> {
    const previous = this.states.get(name)
    if (previous?.state === 'running') {
      this.logger.warn(JSON.stringify({ event: 'curation-overlap-skipped', job: name }))
      return
    }
    const started = Date.now()
    const current: RunState = {
      state: 'running',
      startedAt: new Date(started).toISOString(),
      finishedAt: null,
      durationMs: null,
      count: null,
      periodKey: null,
      lastSuccessAt: previous?.lastSuccessAt ?? null,
      reason: null,
    }
    this.states.set(name, current)
    try {
      const result = await task()
      current.count = typeof result.count === 'number' ? result.count : null
      current.periodKey = result.periodKey ?? null
      current.state =
        result.refreshed === true || (typeof result.refreshed === 'number' && result.refreshed > 0)
          ? result.skipped
            ? 'partial'
            : 'success'
          : result.reason === 'quota'
            ? 'blocked'
            : result.reason === 'empty'
              ? 'empty'
              : 'failed'
      // Controlled codes only: never publish provider text, SQL errors or query payloads.
      current.reason =
        result.reason === 'quota' || result.reason === 'accounting-unavailable'
          ? result.reason
          : current.state === 'failed'
            ? 'refresh-failed'
            : current.state === 'partial'
              ? 'some-scopes-skipped'
              : current.state === 'empty'
                ? 'empty'
                : null
      if (current.state === 'success') current.lastSuccessAt = new Date().toISOString()
    } catch {
      current.state = 'failed'
      current.reason = 'refresh-failed'
    } finally {
      current.finishedAt = new Date().toISOString()
      current.durationMs = Date.now() - started
      this.logger.log(JSON.stringify({ event: 'curation-result', job: name, ...current }))
    }
  }
}
