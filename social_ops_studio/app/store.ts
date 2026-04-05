/**
 * Global state management using Zustand
 * Following coding rule: No magic globals or singletons; use explicit state management
 */

import { create } from 'zustand';
import { 
  Account, 
  PostDraft, 
  ScheduledPost, 
  MetricSnapshot, 
  Rule,
  InboxItem,
  Campaign,
  ContentStatus
} from '@/data/models';
import { 
  accountRepository,
  postDraftRepository,
  scheduledPostRepository,
  metricSnapshotRepository,
  ruleRepository,
  inboxRepository,
  campaignRepository
} from '@/data/repository';
import { v4 as uuidv4 } from 'uuid';

// Browser service types
interface ConnectedPlatform {
  platform: string;
  session_age_hours: number;
  status: string;
}

interface PublishingPlatformStatus {
  platform: string;
  status: 'pending' | 'posting' | 'success' | 'error';
  message?: string;
}

interface AppState {
  // UI State
  currentPage: string;
  sidebarCollapsed: boolean;
  isLoading: boolean;
  
  // Data
  accounts: Account[];
  drafts: PostDraft[];
  scheduledPosts: ScheduledPost[];
  metrics: MetricSnapshot[];
  rules: Rule[];
  inboxItems: InboxItem[];
  campaigns: Campaign[];
  
  // Browser service state
  browserConnected: boolean;
  connectedPlatforms: ConnectedPlatform[];
  publishingStatus: PublishingPlatformStatus[];
  
  // Actions
  setCurrentPage: (page: string) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  
  // Data actions
  loadAllData: () => void;
  addAccount: (account: Omit<Account, 'id' | 'connectedAt'>) => void;
  removeAccount: (id: string) => void;
  addDraft: (draft: Omit<PostDraft, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDraft: (id: string, updates: Partial<PostDraft>) => void;
  deleteDraft: (id: string) => void;
  moveDraftToStage: (id: string, stage: ContentStatus) => void;
  addScheduledPost: (post: Omit<ScheduledPost, 'id'>) => void;
  cancelScheduledPost: (id: string) => void;
  addMetricSnapshot: (snapshot: Omit<MetricSnapshot, 'id'>) => void;
  addRule: (rule: Omit<Rule, 'id' | 'createdAt' | 'lastTriggeredAt'>) => void;
  toggleRule: (id: string) => void;
  deleteRule: (id: string) => void;
  markInboxItemRead: (id: string) => void;
  markInboxItemHandled: (id: string) => void;
  
  // Browser service actions
  checkBrowserHealth: () => Promise<void>;
  loadConnectedPlatforms: () => Promise<void>;
  connectPlatform: (platform: string) => Promise<void>;
  disconnectPlatform: (platform: string) => Promise<void>;
  publishToPlatforms: (content: string, platforms: string[], mediaPath?: string, preview?: boolean) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial UI State
  currentPage: 'Overview',
  sidebarCollapsed: false,
  isLoading: false,
  
  // Initial Data
  accounts: [],
  drafts: [],
  scheduledPosts: [],
  metrics: [],
  rules: [],
  inboxItems: [],
  campaigns: [],
  
  // Browser service initial state
  browserConnected: false,
  connectedPlatforms: [],
  publishingStatus: [],
  
  // UI Actions
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Data Actions
  loadAllData: () => {
    set({
      accounts: accountRepository.getAll(),
      drafts: postDraftRepository.getAll(),
      scheduledPosts: scheduledPostRepository.getAll(),
      metrics: metricSnapshotRepository.getByAccount(''), // Get all
      rules: ruleRepository.getAll(),
      inboxItems: inboxRepository.getAll(),
      campaigns: campaignRepository.getAll(),
    });
  },
  
  addAccount: (accountData) => {
    const account: Account = {
      ...accountData,
      id: uuidv4(),
      connectedAt: new Date(),
    };
    accountRepository.save(account);
    set((state) => ({ accounts: [...state.accounts, account] }));
  },
  
  removeAccount: (id) => {
    accountRepository.delete(id);
    set((state) => ({ accounts: state.accounts.filter(a => a.id !== id) }));
  },
  
  addDraft: (draftData) => {
    const draft: PostDraft = {
      ...draftData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    postDraftRepository.save(draft);
    set((state) => ({ drafts: [...state.drafts, draft] }));
  },
  
  updateDraft: (id, updates) => {
    const draft = postDraftRepository.getById(id);
    if (draft) {
      const updatedDraft = { ...draft, ...updates, updatedAt: new Date() };
      postDraftRepository.save(updatedDraft);
      set((state) => ({
        drafts: state.drafts.map(d => d.id === id ? updatedDraft : d)
      }));
    }
  },
  
  deleteDraft: (id) => {
    postDraftRepository.delete(id);
    set((state) => ({ drafts: state.drafts.filter(d => d.id !== id) }));
  },
  
  moveDraftToStage: (id, stage) => {
    const draft = postDraftRepository.getById(id);
    if (draft) {
      const updatedDraft = { ...draft, status: stage, updatedAt: new Date() };
      postDraftRepository.save(updatedDraft);
      set((state) => ({
        drafts: state.drafts.map(d => d.id === id ? updatedDraft : d)
      }));
    }
  },
  
  addScheduledPost: (postData) => {
    const post: ScheduledPost = {
      ...postData,
      id: uuidv4(),
    };
    scheduledPostRepository.save(post);
    set((state) => ({ scheduledPosts: [...state.scheduledPosts, post] }));
  },
  
  cancelScheduledPost: (id) => {
    scheduledPostRepository.delete(id);
    set((state) => ({ scheduledPosts: state.scheduledPosts.filter(p => p.id !== id) }));
  },
  
  addMetricSnapshot: (snapshotData) => {
    const snapshot: MetricSnapshot = {
      ...snapshotData,
      id: uuidv4(),
    };
    metricSnapshotRepository.save(snapshot);
    set((state) => ({ metrics: [...state.metrics, snapshot] }));
  },
  
  addRule: (ruleData) => {
    const rule: Rule = {
      ...ruleData,
      id: uuidv4(),
      createdAt: new Date(),
      lastTriggeredAt: null,
    };
    ruleRepository.save(rule);
    set((state) => ({ rules: [...state.rules, rule] }));
  },
  
  toggleRule: (id) => {
    const rule = ruleRepository.getById(id);
    if (rule) {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      ruleRepository.save(updatedRule);
      set((state) => ({
        rules: state.rules.map(r => r.id === id ? updatedRule : r)
      }));
    }
  },
  
  deleteRule: (id) => {
    ruleRepository.delete(id);
    set((state) => ({ rules: state.rules.filter(r => r.id !== id) }));
  },
  
  markInboxItemRead: (id) => {
    const item = inboxRepository.getById(id);
    if (item) {
      const updatedItem = { ...item, isRead: true };
      inboxRepository.save(updatedItem);
      set((state) => ({
        inboxItems: state.inboxItems.map(i => i.id === id ? updatedItem : i)
      }));
    }
  },
  
  markInboxItemHandled: (id) => {
    const item = inboxRepository.getById(id);
    if (item) {
      const updatedItem = { ...item, isHandled: true };
      inboxRepository.save(updatedItem);
      set((state) => ({
        inboxItems: state.inboxItems.map(i => i.id === id ? updatedItem : i)
      }));
    }
  },

  // Browser service actions
  checkBrowserHealth: async () => {
    try {
      const res = await fetch('/api/browser/health');
      if (res.ok) {
        const data = await res.json();
        set({ browserConnected: true, connectedPlatforms: data.platforms ?? [] });
      } else {
        set({ browserConnected: false });
      }
    } catch {
      set({ browserConnected: false });
    }
  },

  loadConnectedPlatforms: async () => {
    try {
      const res = await fetch('/api/browser/sessions');
      if (res.ok) {
        const data = await res.json();
        const platforms: ConnectedPlatform[] = Array.isArray(data)
          ? data
          : Array.isArray(data.sessions)
            ? data.sessions
            : [];
        set({ browserConnected: true, connectedPlatforms: platforms });
      } else {
        set({ browserConnected: false, connectedPlatforms: [] });
      }
    } catch {
      set({ browserConnected: false, connectedPlatforms: [] });
    }
  },

  connectPlatform: async (platform) => {
    try {
      const res = await fetch(`/api/browser/login/${encodeURIComponent(platform)}`, {
        method: 'POST',
      });
      if (res.ok) {
        // Reload the sessions list after a successful login
        await get().loadConnectedPlatforms();
      }
    } catch {
      // Connection attempt failed — no-op, UI already reflects state
    }
  },

  disconnectPlatform: async (platform) => {
    try {
      const res = await fetch('/api/browser/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      if (res.ok) {
        set((state) => ({
          connectedPlatforms: state.connectedPlatforms.filter(p => p.platform !== platform),
        }));
      }
    } catch {
      // Disconnect failed — no-op
    }
  },

  publishToPlatforms: async (content, platforms, mediaPath, preview) => {
    // Set all selected platforms to pending
    set({
      publishingStatus: platforms.map(p => ({ platform: p, status: 'pending' as const })),
    });

    // Mark all as posting
    set({
      publishingStatus: platforms.map(p => ({ platform: p, status: 'posting' as const })),
    });

    try {
      const body: Record<string, unknown> = { content, platforms };
      if (mediaPath) body.media_path = mediaPath;
      if (preview !== undefined) body.preview = preview;

      const res = await fetch('/api/browser/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        // Parse per-platform results if available, otherwise mark all success
        const results: Record<string, { status: string; message?: string }> = data.results ?? {};
        set({
          publishingStatus: platforms.map(p => {
            const r = results[p];
            if (r && r.status === 'error') {
              return { platform: p, status: 'error' as const, message: r.message };
            }
            return { platform: p, status: 'success' as const };
          }),
        });
      } else {
        set({
          publishingStatus: platforms.map(p => ({
            platform: p,
            status: 'error' as const,
            message: data.error ?? 'Publishing failed',
          })),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      set({
        publishingStatus: platforms.map(p => ({
          platform: p,
          status: 'error' as const,
          message,
        })),
      });
    }
  },
}));
