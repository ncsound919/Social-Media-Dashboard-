/**
 * Data models for Social Ops Studio
 * Following coding rule: Use typed models, no raw data everywhere
 */

// Supported social media platforms
export type Platform = 
  | 'twitter_x'
  | 'facebook_pages'
  | 'instagram_business'
  | 'linkedin_pages'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'threads'
  | 'bluesky';

// Content status stages
export type ContentStatus = 
  | 'idea'
  | 'drafting'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'evergreen';

// Social media account entity
export interface Account {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  avatarPath: string | null;
  connectedAt: Date;
  lastSyncAt: Date | null;
  settings: AccountSettings;
}

export interface AccountSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  notificationsEnabled: boolean;
}

// Post draft entity
export interface PostDraft {
  id: string;
  title: string;
  bodyRich: string;
  platformVariants: Record<Platform, PlatformVariant>;
  tags: string[];
  status: ContentStatus;
  campaignId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformVariant {
  body: string;
  mediaIds: string[];
  hashtags: string[];
  scheduledFor: Date | null;
}

// Scheduled post entity
export interface ScheduledPost {
  id: string;
  accountId: string;
  postDraftId: string;
  scheduledFor: Date;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  errorMessage: string | null;
  publishedPostId: string | null;
}

// Metric snapshot entity
export interface MetricSnapshot {
  id: string;
  accountId: string;
  capturedAt: Date;
  metrics: AccountMetrics;
  source: 'api' | 'manual';
}

export interface AccountMetrics {
  followers: number;
  following: number;
  posts: number;
  impressions: number;
  engagements: number;
  engagementRate: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

// Automation rule entity
export interface Rule {
  id: string;
  name: string;
  triggerType: RuleTriggerType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  createdAt: Date;
  lastTriggeredAt: Date | null;
}

export type RuleTriggerType = 
  | 'post_published'
  | 'before_schedule'
  | 'metric_threshold_reached'
  | 'time_based'
  | 'manual_trigger';

export interface RuleCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: string | number;
}

export type RuleActionType = 
  | 'mark_evergreen'
  | 'add_to_recycle_queue'
  | 'warn_user'
  | 'suggest_alternative_slot'
  | 'send_notification'
  | 'update_status';

export interface RuleAction {
  type: RuleActionType;
  params: Record<string, unknown>;
}

// Asset entity for media library
export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'template';
  name: string;
  path: string;
  thumbnailPath: string | null;
  tags: string[];
  createdAt: Date;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

// Campaign entity
export interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  platforms: Platform[];
  status: 'draft' | 'active' | 'completed' | 'paused';
  goals: CampaignGoal[];
  createdAt: Date;
}

export interface CampaignGoal {
  metric: keyof AccountMetrics;
  target: number;
  current: number;
}

// Inbox item entity
export interface InboxItem {
  id: string;
  accountId: string;
  platform: Platform;
  type: 'comment' | 'mention' | 'dm' | 'reply';
  content: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
  postId: string | null;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isHandled: boolean;
}

// Narrative arc for content planning
export interface NarrativeArc {
  id: string;
  name: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  primaryPlatforms: Platform[];
  linkedCampaigns: string[];
  impactTags: string[];
  postIds: string[];
}

// Experiment entity for A/B testing
export interface Experiment {
  id: string;
  name: string;
  dimensions: string[];
  variants: ExperimentVariant[];
  metrics: string[];
  status: 'draft' | 'running' | 'completed';
  startDate: Date;
  endDate: Date | null;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  configuration: Record<string, string>;
  postIds: string[];
  results: Record<string, number>;
}
