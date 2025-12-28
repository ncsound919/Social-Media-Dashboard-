/**
 * Link management service with URL shortening and UTM tracking
 * Smart Automation: Automatic UTM parameter appending
 */

import { v4 as uuidv4 } from 'uuid';
import { ShortLink, UTMParameters } from '../data/models';

export interface LinkConfig {
  shortDomain: string;
  defaultUtmSource: string;
  defaultUtmMedium: string;
}

const defaultLinkConfig: LinkConfig = {
  shortDomain: 'soc.io',
  defaultUtmSource: 'social',
  defaultUtmMedium: 'organic',
};

export class LinkManager {
  private readonly config: LinkConfig;
  private readonly storageKey = 'short_links';

  constructor(config?: Partial<LinkConfig>) {
    this.config = { ...defaultLinkConfig, ...config };
  }

  /**
   * Shorten a URL and automatically append UTM parameters
   */
  async shortenUrl(
    originalUrl: string,
    postDraftId: string | null,
    customUtm?: Partial<UTMParameters>
  ): Promise<ShortLink> {
    const shortCode = this.generateShortCode();
    
    const utmParameters: UTMParameters = {
      source: customUtm?.source || this.config.defaultUtmSource,
      medium: customUtm?.medium || this.config.defaultUtmMedium,
      campaign: customUtm?.campaign,
      term: customUtm?.term,
      content: customUtm?.content,
    };

    const shortLink: ShortLink = {
      id: uuidv4(),
      originalUrl,
      shortCode,
      postDraftId,
      utmParameters,
      clickCount: 0,
      createdAt: new Date(),
      lastClickedAt: null,
    };

    this.saveShortLink(shortLink);
    return shortLink;
  }

  /**
   * Generate a short code for the URL
   */
  private generateShortCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const maxAttempts = 10;
    const maxLength = 12;

    let currentLength = length;

    while (currentLength <= maxLength) {
      let attempts = 0;

      while (attempts < maxAttempts) {
        let result = '';
        for (let i = 0; i < currentLength; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check for collision
        const existing = this.getByCode(result);
        if (!existing) {
          return result;
        }

        attempts++;
      }

      // If collisions persist after max attempts, increase length and retry
      currentLength++;
    }

    // If we reach here, we failed to generate a unique code within limits
    throw new Error('Unable to generate a unique short code');
  }

  /**
   * Get the full shortened URL with UTM parameters
   */
  getShortUrl(shortLink: ShortLink): string {
    return `${this.config.shortDomain}/${shortLink.shortCode}`;
  }

  /**
   * Get the original URL with UTM parameters appended
   */
  getOriginalUrlWithUtm(shortLink: ShortLink): string {
    try {
      const url = new URL(shortLink.originalUrl);
      const utm = shortLink.utmParameters;

      url.searchParams.set('utm_source', utm.source);
      url.searchParams.set('utm_medium', utm.medium);
      if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
      if (utm.term) url.searchParams.set('utm_term', utm.term);
      if (utm.content) url.searchParams.set('utm_content', utm.content);

      return url.toString();
    } catch {
      // Fallback: if the originalUrl is not a valid URL, return it unchanged
      return shortLink.originalUrl;
    }
  }

  /**
   * Automatically detect and replace URLs in text with shortened versions
   */
  async processTextUrls(
    text: string,
    postDraftId: string,
    customUtm?: Partial<UTMParameters>
  ): Promise<{ processedText: string; shortLinks: ShortLink[] }> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    const shortLinks: ShortLink[] = [];
    let processedText = text;

    for (const url of urls) {
      const shortLink = await this.shortenUrl(url, postDraftId, customUtm);
      shortLinks.push(shortLink);
      const shortUrl = this.getShortUrl(shortLink);
      processedText = processedText.replace(url, shortUrl);
    }

    return { processedText, shortLinks };
  }

  /**
   * Track a click on a short link
   */
  trackClick(shortCode: string): ShortLink | null {
    const links = this.getAllShortLinks();
    const link = links.find(l => l.shortCode === shortCode);
    
    if (link) {
      link.clickCount++;
      link.lastClickedAt = new Date();
      this.saveAllShortLinks(links);
      return link;
    }
    
    return null;
  }

  /**
   * Get analytics for a post's links
   */
  getLinkAnalytics(postDraftId: string): {
    totalLinks: number;
    totalClicks: number;
    links: ShortLink[];
  } {
    const links = this.getAllShortLinks().filter(l => l.postDraftId === postDraftId);
    const totalClicks = links.reduce((sum, link) => sum + link.clickCount, 0);

    return {
      totalLinks: links.length,
      totalClicks,
      links,
    };
  }

  /**
   * Get a short link by code
   */
  getByCode(shortCode: string): ShortLink | null {
    const links = this.getAllShortLinks();
    return links.find(l => l.shortCode === shortCode) || null;
  }

  /**
   * Get all short links for a post
   */
  getByPostDraft(postDraftId: string): ShortLink[] {
    return this.getAllShortLinks().filter(l => l.postDraftId === postDraftId);
  }

  /**
   * Save a short link to storage
   */
  private saveShortLink(link: ShortLink): void {
    const links = this.getAllShortLinks();
    links.push(link);
    this.saveAllShortLinks(links);
  }

  /**
   * Get all short links from storage
   */
  private getAllShortLinks(): ShortLink[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];
    
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((link: any) => ({
        ...link,
        createdAt: new Date(link.createdAt),
        lastClickedAt: link.lastClickedAt ? new Date(link.lastClickedAt) : null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all short links to storage
   */
  private saveAllShortLinks(links: ShortLink[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(links));
  }
}
