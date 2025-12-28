/**
 * Data repository layer for Social Ops Studio
 * Following coding rule: Repositories, not raw queries everywhere
 * All database operations go through these repositories
 */

import { 
  Account, 
  PostDraft, 
  ScheduledPost, 
  MetricSnapshot, 
  Rule, 
  Asset, 
  Campaign,
  InboxItem,
  NarrativeArc,
  Experiment,
  ContentStatus,
  Platform
} from './models';

// Storage interface for dependency injection
export interface StorageAdapter {
  get<T>(collection: string, id: string): T | null;
  getAll<T>(collection: string): T[];
  set<T>(collection: string, id: string, data: T): void;
  delete(collection: string, id: string): void;
  query<T>(collection: string, predicate: (item: T) => boolean): T[];
}

// Local storage adapter implementation
export class LocalStorageAdapter implements StorageAdapter {
  private getCollection<T>(collection: string): Record<string, T> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(`sos_${collection}`);
      return data ? JSON.parse(data) : {};
    } catch {
      // If JSON is malformed, return empty collection and log error
      console.error(`Failed to parse collection ${collection} from localStorage`);
      return {};
    }
  }

  private saveCollection<T>(collection: string, data: Record<string, T>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`sos_${collection}`, JSON.stringify(data));
  }

  get<T>(collection: string, id: string): T | null {
    const coll = this.getCollection<T>(collection);
    return coll[id] || null;
  }

  getAll<T>(collection: string): T[] {
    const coll = this.getCollection<T>(collection);
    return Object.values(coll);
  }

  set<T>(collection: string, id: string, data: T): void {
    const coll = this.getCollection<T>(collection);
    coll[id] = data;
    this.saveCollection(collection, coll);
  }

  delete(collection: string, id: string): void {
    const coll = this.getCollection<unknown>(collection);
    delete coll[id];
    this.saveCollection(collection, coll);
  }

  query<T>(collection: string, predicate: (item: T) => boolean): T[] {
    return this.getAll<T>(collection).filter(predicate);
  }
}

// Account Repository
export class AccountRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): Account | null {
    return this.storage.get<Account>('accounts', id);
  }

  getAll(): Account[] {
    return this.storage.getAll<Account>('accounts');
  }

  getByPlatform(platform: Platform): Account[] {
    return this.storage.query<Account>('accounts', (a) => a.platform === platform);
  }

  save(account: Account): void {
    this.storage.set('accounts', account.id, account);
  }

  delete(id: string): void {
    this.storage.delete('accounts', id);
  }
}

// Post Draft Repository
export class PostDraftRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): PostDraft | null {
    return this.storage.get<PostDraft>('post_drafts', id);
  }

  getAll(): PostDraft[] {
    return this.storage.getAll<PostDraft>('post_drafts');
  }

  getByStatus(status: ContentStatus): PostDraft[] {
    return this.storage.query<PostDraft>('post_drafts', (p) => p.status === status);
  }

  getByCampaign(campaignId: string): PostDraft[] {
    return this.storage.query<PostDraft>('post_drafts', (p) => p.campaignId === campaignId);
  }

  save(draft: PostDraft): void {
    this.storage.set('post_drafts', draft.id, draft);
  }

  delete(id: string): void {
    this.storage.delete('post_drafts', id);
  }
}

// Scheduled Post Repository
export class ScheduledPostRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): ScheduledPost | null {
    return this.storage.get<ScheduledPost>('scheduled_posts', id);
  }

  getAll(): ScheduledPost[] {
    return this.storage.getAll<ScheduledPost>('scheduled_posts');
  }

  getByAccount(accountId: string): ScheduledPost[] {
    return this.storage.query<ScheduledPost>('scheduled_posts', (s) => s.accountId === accountId);
  }

  getPending(): ScheduledPost[] {
    return this.storage.query<ScheduledPost>('scheduled_posts', (s) => s.status === 'pending');
  }

  getUpcoming(limit: number = 5): ScheduledPost[] {
    const now = new Date();
    return this.storage
      .query<ScheduledPost>('scheduled_posts', (s) => 
        s.status === 'pending' && new Date(s.scheduledFor) > now
      )
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .slice(0, limit);
  }

  save(post: ScheduledPost): void {
    this.storage.set('scheduled_posts', post.id, post);
  }

  delete(id: string): void {
    this.storage.delete('scheduled_posts', id);
  }
}

// Metric Snapshot Repository
export class MetricSnapshotRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): MetricSnapshot | null {
    return this.storage.get<MetricSnapshot>('metric_snapshots', id);
  }

  getByAccount(accountId: string): MetricSnapshot[] {
    return this.storage.query<MetricSnapshot>('metric_snapshots', (m) => m.accountId === accountId);
  }

  getLatestByAccount(accountId: string): MetricSnapshot | null {
    const snapshots = this.getByAccount(accountId);
    if (snapshots.length === 0) return null;
    return snapshots.sort((a, b) => 
      new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    )[0];
  }

  getInDateRange(accountId: string, start: Date, end: Date): MetricSnapshot[] {
    return this.storage.query<MetricSnapshot>('metric_snapshots', (m) => {
      const date = new Date(m.capturedAt);
      return m.accountId === accountId && date >= start && date <= end;
    });
  }

  save(snapshot: MetricSnapshot): void {
    this.storage.set('metric_snapshots', snapshot.id, snapshot);
  }
}

// Rule Repository
export class RuleRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): Rule | null {
    return this.storage.get<Rule>('rules', id);
  }

  getAll(): Rule[] {
    return this.storage.getAll<Rule>('rules');
  }

  getEnabled(): Rule[] {
    return this.storage.query<Rule>('rules', (r) => r.enabled);
  }

  getByTrigger(triggerType: Rule['triggerType']): Rule[] {
    return this.storage.query<Rule>('rules', (r) => r.triggerType === triggerType && r.enabled);
  }

  save(rule: Rule): void {
    this.storage.set('rules', rule.id, rule);
  }

  delete(id: string): void {
    this.storage.delete('rules', id);
  }
}

// Asset Repository
export class AssetRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): Asset | null {
    return this.storage.get<Asset>('assets', id);
  }

  getAll(): Asset[] {
    return this.storage.getAll<Asset>('assets');
  }

  getByType(type: Asset['type']): Asset[] {
    return this.storage.query<Asset>('assets', (a) => a.type === type);
  }

  getByTag(tag: string): Asset[] {
    return this.storage.query<Asset>('assets', (a) => a.tags.includes(tag));
  }

  save(asset: Asset): void {
    this.storage.set('assets', asset.id, asset);
  }

  delete(id: string): void {
    this.storage.delete('assets', id);
  }
}

// Campaign Repository
export class CampaignRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): Campaign | null {
    return this.storage.get<Campaign>('campaigns', id);
  }

  getAll(): Campaign[] {
    return this.storage.getAll<Campaign>('campaigns');
  }

  getActive(): Campaign[] {
    return this.storage.query<Campaign>('campaigns', (c) => c.status === 'active');
  }

  save(campaign: Campaign): void {
    this.storage.set('campaigns', campaign.id, campaign);
  }

  delete(id: string): void {
    this.storage.delete('campaigns', id);
  }
}

// Inbox Repository
export class InboxRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): InboxItem | null {
    return this.storage.get<InboxItem>('inbox', id);
  }

  getAll(): InboxItem[] {
    return this.storage.getAll<InboxItem>('inbox');
  }

  getUnread(): InboxItem[] {
    return this.storage.query<InboxItem>('inbox', (i) => !i.isRead);
  }

  getStarred(): InboxItem[] {
    return this.storage.query<InboxItem>('inbox', (i) => i.isStarred);
  }

  getByAccount(accountId: string): InboxItem[] {
    return this.storage.query<InboxItem>('inbox', (i) => i.accountId === accountId);
  }

  save(item: InboxItem): void {
    this.storage.set('inbox', item.id, item);
  }

  delete(id: string): void {
    this.storage.delete('inbox', id);
  }
}

// Narrative Arc Repository
export class NarrativeArcRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): NarrativeArc | null {
    return this.storage.get<NarrativeArc>('narrative_arcs', id);
  }

  getAll(): NarrativeArc[] {
    return this.storage.getAll<NarrativeArc>('narrative_arcs');
  }

  getActive(): NarrativeArc[] {
    const now = new Date();
    return this.storage.query<NarrativeArc>('narrative_arcs', (a) => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      return start <= now && end >= now;
    });
  }

  save(arc: NarrativeArc): void {
    this.storage.set('narrative_arcs', arc.id, arc);
  }

  delete(id: string): void {
    this.storage.delete('narrative_arcs', id);
  }
}

// Experiment Repository
export class ExperimentRepository {
  constructor(private storage: StorageAdapter) {}

  getById(id: string): Experiment | null {
    return this.storage.get<Experiment>('experiments', id);
  }

  getAll(): Experiment[] {
    return this.storage.getAll<Experiment>('experiments');
  }

  getRunning(): Experiment[] {
    return this.storage.query<Experiment>('experiments', (e) => e.status === 'running');
  }

  save(experiment: Experiment): void {
    this.storage.set('experiments', experiment.id, experiment);
  }

  delete(id: string): void {
    this.storage.delete('experiments', id);
  }
}

// Create singleton storage adapter
const storageAdapter = new LocalStorageAdapter();

// Export repository instances
export const accountRepository = new AccountRepository(storageAdapter);
export const postDraftRepository = new PostDraftRepository(storageAdapter);
export const scheduledPostRepository = new ScheduledPostRepository(storageAdapter);
export const metricSnapshotRepository = new MetricSnapshotRepository(storageAdapter);
export const ruleRepository = new RuleRepository(storageAdapter);
export const assetRepository = new AssetRepository(storageAdapter);
export const campaignRepository = new CampaignRepository(storageAdapter);
export const inboxRepository = new InboxRepository(storageAdapter);
export const narrativeArcRepository = new NarrativeArcRepository(storageAdapter);
export const experimentRepository = new ExperimentRepository(storageAdapter);
