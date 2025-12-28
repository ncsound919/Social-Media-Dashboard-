/**
 * AI Tone Analysis Service
 * Ethical AI Integration: Detect tone and ensure brand alignment
 */

import { ToneAnalysisResult, PostDraft } from '../data/models';
import { v4 as uuidv4 } from 'uuid';

export interface BrandVoice {
  preferredTones: string[];
  avoidedTones: string[];
  keywords: string[];
  description: string;
}

export interface ToneSignals {
  professional: string[];
  casual: string[];
  humorous: string[];
  formal: string[];
  urgent: string[];
  friendly: string[];
  authoritative: string[];
  empathetic: string[];
}

const toneSignals: ToneSignals = {
  professional: ['please', 'regarding', 'furthermore', 'therefore', 'sincerely', 'kindly'],
  casual: ['hey', 'cool', 'awesome', 'yeah', 'gonna', 'wanna', 'btw', 'tbh'],
  humorous: ['lol', 'haha', 'hilarious', 'funny', 'joke', '😂', '😄', '🤣'],
  formal: ['pursuant', 'hereby', 'aforementioned', 'notwithstanding', 'shall'],
  urgent: ['immediately', 'urgent', 'asap', 'critical', 'now', 'hurry', '⚡', '🔥'],
  friendly: ['thanks', 'appreciate', 'love', 'excited', 'happy', '❤️', '😊', '🙏'],
  authoritative: ['must', 'require', 'mandate', 'ensure', 'critical', 'imperative'],
  empathetic: ['understand', 'appreciate', 'feel', 'support', 'care', 'here for you'],
};

// Pre-compile regex patterns for performance
const compiledTonePatterns: Record<string, RegExp[]> = {};
Object.entries(toneSignals).forEach(([tone, signals]) => {
  compiledTonePatterns[tone] = signals.map((signal: string) => 
    new RegExp(`\\b${signal}\\b`, 'gi')
  );
});

export class ToneAnalysisService {
  private brandVoice: BrandVoice | null = null;

  /**
   * Set the brand voice guidelines
   */
  setBrandVoice(brandVoice: BrandVoice): void {
    this.brandVoice = brandVoice;
  }

  /**
   * Analyze the tone of a post draft
   */
  async analyzePostTone(draft: PostDraft): Promise<ToneAnalysisResult> {
    const text = this.extractAllText(draft);
    const detectedTones = this.detectTones(text);
    const primaryTone = this.getPrimaryTone(detectedTones);
    const brandAlignment = this.checkBrandAlignment(primaryTone);
    const suggestions = this.generateSuggestions(primaryTone, brandAlignment, text);

    const result: ToneAnalysisResult = {
      postDraftId: draft.id,
      detectedTone: primaryTone,
      confidence: this.calculateConfidence(detectedTones, primaryTone),
      brandAlignment,
      suggestions,
      analyzedAt: new Date(),
    };

    return result;
  }

  /**
   * Extract all text from a post draft
   */
  private extractAllText(draft: PostDraft): string {
    let text = draft.bodyRich;
    
    // Add platform variant text
    Object.values(draft.platformVariants).forEach(variant => {
      if (variant?.body) {
        text += ' ' + variant.body;
      }
    });

    return text.toLowerCase();
  }

  /**
   * Detect tones in the text
   */
  private detectTones(text: string): Record<string, number> {
    const toneScores: Record<string, number> = {};

    Object.entries(compiledTonePatterns).forEach(([tone, patterns]) => {
      let score = 0;
      patterns.forEach((regex: RegExp) => {
        const matches = text.match(regex);
        score += matches ? matches.length : 0;
      });
      toneScores[tone] = score;
    });

    return toneScores;
  }

  /**
   * Get the primary tone based on scores
   */
  private getPrimaryTone(toneScores: Record<string, number>): string {
    const entries = Object.entries(toneScores);
    const maxScore = Math.max(...entries.map(([, score]) => score));
    
    if (maxScore === 0) {
      return 'neutral';
    }

    const primaryTone = entries.find(([, score]) => score === maxScore)?.[0] || 'neutral';
    return primaryTone;
  }

  /**
   * Calculate confidence score for tone detection
   */
  private calculateConfidence(toneScores: Record<string, number>, primaryTone: string): number {
    const totalSignals = Object.values(toneScores).reduce((sum, score) => sum + score, 0);
    
    if (totalSignals === 0) {
      return 0;
    }

    const primaryScore = toneScores[primaryTone] || 0;
    return Math.min((primaryScore / totalSignals) * 100, 100);
  }

  /**
   * Check if tone aligns with brand voice
   */
  private checkBrandAlignment(tone: string): 'aligned' | 'misaligned' | 'neutral' {
    if (!this.brandVoice) {
      return 'neutral';
    }

    if (this.brandVoice.preferredTones.includes(tone)) {
      return 'aligned';
    }

    if (this.brandVoice.avoidedTones.includes(tone)) {
      return 'misaligned';
    }

    return 'neutral';
  }

  /**
   * Generate suggestions based on tone analysis
   */
  private generateSuggestions(
    tone: string,
    alignment: 'aligned' | 'misaligned' | 'neutral',
    text: string
  ): string[] {
    const suggestions: string[] = [];

    if (alignment === 'misaligned' && this.brandVoice) {
      suggestions.push(
        `The detected tone (${tone}) doesn't match your brand voice. Consider using a ${this.brandVoice.preferredTones.join(' or ')} tone instead.`
      );
    }

    if (tone === 'neutral' && this.brandVoice) {
      suggestions.push(
        `Your post has a neutral tone. Consider adding more personality to match your brand voice.`
      );
    }

    // Check for mixed signals
    if (text.includes('urgent') && text.includes('please')) {
      suggestions.push('Your message contains both urgent and polite language, which may create confusion.');
    }

    // Check text length for tone effectiveness
    if (text.length < 50) {
      suggestions.push('Short posts may not convey tone effectively. Consider adding more context.');
    }

    return suggestions;
  }

  /**
   * Quick tone check for real-time feedback
   */
  quickToneCheck(text: string): { tone: string; confidence: number } {
    const toneScores = this.detectTones(text.toLowerCase());
    const primaryTone = this.getPrimaryTone(toneScores);
    const confidence = this.calculateConfidence(toneScores, primaryTone);

    return { tone: primaryTone, confidence };
  }

  /**
   * Get tone recommendations for a target tone
   */
  getToneRecommendations(targetTone: keyof ToneSignals): string[] {
    return toneSignals[targetTone] || [];
  }
}
