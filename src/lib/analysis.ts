import { generateText, Output } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import type { EntryAnalysis } from '../types/filesystem'

const ANALYSIS_PROMPT = `You are a supportive, encouraging companion helping someone reflect on their personal writing. This is a mindfulness practice - treat their words with warmth and curiosity, not clinical analysis.

<entry>
{{ENTRY_CONTENT}}
</entry>

GUIDELINES:
- Speak directly to the writer using "you" and "your"
- Be warm, supportive, and curious - like a good friend
- Celebrate the act of writing and self-expression
- Notice what's interesting or meaningful, not what's "weird" or unusual
- If they're processing something difficult, acknowledge it with compassion
- Keep the tone encouraging - this is about self-discovery, not judgment
- Focus on what they DID share, not what's missing`

export const AnalysisSchema = z.object({
  summary: z.string().describe('2-3 sentences warmly reflecting back what you shared, celebrating the act of writing itself'),
  themes: z.array(z.string()).describe('Up to 4 main themes from the writing'),
  sentiment: z.object({
    overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    score: z.number().min(0).max(1).describe('0=very negative, 1=very positive'),
  }),
  mindset: z.string().describe('A gentle, encouraging observation about where your head seems to be at'),
  topWords: z.array(z.string()).describe('Five key words from the writing'),
})

export type ModelChoice = 'default' | 'smarter' | 'cheapest'

function createModel(
  provider: 'anthropic' | 'openai',
  apiKey: string,
  choice: ModelChoice = 'default'
) {
  if (provider === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey,
      headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
    })
    return choice === 'smarter'
      ? anthropic('claude-sonnet-4-6-20250514')
      : anthropic('claude-haiku-4-5-20251001')
  }

  const openai = createOpenAI({ apiKey })
  if (choice === 'cheapest') return openai('gpt-4.1-nano')
  if (choice === 'smarter') return openai('gpt-4.1')
  return openai('gpt-4.1-mini')
}

export async function analyzeEntry(
  content: string,
  provider: 'anthropic' | 'openai',
  apiKey: string,
  modelChoice: ModelChoice = 'default'
): Promise<EntryAnalysis> {
  const model = createModel(provider, apiKey, modelChoice)
  const prompt = ANALYSIS_PROMPT.replace('{{ENTRY_CONTENT}}', content)

  const { output } = await generateText({
    model,
    output: Output.object({ schema: AnalysisSchema }),
    prompt,
  })

  if (!output) {
    throw new Error('Analysis returned no structured output')
  }

  return {
    analyzedAt: new Date().toISOString(),
    provider,
    model: model.modelId,
    ...output,
  }
}
