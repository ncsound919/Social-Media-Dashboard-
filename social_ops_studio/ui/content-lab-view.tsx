'use client';

import { useState } from 'react';
import { useAppStore } from '@/app/store';
import { 
  Plus, 
  Search, 
  Filter, 
  GripVertical,
  MoreHorizontal,
  Calendar,
  Image,
  Video,
  FileText,
  Clock
} from 'lucide-react';
import clsx from 'clsx';
import { ContentStatus, Platform } from '@/data/models';

interface KanbanItem {
  id: string;
  title: string;
  platforms: Platform[];
  createdAt: Date;
  hasMedia: boolean;
  mediaType?: 'image' | 'video';
}

const mockKanbanData: Record<ContentStatus, KanbanItem[]> = {
  idea: [
    { id: '1', title: 'Product comparison video idea', platforms: ['tiktok', 'instagram_business'], createdAt: new Date(), hasMedia: false },
    { id: '2', title: 'Community spotlight series', platforms: ['twitter_x', 'linkedin_pages'], createdAt: new Date(), hasMedia: false },
    { id: '3', title: 'Tutorial: Getting started guide', platforms: ['youtube'], createdAt: new Date(), hasMedia: false },
  ],
  drafting: [
    { id: '4', title: 'Behind the scenes - Office tour', platforms: ['instagram_business', 'tiktok'], createdAt: new Date(), hasMedia: true, mediaType: 'video' },
    { id: '5', title: 'Customer success story', platforms: ['twitter_x', 'linkedin_pages'], createdAt: new Date(), hasMedia: true, mediaType: 'image' },
  ],
  ready: [
    { id: '6', title: 'Weekly tips thread', platforms: ['twitter_x'], createdAt: new Date(), hasMedia: false },
    { id: '7', title: 'Product update announcement', platforms: ['twitter_x', 'linkedin_pages', 'facebook_pages'], createdAt: new Date(), hasMedia: true, mediaType: 'image' },
  ],
  scheduled: [
    { id: '8', title: 'Holiday campaign - Part 1', platforms: ['instagram_business', 'facebook_pages'], createdAt: new Date(), hasMedia: true, mediaType: 'image' },
  ],
  published: [
    { id: '9', title: 'Q3 Results Infographic', platforms: ['linkedin_pages', 'twitter_x'], createdAt: new Date(), hasMedia: true, mediaType: 'image' },
    { id: '10', title: 'Team introduction video', platforms: ['tiktok', 'youtube'], createdAt: new Date(), hasMedia: true, mediaType: 'video' },
  ],
  evergreen: [
    { id: '11', title: 'Best practices guide', platforms: ['twitter_x', 'linkedin_pages'], createdAt: new Date(), hasMedia: false },
    { id: '12', title: 'FAQ compilation', platforms: ['instagram_business'], createdAt: new Date(), hasMedia: true, mediaType: 'image' },
  ],
};

const stageConfig: Record<ContentStatus, { label: string; color: string; bgColor: string }> = {
  idea: { label: 'Ideas', color: 'text-text-tertiary', bgColor: 'bg-gray-500/10' },
  drafting: { label: 'Drafting', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  ready: { label: 'Ready', color: 'text-accent-cyan', bgColor: 'bg-accent-cyan/10' },
  scheduled: { label: 'Scheduled', color: 'text-accent-purple', bgColor: 'bg-accent-purple/10' },
  published: { label: 'Published', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  evergreen: { label: 'Evergreen', color: 'text-accent-pink', bgColor: 'bg-accent-pink/10' },
};

const platformColors: Record<Platform, string> = {
  twitter_x: '#1DA1F2',
  facebook_pages: '#1877F2',
  instagram_business: '#E1306C',
  linkedin_pages: '#0A66C2',
  tiktok: '#FF0050',
  youtube: '#FF0000',
  pinterest: '#E60023',
  threads: '#FFFFFF',
  bluesky: '#0085FF',
};

const platformLabels: Record<Platform, string> = {
  twitter_x: 'X',
  facebook_pages: 'FB',
  instagram_business: 'IG',
  linkedin_pages: 'LI',
  tiktok: 'TT',
  youtube: 'YT',
  pinterest: 'PN',
  threads: 'TH',
  bluesky: 'BS',
};

function KanbanCard({ item }: { item: KanbanItem }) {
  return (
    <div className="glass-card p-3 mb-3 group cursor-grab active:cursor-grabbing hover:border-accent-cyan/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={14} className="text-text-tertiary" />
        </div>
        <button className="p-1 rounded hover:bg-surface transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal size={14} className="text-text-tertiary" />
        </button>
      </div>
      
      <h4 className="text-sm font-medium mb-3 line-clamp-2">{item.title}</h4>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {item.platforms.slice(0, 3).map((platform) => (
            <span
              key={platform}
              className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
              style={{ 
                backgroundColor: `${platformColors[platform]}20`,
                color: platformColors[platform]
              }}
            >
              {platformLabels[platform]}
            </span>
          ))}
          {item.platforms.length > 3 && (
            <span className="text-xs text-text-tertiary">
              +{item.platforms.length - 3}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {item.hasMedia && (
            <span className="text-text-tertiary">
              {item.mediaType === 'video' ? <Video size={14} /> : <Image size={14} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ stage, items }: { stage: ContentStatus; items: KanbanItem[] }) {
  const config = stageConfig[stage];
  
  return (
    <div className="flex-shrink-0 w-[280px]">
      <div className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg mb-3',
        config.bgColor
      )}>
        <span className={clsx('font-medium text-sm', config.color)}>
          {config.label}
        </span>
        <span className="text-xs text-text-tertiary bg-surface px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      
      <div className="space-y-0 min-h-[400px] pb-4">
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} />
        ))}
        
        <button className="w-full p-3 border border-dashed border-card-border rounded-card text-text-tertiary hover:text-text-secondary hover:border-text-tertiary transition-colors flex items-center justify-center gap-2 text-sm">
          <Plus size={16} />
          Add Card
        </button>
      </div>
    </div>
  );
}

export function ContentLabView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  
  const stages: ContentStatus[] = ['idea', 'drafting', 'ready', 'scheduled', 'published', 'evergreen'];

  return (
    <div className="h-full flex flex-col animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Content Pipeline</h2>
          <p className="text-sm text-text-secondary">
            Drag and drop to move content through stages
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface border border-card-border rounded-lg text-sm w-[200px]"
            />
          </div>
          
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value as Platform | 'all')}
            className="px-3 py-2 bg-surface border border-card-border rounded-lg text-sm"
          >
            <option value="all">All Platforms</option>
            <option value="twitter_x">Twitter / X</option>
            <option value="instagram_business">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="linkedin_pages">LinkedIn</option>
            <option value="youtube">YouTube</option>
          </select>
          
          <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <Plus size={16} />
            New Draft
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 pb-4 min-w-max">
          {stages.map((stage) => (
            <KanbanColumn 
              key={stage} 
              stage={stage} 
              items={mockKanbanData[stage] || []}
            />
          ))}
        </div>
      </div>
      
      {/* Bottom Stats */}
      <div className="flex items-center gap-6 py-4 border-t border-card-border text-sm text-text-secondary">
        <span>
          <strong className="text-text-primary">
            {Object.values(mockKanbanData).flat().length}
          </strong> total items
        </span>
        <span>
          <strong className="text-accent-cyan">
            {mockKanbanData.ready.length}
          </strong> ready to publish
        </span>
        <span>
          <strong className="text-accent-purple">
            {mockKanbanData.scheduled.length}
          </strong> scheduled
        </span>
        <span>
          <strong className="text-accent-pink">
            {mockKanbanData.evergreen.length}
          </strong> evergreen
        </span>
      </div>
    </div>
  );
}
