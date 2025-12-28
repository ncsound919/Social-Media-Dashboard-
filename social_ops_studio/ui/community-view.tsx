'use client';

import { useState } from 'react';
import { MetricRow } from '@/ui/metric-card';
import { 
  Users, 
  BookOpen, 
  Store, 
  Handshake,
  Calendar,
  Plus,
  Search,
  Tag,
  Clock,
  Folder
} from 'lucide-react';
import clsx from 'clsx';
import { formatRelativeDate } from '@/utils/timeutils';

interface SpotlightItem {
  id: string;
  name: string;
  category: 'creator' | 'business' | 'story';
  platforms: string[];
  frequency: string;
  nextRunAt: Date;
  lastPublishedAt: Date | null;
}

interface ResourceItem {
  id: string;
  title: string;
  type: 'thread' | 'carousel' | 'longform' | 'video';
  tags: string[];
  createdAt: Date;
}

const mockSpotlights: SpotlightItem[] = [
  { 
    id: '1', 
    name: 'Local Artist Feature', 
    category: 'creator', 
    platforms: ['Instagram', 'Twitter'], 
    frequency: 'Weekly', 
    nextRunAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    lastPublishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  { 
    id: '2', 
    name: 'Black-Owned Business Spotlight', 
    category: 'business', 
    platforms: ['Instagram', 'Facebook', 'LinkedIn'], 
    frequency: 'Bi-weekly', 
    nextRunAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    lastPublishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  },
  { 
    id: '3', 
    name: 'Community Story Sunday', 
    category: 'story', 
    platforms: ['Instagram', 'Twitter'], 
    frequency: 'Weekly', 
    nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    lastPublishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  },
];

const mockResources: ResourceItem[] = [
  { id: '1', title: 'Financial Literacy Basics', type: 'thread', tags: ['education', 'finance'], createdAt: new Date() },
  { id: '2', title: 'Mental Health Resources Guide', type: 'carousel', tags: ['health', 'wellness'], createdAt: new Date() },
  { id: '3', title: 'Entrepreneurship Tips Series', type: 'video', tags: ['business', 'education'], createdAt: new Date() },
  { id: '4', title: 'Historical Figures Spotlight', type: 'longform', tags: ['history', 'culture'], createdAt: new Date() },
];

const categoryConfig = {
  creator: { label: 'Creator', color: '#00F5D4' },
  business: { label: 'Business', color: '#FF6F91' },
  story: { label: 'Story', color: '#5B5FFF' },
};

const typeConfig = {
  thread: { label: 'Thread', color: '#1DA1F2' },
  carousel: { label: 'Carousel', color: '#E1306C' },
  longform: { label: 'Long-form', color: '#0A66C2' },
  video: { label: 'Video', color: '#FF0000' },
};

export function CommunityView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const metrics = [
    { label: 'Educational Posts', value: 45, delta: 8, deltaPercent: 21.6, trend: 'up' as const, icon: <BookOpen size={18} /> },
    { label: 'Business Spotlights', value: 12, delta: 3, deltaPercent: 33.3, trend: 'up' as const, icon: <Store size={18} /> },
    { label: 'Collaborations', value: 8, delta: 2, deltaPercent: 33.3, trend: 'up' as const, icon: <Handshake size={18} /> },
    { label: 'Events Promoted', value: 15, delta: 5, deltaPercent: 50.0, trend: 'up' as const, icon: <Calendar size={18} /> },
  ];

  const allTags = [...new Set(mockResources.flatMap(r => r.tags))];

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Culture & Community</h2>
          <p className="text-sm text-text-secondary">
            Spotlight creators, businesses, and share community stories
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <Plus size={16} />
          New Spotlight
        </button>
      </div>

      {/* Metrics */}
      <MetricRow metrics={metrics} />

      {/* Spotlight Queue */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Spotlight Queue</h3>
          <span className="text-sm text-text-secondary">
            {mockSpotlights.length} scheduled
          </span>
        </div>

        <div className="space-y-3">
          {mockSpotlights.map((item) => {
            const config = categoryConfig[item.category];
            
            return (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-surface">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Users size={20} style={{ color: config.color }} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <span 
                      className="px-2 py-0.5 text-xs rounded"
                      style={{ 
                        backgroundColor: `${config.color}20`,
                        color: config.color
                      }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {item.platforms.join(', ')} • {item.frequency}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Clock size={14} />
                    Next: {formatRelativeDate(item.nextRunAt)}
                  </p>
                  {item.lastPublishedAt && (
                    <p className="text-xs text-text-tertiary">
                      Last: {formatRelativeDate(item.lastPublishedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Vault */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Knowledge & Resource Vault</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-background border border-card-border rounded-lg text-sm w-[200px]"
              />
            </div>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Plus size={14} />
              Add Resource
            </button>
          </div>
        </div>

        {/* Tags Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Tag size={14} className="text-text-tertiary" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTags(
                selectedTags.includes(tag) 
                  ? selectedTags.filter(t => t !== tag)
                  : [...selectedTags, tag]
              )}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                selectedTags.includes(tag)
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'bg-surface text-text-secondary hover:text-text-primary'
              )}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockResources.map((resource) => {
            const config = typeConfig[resource.type];
            
            return (
              <div key={resource.id} className="p-4 rounded-lg bg-background hover:bg-surface transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Folder size={18} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{resource.title}</h4>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${config.color}20`,
                          color: config.color
                        }}
                      >
                        {config.label}
                      </span>
                      {resource.tags.map((tag) => (
                        <span key={tag} className="text-xs text-text-tertiary">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
