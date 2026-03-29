/**
 * OpenCode LLM Client
 * HTTP client for the OpenCode local API (https://github.com/sst/opencode).
 * Falls back gracefully when OPENCODE_API_URL is not configured.
 */

export interface BrandVoiceConfig {
  preferredTones: string[];
  avoidedTones: string[];
  keywords: string[];
  description: string;
}

export interface ToneAnalysisResult {
  detectedTone: string;
  confidence: number;
  brandAlignment: 'aligned' | 'misaligned' | 'neutral';
  suggestions: string[];
}

const DEFAULT_BASE_URL = 'http://localhost:4096';

function getBaseUrl(): string {
  return (process.env.OPENCODE_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
}

function getModel(): string {
  return process.env.OPENCODE_MODEL ?? 'auto';
}

/**
 * Strip markdown code fences that LLMs sometimes wrap JSON responses in.
 * E.g. "```json\n{...}\n```" → "{...}"
 */
function stripMarkdownFences(raw: string): string {
  return raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
}

/**
 * Send a chat completion request to the OpenCode API.
 */
async function chatCompletion(prompt: string): Promise<string> {
  const baseUrl = getBaseUrl();
  const model = getModel();

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenCode API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected OpenCode API response shape');
  }
  return content.trim();
}

/**
 * Analyze the tone of text against a brand voice configuration.
 */
export async function analyzeTone(
  text: string,
  brandVoice: BrandVoiceConfig
): Promise<ToneAnalysisResult> {
  const prompt = `You are a brand tone analysis expert.

Brand Voice:
- Preferred tones: ${brandVoice.preferredTones.join(', ')}
- Avoided tones: ${brandVoice.avoidedTones.join(', ')}
- Keywords: ${brandVoice.keywords.join(', ')}
- Description: ${brandVoice.description}

Analyze the following text and respond with valid JSON only (no markdown):
{
  "detectedTone": "<primary tone word>",
  "confidence": <0-100 number>,
  "brandAlignment": "<aligned|misaligned|neutral>",
  "suggestions": ["<suggestion 1>", ...]
}

Text to analyze:
"""
${text}
"""`;

  const raw = await chatCompletion(prompt);

  try {
    const parsed = JSON.parse(stripMarkdownFences(raw)) as ToneAnalysisResult;
    return {
      detectedTone: String(parsed.detectedTone ?? 'neutral'),
      confidence: Number(parsed.confidence ?? 0),
      brandAlignment: (['aligned', 'misaligned', 'neutral'].includes(parsed.brandAlignment)
        ? parsed.brandAlignment
        : 'neutral') as ToneAnalysisResult['brandAlignment'],
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map(String)
        : [],
    };
  } catch {
    throw new Error(`Failed to parse tone analysis response: ${raw}`);
  }
}

/**
 * Verify whether a factual claim is supported by provided sources.
 */
export async function verifyFactClaim(
  claim: string,
  sources: string[]
): Promise<{ verified: boolean; confidence: number }> {
  const sourcesText =
    sources.length > 0
      ? sources.map((s, i) => `${i + 1}. ${s}`).join('\n')
      : 'No sources provided.';

  const prompt = `You are a fact-checking assistant.

Claim: "${claim}"

Sources:
${sourcesText}

Determine whether the claim is supported by the sources. Respond with valid JSON only (no markdown):
{
  "verified": <true|false>,
  "confidence": <0-100 number>
}`;

  const raw = await chatCompletion(prompt);

  try {
    const parsed = JSON.parse(stripMarkdownFences(raw)) as { verified: boolean; confidence: number };
    return {
      verified: Boolean(parsed.verified),
      confidence: Number(parsed.confidence ?? 0),
    };
  } catch {
    throw new Error(`Failed to parse fact-check response: ${raw}`);
  }
}

/**
 * Generate marketing copy for a campaign.
 */
export async function generateCampaignCopy(
  template: string,
  segment: string,
  strategy: string
): Promise<string> {
  const prompt = `You are an expert B2B marketing copywriter.

Template: "${template}"
Target Segment: "${segment}"
Strategy: "${strategy}"

Write compelling marketing copy based on the template for the specified audience and strategy.
Return only the final copy text, no explanations.`;

  return chatCompletion(prompt);
}

/**
 * Suggest platform-specific hashtags for the given content.
 */
export async function suggestHashtags(
  content: string,
  platform: string
): Promise<string[]> {
  const prompt = `You are a social media expert specializing in ${platform}.

Content:
"""
${content}
"""

Suggest 5–10 relevant hashtags for ${platform}. Respond with valid JSON only (no markdown):
["#hashtag1", "#hashtag2", ...]`;

  const raw = await chatCompletion(prompt);

  try {
    const parsed = JSON.parse(stripMarkdownFences(raw)) as unknown[];
    return parsed.filter((h): h is string => typeof h === 'string');
  } catch {
    throw new Error(`Failed to parse hashtag suggestions: ${raw}`);
  }
}

/**
 * Suggest the optimal send time for a campaign segment.
 */
export async function optimizeSendTime(
  segment: string,
  historicalData: object
): Promise<string> {
  const prompt = `You are a marketing analytics expert.

Audience Segment: "${segment}"
Historical Engagement Data:
${JSON.stringify(historicalData, null, 2)}

Based on the segment characteristics and historical data, suggest the best day and time to send a campaign (e.g. "Tuesday at 10:00 AM EST"). Respond with only the time recommendation, no extra text.`;

  return chatCompletion(prompt);
}
