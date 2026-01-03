import type { EntryAnalysis } from '../types/filesystem'

const ANALYSIS_PROMPT = `Analyze the following personal journal entry and provide structured insights.

<entry>
{{ENTRY_CONTENT}}
</entry>

Respond with JSON matching this exact schema (no markdown, just valid JSON):
{
  "summary": "2-3 sentence summary speaking directly to the writer using 'you' and 'your'",
  "themes": ["array", "of", "main", "themes"],
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "score": 0.0 to 1.0 (0=very negative, 1=very positive)
  },
  "mindset": "Brief description of the writer's mental state, using 'you' and 'your' (e.g., 'You seem to be feeling...')",
  "topWords": ["five", "most", "significant", "words"]
}

IMPORTANT: Write the summary and mindset in second person, speaking directly to the writer. Use "you" and "your" instead of "the writer" or "they". Be empathetic and insightful. This is personal writing meant for self-reflection.`

export interface AnalysisResult {
  summary: string
  themes: string[]
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral' | 'mixed'
    score: number
  }
  mindset: string
  topWords: string[]
}

export async function analyzeWithAnthropic(
  content: string,
  apiKey: string
): Promise<EntryAnalysis> {
  const prompt = ANALYSIS_PROMPT.replace('{{ENTRY_CONTENT}}', content)
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to analyze with Anthropic')
  }

  const data = await response.json()
  const text = data.content[0]?.text || ''
  
  // Parse JSON from response
  const result = parseAnalysisResponse(text)
  
  return {
    analyzedAt: new Date().toISOString(),
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    sentiment: result.sentiment,
    themes: result.themes,
    mindset: result.mindset,
    summary: result.summary,
  }
}

export async function analyzeWithOpenAI(
  content: string,
  apiKey: string
): Promise<EntryAnalysis> {
  const prompt = ANALYSIS_PROMPT.replace('{{ENTRY_CONTENT}}', content)
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to analyze with OpenAI')
  }

  const data = await response.json()
  const text = data.choices[0]?.message?.content || ''
  
  // Parse JSON from response
  const result = parseAnalysisResponse(text)
  
  return {
    analyzedAt: new Date().toISOString(),
    provider: 'openai',
    model: 'gpt-4o-mini',
    sentiment: result.sentiment,
    themes: result.themes,
    mindset: result.mindset,
    summary: result.summary,
  }
}

function parseAnalysisResponse(text: string): AnalysisResult {
  // Try to extract JSON from the response
  let jsonStr = text.trim()
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  
  try {
    const parsed = JSON.parse(jsonStr)
    return {
      summary: parsed.summary || '',
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      sentiment: {
        overall: parsed.sentiment?.overall || 'neutral',
        score: typeof parsed.sentiment?.score === 'number' ? parsed.sentiment.score : 0.5,
      },
      mindset: parsed.mindset || '',
      topWords: Array.isArray(parsed.topWords) ? parsed.topWords : [],
    }
  } catch {
    // If parsing fails, return defaults
    return {
      summary: 'Analysis could not be parsed',
      themes: [],
      sentiment: { overall: 'neutral', score: 0.5 },
      mindset: '',
      topWords: [],
    }
  }
}

export async function analyzeEntry(
  content: string,
  provider: 'anthropic' | 'openai',
  apiKey: string
): Promise<EntryAnalysis> {
  if (provider === 'anthropic') {
    return analyzeWithAnthropic(content, apiKey)
  } else {
    return analyzeWithOpenAI(content, apiKey)
  }
}
