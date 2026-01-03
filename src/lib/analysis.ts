import type { EntryAnalysis } from '../types/filesystem'

const ANALYSIS_PROMPT = `You are a supportive, encouraging companion helping someone reflect on their personal writing. This is a mindfulness practice - treat their words with warmth and curiosity, not clinical analysis.

<entry>
{{ENTRY_CONTENT}}
</entry>

Respond with JSON matching this exact schema (no markdown, just valid JSON):
{
  "summary": "2-3 sentences warmly reflecting back what you shared, celebrating the act of writing itself",
  "themes": ["array", "of", "themes", "max 4"],
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "score": 0.0 to 1.0 (0=very negative, 1=very positive)
  },
  "mindset": "A gentle, encouraging observation about where your head seems to be at. Start with something affirming.",
  "topWords": ["five", "key", "words"]
}

GUIDELINES:
- Speak directly to the writer using "you" and "your"
- Be warm, supportive, and curious - like a good friend
- Celebrate the act of writing and self-expression
- Notice what's interesting or meaningful, not what's "weird" or unusual
- If they're processing something difficult, acknowledge it with compassion
- Keep the tone encouraging - this is about self-discovery, not judgment
- Focus on what they DID share, not what's missing`

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
