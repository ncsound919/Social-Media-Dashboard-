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
}));
