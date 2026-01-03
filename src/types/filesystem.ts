export interface EntryMetadata {
  id: string
  date: string
  session: number
  createdAt: string
  updatedAt: string
  wordCount: number
  goalReached: boolean
  writingTimeSeconds: number
  analysis?: EntryAnalysis
}

export interface EntryAnalysis {
  analyzedAt: string
  provider: 'anthropic' | 'openai'
  model: string
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral' | 'mixed'
    score: number
  }
  themes: string[]
  mindset: string
  summary: string
}

export interface DumpsterFireSettings {
  version: string
  security: {
    mode: 'open' | 'app-lock' | 'encrypted'
    passwordHash?: string
    passwordSalt?: string
  }
  ai: {
    provider: 'anthropic' | 'openai' | null
    anthropicKeyEncrypted?: string
    openaiKeyEncrypted?: string
    autoAnalyze: boolean
  }
  editor: {
    fontSize: number
    lineHeight: number
    maxWidth: 'narrow' | 'medium' | 'wide' | 'full'
  }
  goals: {
    dailyWordGoal: number
    showProgressBar: boolean
  }
}

export interface AnalysisQueueItem {
  entryPath: string
  queuedAt: string
  attempts: number
}
