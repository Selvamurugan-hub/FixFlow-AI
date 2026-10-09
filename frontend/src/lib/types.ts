export type Mode = 'beginner' | 'developer'
export type Status = 'in_progress' | 'resolved' | 'not_fixed'

export interface Step {
  step: number
  title: string
  description: string
  command: string | null
  expected_result: string
  risky: boolean
}
export interface Diagnosis {
  detected_issue: string
  root_cause: string
  why_this_happened: string
  beginner_explanation: string
  technical_explanation: string
  confidence: number
  category: string
  steps: Step[]
  expected_result: string
  verification: string
  alternative_strategy: string
  strategy_label: string
}
export interface Attempt {
  number: number
  created_at: string
  provider: 'claude' | 'mock'
  diagnosis: Diagnosis
  outcome: 'pending' | 'fixed' | 'not_fixed'
  user_feedback: string | null
}
export interface Session {
  id: string
  created_at: string
  updated_at: string
  problem: string
  error_message: string
  context: string
  mode: Mode
  status: Status
  category: string
  detected_issue: string
  has_screenshot: boolean
  screenshot_analyzed: boolean
  screenshot_note: string | null
  attempts: Attempt[]
}
export interface SessionSummary {
  id: string
  created_at: string
  problem: string
  mode: Mode
  status: Status
  category: string
  detected_issue: string
  attempts_count: number
  has_screenshot: boolean
}
export interface Stats {
  total: number
  resolved: number
  in_progress: number
  not_fixed: number
  success_rate: number | null
  categories: { name: string; count: number }[]
  recent: SessionSummary[]
}
export interface Health {
  status: string
  ai_mode: 'live' | 'mock'
  model: string | null
  max_image_mb: number
  max_attempts: number
  version: string
}
