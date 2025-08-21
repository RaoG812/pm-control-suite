export type JobState = 'idle' | 'running' | 'success' | 'failed'

export const oint = { state: 'idle' as JobState, jobId: undefined as string | undefined }

export function startJob() {
  oint.state = 'running'
  oint.jobId = Math.random().toString(36).slice(2)
  setTimeout(() => {
    oint.state = 'success'
    // oint.state = 'failed'
  }, 3000)
  return oint.jobId!
}
