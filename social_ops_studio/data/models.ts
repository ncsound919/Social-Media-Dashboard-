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
  customThumbnailId?: string; // Platform-specific fidelity: custom thumbnail for video content
  qualityPreservation?: 'high' | 'medium' | 'auto'; // Native quality preservation setting
  firstComment?: string; // First-comment automation content
  utmParameters?: UTMParameters; // Link management with UTM tracking
}

// UTM parameters for link tracking
export interface UTMParameters {
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
}

// Scheduled post entity
export interface ScheduledPost {
  id: string;
  accountId: string;
  postDraftId: string;
  scheduledFor: Date;
  /**
   * Status of the scheduled post:
   * - 'pending': Waiting to be published at scheduled time
   * - 'publishing': Currently being published to the platform
   * - 'published': Successfully published to the platform
   * - 'failed': Publishing failed (may be retried based on error type)
   * - 'awaiting_mobile': Requires mobile app to complete publishing (e.g., for TikTok, Instagram Stories)
   */
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'awaiting_mobile';
  errorMessage: string | null;
  publishedPostId: string | null;
  idempotencyKey?: string; // Backend reliability: prevent duplicate posts
  retryCount?: number; // Intelligent retry tracking
  validationErrors?: ValidationError[]; // Platform-specific validation
  requiresMobilePublish?: boolean; // Hybrid manual publishing flag
}

export interface ValidationError {
  field: string;
  message: string;
  platform: Platform;
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

// Content Pillar for strategic organization (Workflow Protection)
export interface ContentPillar {
  id: string;
  name: string;
  description: string;
  category: 'educational' | 'promotional' | 'engagement' | 'inspirational' | 'custom';
  color: string;
  postIds: string[];
  targetFrequency?: number; // posts per week
}

// Team Member and Role-Based Access Control (Team Governance)
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  permissions: TeamPermission[];
  invitedAt: Date;
  status: 'pending' | 'active' | 'inactive';
}

export type TeamRole = 'admin' | 'editor' | 'viewer';

export type TeamPermission = 
  | 'create_posts'
  | 'edit_posts'
  | 'delete_posts'
  | 'publish_posts'
  | 'view_analytics'
  | 'manage_team'
  | 'manage_settings'
  | 'approve_posts';

// Approval Workflow (Team Governance)
export interface ApprovalRequest {
  id: string;
  postDraftId: string;
  requesterId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comments: ApprovalComment[];
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface ApprovalComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

// Link Management (Smart Automation)
export interface ShortLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  postDraftId: string | null;
  utmParameters: UTMParameters;
  clickCount: number;
  createdAt: Date;
  lastClickedAt: Date | null;
}

// AI Tone Analysis Result (Ethical AI Integration)
export interface ToneAnalysisResult {
  postDraftId: string;
  detectedTone: string;
  confidence: number;
  brandAlignment: 'aligned' | 'misaligned' | 'neutral';
  suggestions: string[];
  analyzedAt: Date;
}

// AI Content Source Verification (Ethical AI Integration)
export interface AIContentSource {
  postDraftId: string;
  sourceUrls: string[];
  factChecks: FactCheck[];
  generatedSections: GeneratedSection[];
  verifiedAt: Date | null;
}

export interface FactCheck {
  claim: string;
  sourceUrl: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface GeneratedSection {
  content: string;
  startIndex: number;
  endIndex: number;
  sources: string[];
}

// Evergreen Content (Smart Automation)
export interface EvergreenContent {
  postDraftId: string;
  isEvergreen: boolean;
  recycleFrequency: number; // days between reposts
  lastRecycledAt: Date | null;
  nextRecycleAt: Date | null;
  recycleCount: number;
  performanceThreshold: number; // engagement rate threshold
}

// Autosave State (Workflow Protection)
export interface AutosaveState {
  postDraftId: string;
  content: Partial<PostDraft>;
  savedAt: Date;
  version: number;
}

// Mobile Sync Notification (Platform-Specific Fidelity)
export interface MobileSyncNotification {
  id: string;
  postDraftId: string;
  scheduledPostId: string;
  platform: Platform;
  mediaUrls: string[];
  caption: string;
  scheduledFor: Date;
  status: 'pending' | 'acknowledged' | 'completed' | 'cancelled';
  createdAt: Date;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
}
