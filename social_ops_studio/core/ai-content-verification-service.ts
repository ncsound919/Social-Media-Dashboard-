/**
 * AI Content Verification Service
 * Ethical AI Integration: Track and verify AI-generated content sources
 */

import { AIContentSource, FactCheck, GeneratedSection } from '../data/models';

export interface VerificationConfig {
  requireSourceUrls: boolean;
  autoHighlight: boolean;
  warnOnUnverified: boolean;
}

const defaultVerificationConfig: VerificationConfig = {
  requireSourceUrls: true,
  autoHighlight: true,
  warnOnUnverified: true,
};

export class AIContentVerificationService {
  private readonly config: VerificationConfig;
  private readonly storageKey = 'ai_content_sources';

  constructor(config?: Partial<VerificationConfig>) {
    this.config = { ...defaultVerificationConfig, ...config };
  }

  /**
   * Register AI-generated content for a post
   */
  registerAIContent(
    postDraftId: string,
    generatedSections: GeneratedSection[],
    sourceUrls: string[] = []
  ): AIContentSource {
    const aiContent: AIContentSource = {
      postDraftId,
      sourceUrls,
      factChecks: [],
      generatedSections,
      verifiedAt: null,
    };

    this.saveAIContent(aiContent);
    return aiContent;
  }

  /**
   * Add a source URL to AI-generated content
   */
  addSourceUrl(postDraftId: string, sourceUrl: string): AIContentSource | null {
    const aiContent = this.getAIContent(postDraftId);
    if (!aiContent) return null;

    if (!aiContent.sourceUrls.includes(sourceUrl)) {
      aiContent.sourceUrls.push(sourceUrl);
      this.saveAIContent(aiContent);
    }

    return aiContent;
  }

  /**
   * Add a fact check for a claim
   */
  addFactCheck(
    postDraftId: string,
    claim: string,
    sourceUrl: string,
    verified: boolean,
    verifiedBy?: string
  ): FactCheck | null {
    const aiContent = this.getAIContent(postDraftId);
    if (!aiContent) return null;

    const factCheck: FactCheck = {
      claim,
      sourceUrl,
      verified,
      verifiedBy,
      verifiedAt: new Date(),
    };

    aiContent.factChecks.push(factCheck);
    this.saveAIContent(aiContent);

    return factCheck;
  }

  /**
   * Mark AI content as verified
   */
  markAsVerified(postDraftId: string): AIContentSource | null {
    const aiContent = this.getAIContent(postDraftId);
    if (!aiContent) return null;

    aiContent.verifiedAt = new Date();
    this.saveAIContent(aiContent);

    return aiContent;
  }

  /**
   * Check if content is ready for publishing
   */
  isReadyForPublishing(postDraftId: string): {
    ready: boolean;
    warnings: string[];
  } {
    const aiContent = this.getAIContent(postDraftId);
    const warnings: string[] = [];

    if (!aiContent) {
      return { ready: true, warnings: [] };
    }

    // Check if sources are required but missing
    const missingSourceUrls = this.config.requireSourceUrls && aiContent.sourceUrls.length === 0;
    if (missingSourceUrls) {
      warnings.push('No source URLs provided for AI-generated content');
    }

    // Check for unverified fact checks
    const unverifiedFacts = aiContent.factChecks.filter(fc => !fc.verified);
    if (unverifiedFacts.length > 0) {
      warnings.push(`${unverifiedFacts.length} fact(s) have not been verified`);
    }

    // Check if content has been verified
    if (this.config.warnOnUnverified && !aiContent.verifiedAt) {
      warnings.push('AI-generated content has not been manually verified');
    }

    return {
      // Only block if source URLs are missing when required
      // Other warnings don't block publication
      ready: !missingSourceUrls,
      warnings,
    };
  }

  /**
   * Extract potential facts/claims from text for verification
   * Requires multiple indicators or high-confidence patterns
   */
  extractClaimsForVerification(text: string): string[] {
    const claims: string[] = [];
    
    // Split into sentences, including a possible final sentence without terminating punctuation
    const sentences = (text.match(/[^.!?]+(?:[.!?]+|$)/g) || [])
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);

    // Look for sentences that might contain facts
    const factIndicators = [
      'according to',
      'research shows',
      'studies indicate',
      'found that',
      'reported',
      'statistics',
      'data shows',
    ];

    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      let matchCount = 0;
      
      // Count how many indicators are present
      factIndicators.forEach(indicator => {
        if (lower.includes(indicator)) {
          matchCount++;
        }
      });
      
      // High-confidence patterns that independently qualify
      const hasPercentage = /\d+\s*%/.test(sentence);
      const hasStatistic = /\d+/.test(sentence) && (lower.includes('research') || lower.includes('study') || lower.includes('statistic'));
      
      // Extract if: 2+ indicators or statistic with research/study reference
      if (matchCount >= 2 || hasStatistic) {
        claims.push(sentence.trim());
      }
    });

    return claims;
  }

  /**
   * Highlight AI-generated sections in text
   */
  highlightGeneratedSections(text: string, postDraftId: string): string {
    const aiContent = this.getAIContent(postDraftId);
    if (!aiContent || !this.config.autoHighlight) return text;

    let highlightedText = text;
    
    // Sort sections by start index in reverse order to avoid index shifting
    const sortedSections = [...aiContent.generatedSections].sort(
      (a, b) => b.startIndex - a.startIndex
    );

    sortedSections.forEach(section => {
      const before = highlightedText.substring(0, section.startIndex);
      const generated = highlightedText.substring(section.startIndex, section.endIndex);
      const after = highlightedText.substring(section.endIndex);
      
      highlightedText = `${before}[AI: ${generated}]${after}`;
    });

    return highlightedText;
  }

  /**
   * Get verification status summary
   */
  getVerificationSummary(postDraftId: string): {
    hasAIContent: boolean;
    isVerified: boolean;
    sourceCount: number;
    verifiedFactsCount: number;
    unverifiedFactsCount: number;
    generatedSectionCount: number;
  } | null {
    const aiContent = this.getAIContent(postDraftId);
    
    if (!aiContent) {
      return {
        hasAIContent: false,
        isVerified: true,
        sourceCount: 0,
        verifiedFactsCount: 0,
        unverifiedFactsCount: 0,
        generatedSectionCount: 0,
      };
    }

    const verifiedFacts = aiContent.factChecks.filter(fc => fc.verified);
    const unverifiedFacts = aiContent.factChecks.filter(fc => !fc.verified);

    return {
      hasAIContent: true,
      isVerified: aiContent.verifiedAt !== null,
      sourceCount: aiContent.sourceUrls.length,
      verifiedFactsCount: verifiedFacts.length,
      unverifiedFactsCount: unverifiedFacts.length,
      generatedSectionCount: aiContent.generatedSections.length,
    };
  }

  /**
   * Remove AI content tracking for a post
   */
  removeAIContent(postDraftId: string): void {
    const allContent = this.getAllAIContent();
    const filtered = allContent.filter(c => c.postDraftId !== postDraftId);
    this.saveAllAIContent(filtered);
  }

  /**
   * Get AI content for a post
   */
  private getAIContent(postDraftId: string): AIContentSource | null {
    const allContent = this.getAllAIContent();
    return allContent.find(c => c.postDraftId === postDraftId) || null;
  }

  /**
   * Save AI content
   */
  private saveAIContent(aiContent: AIContentSource): void {
    const allContent = this.getAllAIContent();
    const index = allContent.findIndex(c => c.postDraftId === aiContent.postDraftId);

    if (index >= 0) {
      allContent[index] = aiContent;
    } else {
      allContent.push(aiContent);
    }

    this.saveAllAIContent(allContent);
  }

  /**
   * Get all AI content from storage
   */
  private getAllAIContent(): AIContentSource[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      // Add validation to handle malformed entries gracefully
      if (!Array.isArray(parsed)) return [];
      
      return parsed.map((content: any) => ({
        ...content,
        verifiedAt: content.verifiedAt ? new Date(content.verifiedAt) : null,
        factChecks: Array.isArray(content.factChecks) 
          ? content.factChecks.map((fc: any) => ({
              ...fc,
              verifiedAt: fc.verifiedAt ? new Date(fc.verifiedAt) : undefined,
            }))
          : [],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all AI content to storage
   */
  private saveAllAIContent(content: AIContentSource[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(content));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('Failed to save AI content: Storage quota exceeded');
        throw new Error('Storage quota exceeded. Please free up space and try again.');
      }
      throw error;
    }
  }
}
