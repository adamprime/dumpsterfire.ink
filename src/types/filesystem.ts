import type { ModelChoice } from '../lib/analysis'

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
  ai: {
    provider: 'anthropic' | 'openai' | null
    anthropicKey?: string
    openaiKey?: string
    modelChoice?: ModelChoice
    autoAnalyze: boolean
  }
  editor: {
    fontSize: number
    lineHeight: number
    maxWidth: 'narrow' | 'medium' | 'wide' | 'full'
    fontFamily: 'sans' | 'serif' | 'mono' | 'handwritten' | 'theme'
  }
  goals: {
    dailyWordGoal: number
    showProgressBar: boolean
  }
}
