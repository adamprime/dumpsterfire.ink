import { describe, it, expect } from 'vitest'
import { generateText, Output } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'
import { AnalysisSchema } from './analysis'

const validAnalysis = {
  summary: 'You shared some beautiful thoughts about your day.',
  themes: ['reflection', 'gratitude'],
  sentiment: { overall: 'positive' as const, score: 0.8 },
  mindset: 'You seem to be in a reflective and peaceful place.',
  topWords: ['morning', 'coffee', 'grateful', 'sunshine', 'peace'],
}

describe('AnalysisSchema', () => {
  it('validates a correct analysis object', () => {
    const result = AnalysisSchema.parse(validAnalysis)
    expect(result.summary).toBe(validAnalysis.summary)
    expect(result.themes).toEqual(validAnalysis.themes)
    expect(result.sentiment.overall).toBe('positive')
    expect(result.sentiment.score).toBe(0.8)
  })

  it('rejects invalid sentiment overall value', () => {
    expect(() =>
      AnalysisSchema.parse({ ...validAnalysis, sentiment: { overall: 'bad', score: 0.5 } })
    ).toThrow()
  })

  it('accepts any number for sentiment score (range enforced by prompt, not schema)', () => {
    const result = AnalysisSchema.parse({ ...validAnalysis, sentiment: { overall: 'positive', score: 1.5 } })
    expect(result.sentiment.score).toBe(1.5)
  })

  it('accepts any number of themes (limit enforced by prompt, not schema)', () => {
    const result = AnalysisSchema.parse({ ...validAnalysis, themes: ['a', 'b', 'c', 'd', 'e'] })
    expect(result.themes).toHaveLength(5)
  })
})

describe('generateText with Output.object + MockLanguageModelV4', () => {
  it('produces structured output matching the schema', async () => {
    const { output } = await generateText({
      model: new MockLanguageModelV3({
        doGenerate: async () => ({
          content: [{ type: 'text', text: JSON.stringify(validAnalysis) }],
          finishReason: { unified: 'stop', raw: undefined },
          usage: {
            inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
            outputTokens: { total: 50, text: 50, reasoning: undefined },
          },
          warnings: [],
        }),
      }),
      output: Output.object({ schema: AnalysisSchema }),
      prompt: 'Test prompt',
    })

    expect(output).not.toBeNull()
    expect(output!.summary).toBe(validAnalysis.summary)
    expect(output!.sentiment.overall).toBe('positive')
    expect(output!.themes).toHaveLength(2)
  })
})
