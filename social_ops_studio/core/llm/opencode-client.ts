/**
 * OpenCode LLM Client
 * Connects to a locally-running OpenCode server (npm i -g opencode && opencode serve)
 * Default port: 4096
 */

const OPENCODE_BASE_URL = process.env.OPENCODE_API_URL || 'http://localhost:4096';
const OPENCODE_MODEL = process.env.OPENCODE_MODEL || 'claude-4-5';
const OPENCODE_TIMEOUT = parseInt(process.env.OPENCODE_TIMEOUT_MS || '30000');

export interface OpenCodeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenCodeRequest {
  model?: string;
  messages: OpenCodeMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface OpenCodeResponse {
  id: string;
  content: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

async function callOpenCode(request: OpenCodeRequest): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENCODE_TIMEOUT);
  try {
    const response = await fetch(`${OPENCODE_BASE_URL}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OPENCODE_MODEL, ...request }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`OpenCode API error: ${response.status} ${response.statusText}`);
    }
    const data: OpenCodeResponse = await response.json();
    return data.content;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Tone Analysis ────────────────────────────────────────────────────────────
export async function analyzeTone(
  content: string,
  brandVoice: string
): Promise<{ score: number; feedback: string; suggestions: string[] }> {
  const result = await callOpenCode({
    messages: [
      { role: 'system', content: `You are a brand voice analyst. The brand voice guidelines are: ${brandVoice}. Respond in JSON only.` },
      { role: 'user', content: `Analyze this content for tone alignment:\n\n${content}\n\nReturn JSON: {"score": 0-100, "feedback": "string", "suggestions": ["string"]}` },
    ],
    temperature: 0.2,
  });
  try {
    return JSON.parse(result);
  } catch {
    return { score: 75, feedback: result, suggestions: [] };
  }
}

// ── Fact Verification ─────────────────────────────────────────────────────────
export async function verifyFactClaim(
  claim: string
): Promise<{ isAccurate: boolean; confidence: number; explanation: string }> {
  const result = await callOpenCode({
    messages: [
      { role: 'system', content: 'You are a fact-checking assistant. Respond in JSON only.' },
      { role: 'user', content: `Evaluate this claim for accuracy:\n\n"${claim}"\n\nReturn JSON: {"isAccurate": boolean, "confidence": 0-100, "explanation": "string"}` },
    ],
    temperature: 0.1,
  });
  try {
    return JSON.parse(result);
  } catch {
    return { isAccurate: true, confidence: 50, explanation: result };
  }
}

// ── Campaign Copy Generation ──────────────────────────────────────────────────
export async function generateCampaignCopy(params: {
  platform: string;
  goal: string;
  audience: string;
  keyMessages: string[];
  tone: string;
  characterLimit?: number;
}): Promise<{ copy: string; hashtags: string[]; cta: string }> {
  const prompt = `Generate social media copy for ${params.platform}.
Goal: ${params.goal}
Audience: ${params.audience}
Key messages: ${params.keyMessages.join(', ')}
Tone: ${params.tone}
${params.characterLimit ? `Character limit: ${params.characterLimit}` : ''}

Return JSON: {"copy": "string", "hashtags": ["string"], "cta": "string"}`;
  const result = await callOpenCode({
    messages: [
      { role: 'system', content: 'You are an expert social media copywriter. Respond in JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });
  try {
    return JSON.parse(result);
  } catch {
    return { copy: result, hashtags: [], cta: '' };
  }
}

// ── Hashtag Suggestions ───────────────────────────────────────────────────────
export async function suggestHashtags(
  content: string,
  platform: string,
  count: number = 10
): Promise<string[]> {
  const result = await callOpenCode({
    messages: [
      { role: 'system', content: `You are a social media hashtag expert for ${platform}. Respond with a JSON array only.` },
      { role: 'user', content: `Suggest ${count} relevant hashtags for this content:\n\n${content}\n\nReturn JSON array: ["#hashtag1", "#hashtag2"]` },
    ],
    temperature: 0.5,
  });
  try {
    return JSON.parse(result);
  } catch {
    return result.match(/#\w+/g) || [];
  }
}

// ── Send Time Optimization ───────────────────────────────────────────────────
export async function optimizeSendTime(
  platform: string,
  audience: string,
  timezone: string,
  historicalEngagement?: Record<string, number>
): Promise<{ bestTime: string; reasoning: string; alternativeTimes: string[] }> {
  const result = await callOpenCode({
    messages: [
      { role: 'system', content: 'You are a social media scheduling expert. Respond in JSON only.' },
      { role: 'user', content: `Recommend optimal posting time for ${platform}.
Audience: ${audience}
Timezone: ${timezone}
${historicalEngagement ? `Historical engagement data: ${JSON.stringify(historicalEngagement)}` : ''}

Return JSON: {"bestTime": "HH:MM", "reasoning": "string", "alternativeTimes": ["HH:MM"]}` },
    ],
    temperature: 0.3,
  });
  try {
    return JSON.parse(result);
  } catch {
    return { bestTime: '09:00', reasoning: result, alternativeTimes: ['12:00', '17:00'] };
  }
}

// ── Auto Campaign Plan ────────────────────────────────────────────────────────
export async function generateAutoPlan(params: {
  goal: string;
  budget: number;
  platforms: string[];
  duration: string;
  audience: string;
}): Promise<{ campaigns: any[]; schedule: any[]; estimatedReach: number }> {
  const result = await callOpenCode({
    messages: [
      { role: 'system', content: 'You are a digital marketing strategist. Respond in JSON only.' },
      { role: 'user', content: `Create a marketing campaign plan:\nGoal: ${params.goal}\nBudget: $${params.budget}\nPlatforms: ${params.platforms.join(', ')}\nDuration: ${params.duration}\nAudience: ${params.audience}\n\nReturn JSON: {"campaigns": [], "schedule": [], "estimatedReach": number}` },
    ],
    temperature: 0.6,
  });
  try {
    return JSON.parse(result);
  } catch {
    return { campaigns: [], schedule: [], estimatedReach: 0 };
  }
}

export default {
  analyzeTone,
  verifyFactClaim,
  generateCampaignCopy,
  suggestHashtags,
  optimizeSendTime,
  generateAutoPlan,
};
