# Social Ops Studio - Content Management Features

This document provides a comprehensive overview of the advanced content management features implemented in Social Ops Studio, addressing platform fidelity, workflow protection, automation, backend reliability, ethical AI, and team governance.

## Table of Contents

1. [Platform-Specific Fidelity](#platform-specific-fidelity)
2. [Workflow Protection](#workflow-protection)
3. [Smart Automation](#smart-automation)
4. [Backend Reliability](#backend-reliability)
5. [Ethical AI Integration](#ethical-ai-integration)
6. [Team Governance](#team-governance)
7. [API Reference](#api-reference)

---

## Platform-Specific Fidelity

### Custom Thumbnail Selection

**Service:** `PlatformValidator`

Video content can now include custom thumbnails, essential for platforms like YouTube Shorts and Instagram Reels where thumbnails significantly impact click-through rates.

```typescript
interface PlatformVariant {
  customThumbnailId?: string; // Custom thumbnail for video content
  qualityPreservation?: 'high' | 'medium' | 'auto';
}
```

### Native Quality Preservation

Video uploads preserve quality settings to prevent aggressive downscaling that makes content appear "grainy and gross" on platforms like TikTok.

### Hybrid Manual Publishing Mode

**Service:** `MobileSyncService`

For platforms where API limitations prevent access to native features (trending audio, stickers), the system includes mobile companion app sync:

- Desktop scheduling creates a notification
- Mobile app receives push notification with media and caption ready
- User can manually publish using native app features

```typescript
const mobileSyncService = new MobileSyncService();
const notification = mobileSyncService.createMobileSyncNotification(
  postDraft,
  scheduledPost,
  platform
);
```

**Platforms Using Mobile Sync:** TikTok, Instagram, Threads

---

## Workflow Protection

### Aggressive Autosave

**Service:** `AutosaveService`

Prevents data loss from browser refreshes or app crashes with robust autosaving.

**Features:**
- Autosave every 5 seconds (configurable)
- Debounced saves on user input (1 second delay)
- Version history (up to 50 versions)
- Restore from any saved state

```typescript
const autosaveService = new AutosaveService({
  interval: 5000,
  maxVersions: 50,
  debounceTime: 1000,
});

autosaveService.startAutosave(postDraftId, () => getCurrentDraft());
```

### Content Pillars

**Service:** `ContentPillarService`

Organize ideas into strategic content pillars instead of a blank slate, providing structure for planning.

**Default Pillars:**
- Educational (How-to guides, tutorials)
- Promotional (Product launches, sales)
- Engagement (Questions, polls, discussions)
- Inspirational (Quotes, success stories)

```typescript
const pillarService = new ContentPillarService();
const pillar = pillarService.createPillar(
  'Educational',
  'How-to guides and tutorials',
  'educational',
  '#00F5D4',
  3 // target 3 posts per week
);
```

### Focused Drafting Mode

Clean writing environment separate from analytics and feed streams to prevent distraction.

---

## Smart Automation

### First-Comment Automation

Automatically post a first comment with links or CTAs immediately after the main post goes live (essential for LinkedIn and X/Twitter).

```typescript
interface PlatformVariant {
  firstComment?: string; // Auto-posted first comment
}
```

### Evergreen Content Recycling

**Service:** `EvergreenContentService`

Tag timeless content for smart recycling to automatically fill gaps in the schedule.

**Features:**
- Auto-detect high-performing posts (>5% engagement rate)
- Configurable recycle frequency
- Smart scheduling to find gaps
- Track recycle count and performance

```typescript
const evergreenService = new EvergreenContentService({
  minEngagementRate: 5.0,
  defaultRecycleFrequency: 30, // days
  maxRecycleCount: 10,
});

// Auto-detect evergreen content
evergreenService.autoDetectEvergreen(postDraftId, 7.5);

// Get posts ready for recycling
const readyToRecycle = evergreenService.getPostsReadyForRecycle();
```

### Link Management with UTM Tracking

**Service:** `LinkManager`

Integrated URL shortener with automatic UTM parameter appending for traffic tracking.

```typescript
const linkManager = new LinkManager({
  shortDomain: 'soc.io',
  defaultUtmSource: 'social',
  defaultUtmMedium: 'organic',
});

// Shorten URL with UTM parameters
const shortLink = await linkManager.shortenUrl(
  'https://example.com/article',
  postDraftId,
  {
    campaign: 'summer_sale',
    content: 'twitter_post',
  }
);

// Automatically process all URLs in text
const { processedText, shortLinks } = await linkManager.processTextUrls(
  postText,
  postDraftId,
  { campaign: 'launch' }
);
```

---

## Backend Reliability

### Idempotency Keys

**Service:** `PublishingReliability`

Prevent duplicate posts when network stutters by using unique idempotency keys.

```typescript
const reliability = new PublishingReliability();
const idempotencyKey = reliability.generateIdempotencyKey(scheduledPost);
```

### Intelligent Retry Logic

Distinguish between transient failures (retry) and permanent failures (user intervention needed).

**Transient Errors (Auto-Retry):**
- Network timeouts
- Rate limits (429)
- Server errors (500, 502, 503, 504)

**Permanent Errors (No Retry):**
- Unauthorized (401)
- Invalid credentials
- Expired tokens
- Duplicate content

```typescript
const shouldRetry = reliability.shouldRetry(scheduledPost, error);
const delay = reliability.calculateRetryDelay(retryCount);

// Execute with automatic retry
await reliability.executeWithRetry(
  () => publishPost(),
  scheduledPost,
  (retryCount, error) => {
    console.log(`Retry ${retryCount}:`, error.message);
  }
);
```

### Platform-Specific Validation

**Service:** `PlatformValidator`

Validate content against platform rules **before** attempting upload.

**Validation Checks:**
- Text length limits
- Hashtag count limits
- Media count limits
- Required thumbnails
- Supported media types
- Aspect ratios

```typescript
const validator = new PlatformValidator();
const errors = validator.validateContent(
  platform,
  platformVariant,
  mediaFiles
);

if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

---

## Ethical AI Integration

### Tone Analysis

**Service:** `ToneAnalysisService`

Detect if a post's tone matches the brand voice to prevent brand misalignment.

**Detected Tones:**
- Professional
- Casual
- Humorous
- Formal
- Urgent
- Friendly
- Authoritative
- Empathetic

```typescript
const toneService = new ToneAnalysisService();
toneService.setBrandVoice({
  preferredTones: ['friendly', 'professional'],
  avoidedTones: ['urgent', 'formal'],
  keywords: ['community', 'support', 'together'],
  description: 'Warm and approachable',
});

const analysis = await toneService.analyzePostTone(draft);
// {
//   detectedTone: 'friendly',
//   confidence: 85,
//   brandAlignment: 'aligned',
//   suggestions: []
// }
```

### AI Content Verification

**Service:** `AIContentVerificationService`

Track and verify AI-generated content to prevent hallucinations.

**Features:**
- Register AI-generated sections
- Track source URLs
- Fact-check claims
- Extract claims for verification
- Mark content as verified

```typescript
const verificationService = new AIContentVerificationService();

// Register AI-generated content
verificationService.registerAIContent(
  postDraftId,
  [
    {
      content: 'According to research...',
      startIndex: 0,
      endIndex: 100,
      sources: ['https://research-paper.com'],
    },
  ],
  ['https://source1.com', 'https://source2.com']
);

// Add fact check
verificationService.addFactCheck(
  postDraftId,
  'Studies show 80% increase',
  'https://study.com',
  true,
  'John Doe'
);

// Check if ready for publishing
const { ready, warnings } = verificationService.isReadyForPublishing(postDraftId);
```

---

## Team Governance

### Granular Role-Based Access Control

**Service:** `TeamCollaborationService`

Three distinct roles with specific permissions:

**Admin:**
- All permissions
- Manage team members
- Manage settings

**Editor:**
- Create/edit posts
- View analytics
- Approve posts

**Viewer:**
- View analytics only

```typescript
const teamService = new TeamCollaborationService();

// Invite team member
const member = await teamService.inviteTeamMember(
  'user@example.com',
  'Jane Smith',
  'editor'
);

// Check permission
const canPublish = teamService.hasPermission(memberId, 'publish_posts');
```

### Approval Workflows

Submit drafts for review with comments and feedback before publishing.

```typescript
// Request approval
const approvalRequest = await teamService.requestApproval(
  postDraftId,
  requesterId,
  reviewerId
);

// Approve post
teamService.approvePost(requestId, approverId, 'Looks good!');

// Request changes
teamService.requestChanges(requestId, reviewerId, 'Please update the headline');

// Reject post
teamService.rejectPost(requestId, reviewerId, 'Off-brand tone');
```

---

## API Reference

### Core Services

| Service | Purpose | Key Features |
|---------|---------|--------------|
| `PlatformValidator` | Platform-specific validation | Character limits, media validation, thumbnail requirements |
| `PublishingReliability` | Idempotency and retry logic | Error classification, exponential backoff, duplicate prevention |
| `AutosaveService` | Draft protection | Periodic autosave, version history, debounced saves |
| `LinkManager` | URL shortening and UTM tracking | Auto-append UTM params, click tracking, analytics |
| `ToneAnalysisService` | Brand voice alignment | Tone detection, brand alignment check, suggestions |
| `AIContentVerificationService` | AI content tracking | Source verification, fact checking, claim extraction |
| `TeamCollaborationService` | Team workflows | Role-based access, approval workflows, permissions |
| `EvergreenContentService` | Content recycling | Auto-detect high performers, smart scheduling, recycle tracking |
| `ContentPillarService` | Strategic organization | Content categorization, target frequency, distribution analysis |
| `MobileSyncService` | Hybrid publishing | Mobile notifications, deep linking, push notifications |

### Data Models

All new features are backed by TypeScript interfaces in `data/models.ts`:

- `PlatformVariant` - Extended with thumbnail, quality, first comment, UTM params
- `ScheduledPost` - Extended with idempotency, retry tracking, validation errors
- `ValidationError` - Platform-specific validation errors
- `UTMParameters` - Link tracking parameters
- `ContentPillar` - Strategic content organization
- `TeamMember` - Team member with role and permissions
- `ApprovalRequest` - Approval workflow tracking
- `ShortLink` - URL shortener with tracking
- `ToneAnalysisResult` - AI tone analysis results
- `AIContentSource` - AI content verification tracking
- `EvergreenContent` - Evergreen content settings
- `AutosaveState` - Autosave version history
- `MobileSyncNotification` - Mobile publishing notifications

---

## Usage Examples

### Complete Workflow Example

```typescript
import {
  PlatformValidator,
  PublishingReliability,
  AutosaveService,
  LinkManager,
  ToneAnalysisService,
  TeamCollaborationService,
} from './core';

// 1. Start autosaving
const autosave = new AutosaveService();
autosave.startAutosave(postDraftId, () => getCurrentDraft());

// 2. Process links with UTM tracking
const linkManager = new LinkManager();
const { processedText, shortLinks } = await linkManager.processTextUrls(
  draft.bodyRich,
  draft.id,
  { campaign: 'launch' }
);

// 3. Analyze tone
const toneService = new ToneAnalysisService();
const toneAnalysis = await toneService.analyzePostTone(draft);
if (toneAnalysis.brandAlignment === 'misaligned') {
  console.warn('Tone mismatch:', toneAnalysis.suggestions);
}

// 4. Validate for platform
const validator = new PlatformValidator();
const errors = validator.validateContent('twitter_x', platformVariant);
if (errors.length > 0) {
  throw new Error('Validation failed');
}

// 5. Request approval (if team)
const teamService = new TeamCollaborationService();
await teamService.requestApproval(draft.id, currentUserId, managerId);

// 6. Publish with reliability
const reliability = new PublishingReliability();
await reliability.executeWithRetry(
  () => publishToAPI(scheduledPost),
  scheduledPost
);

// 7. Stop autosaving
autosave.stopAutosave(postDraftId);
```

---

## Configuration

All services accept configuration options:

```typescript
// Autosave configuration
const autosave = new AutosaveService({
  interval: 3000,      // Save every 3 seconds
  maxVersions: 100,    // Keep 100 versions
  debounceTime: 500,   // 500ms debounce
});

// Retry configuration
const reliability = new PublishingReliability({
  maxRetries: 5,
  initialDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 2,
});

// Evergreen configuration
const evergreen = new EvergreenContentService({
  minEngagementRate: 7.0,
  defaultRecycleFrequency: 45,
  maxRecycleCount: 5,
});
```

---

## Next Steps

To fully integrate these features into the UI:

1. Create UI components for content pillars dashboard
2. Add approval workflow UI to post editor
3. Implement tone analysis feedback in real-time
4. Add mobile sync notification center
5. Create team management interface
6. Build evergreen content dashboard
7. Add link analytics view

All core services are ready and can be imported into React components via the centralized `core/index.ts` export.
