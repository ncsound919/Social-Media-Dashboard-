'use client';

import { useState } from 'react';
import { 
  MessageSquare, 
  AtSign, 
  Mail, 
  Reply,
  Star,
  StarOff,
  Check,
  Search
} from 'lucide-react';
import clsx from 'clsx';
import { formatTimeAgo } from '@/utils/timeutils';
import { Platform } from '@/data/models';

interface InboxMessage {
  id: string;
  type: 'comment' | 'mention' | 'dm' | 'reply';
  platform: Platform;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  postTitle?: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isHandled: boolean;
}

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

const mockMessages: InboxMessage[] = [
  {
    id: '1',
    type: 'comment',
    platform: 'instagram_business',
    authorName: 'Sarah Johnson',
    authorHandle: '@sarahj',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    content: 'Love this! Can you share more about the process behind this design? 😍',
    postTitle: 'New Product Launch',
    receivedAt: new Date(Date.now() - 15 * 60 * 1000),
    isRead: false,
    isStarred: true,
    isHandled: false,
  },
  {
    id: '2',
    type: 'mention',
    platform: 'twitter_x',
    authorName: 'Tech Daily',
    authorHandle: '@techdaily',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    content: 'Just discovered @yourhandle - amazing content for creators! Check them out 🔥',
    receivedAt: new Date(Date.now() - 45 * 60 * 1000),
    isRead: false,
    isStarred: false,
    isHandled: false,
  },
  {
    id: '3',
    type: 'dm',
    platform: 'linkedin_pages',
    authorName: 'Michael Chen',
    authorHandle: '@mchen',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
    content: 'Hi! I saw your recent post about content strategy. Would love to connect and discuss potential collaboration.',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: true,
    isStarred: true,
    isHandled: false,
  },
  {
    id: '4',
    type: 'comment',
    platform: 'youtube',
    authorName: 'Creative Mind',
    authorHandle: '@creativemind',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative',
    content: 'This tutorial saved me so much time! Subscribed 👍',
    postTitle: 'Tutorial: Getting Started',
    receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    isRead: true,
    isStarred: false,
    isHandled: true,
  },
  {
    id: '5',
    type: 'reply',
    platform: 'twitter_x',
    authorName: 'Alex Rivera',
    authorHandle: '@alexr',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    content: 'Totally agree with this take! Been saying the same thing for months.',
    postTitle: 'Thread on Content Strategy',
    receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    isRead: true,
    isStarred: false,
    isHandled: true,
  },
];

type FilterType = 'all' | 'unread' | 'starred' | 'unhandled';

export function InboxView() {
  const [messages, setMessages] = useState(mockMessages);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = messages.filter(msg => {
    if (filter === 'unread' && msg.isRead) return false;
    if (filter === 'starred' && !msg.isStarred) return false;
    if (filter === 'unhandled' && msg.isHandled) return false;
    if (platformFilter !== 'all' && msg.platform !== platformFilter) return false;
    if (searchQuery && !msg.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleStar = (id: string) => {
    setMessages(msgs => 
      msgs.map(m => m.id === id ? { ...m, isStarred: !m.isStarred } : m)
    );
  };

  const markAsHandled = (id: string) => {
    setMessages(msgs => 
      msgs.map(m => m.id === id ? { ...m, isHandled: true, isRead: true } : m)
    );
  };

  const markAsRead = (id: string) => {
    setMessages(msgs => 
      msgs.map(m => m.id === id ? { ...m, isRead: true } : m)
    );
  };

  const getTypeIcon = (type: InboxMessage['type']) => {
    switch (type) {
      case 'comment': return <MessageSquare size={14} />;
      case 'mention': return <AtSign size={14} />;
      case 'dm': return <Mail size={14} />;
      case 'reply': return <Reply size={14} />;
    }
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="h-full flex flex-col animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Inbox</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-accent-pink/20 text-accent-pink text-sm rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface border border-card-border rounded-lg text-sm w-[200px]"
            />
          </div>
          
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
            className="px-3 py-2 bg-surface border border-card-border rounded-lg text-sm"
          >
            <option value="all">All Platforms</option>
            <option value="twitter_x">Twitter / X</option>
            <option value="instagram_business">Instagram</option>
            <option value="linkedin_pages">LinkedIn</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'unread', 'starred', 'unhandled'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-2 text-sm rounded-lg transition-colors capitalize',
              filter === f
                ? 'bg-accent-cyan/20 text-accent-cyan'
                : 'text-text-secondary hover:bg-surface'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => {
                setSelectedMessage(msg);
                markAsRead(msg.id);
              }}
              className={clsx(
                'p-4 rounded-lg cursor-pointer transition-all',
                !msg.isRead ? 'bg-accent-cyan/5 border-l-2 border-accent-cyan' : 'glass-card',
                selectedMessage?.id === msg.id && 'ring-1 ring-accent-cyan'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-background font-medium"
                >
                  {msg.authorName[0]}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{msg.authorName}</span>
                    <span className="text-text-tertiary text-sm">{msg.authorHandle}</span>
                    <span 
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${platformColors[msg.platform]}20`,
                        color: platformColors[msg.platform]
                      }}
                    >
                      {getTypeIcon(msg.type)}
                    </span>
                    <span className="text-text-tertiary text-xs">
                      {formatTimeAgo(msg.receivedAt)}
                    </span>
                  </div>
                  
                  {msg.postTitle && (
                    <p className="text-xs text-text-tertiary mb-1">
                      on &quot;{msg.postTitle}&quot;
                    </p>
                  )}
                  
                  <p className="text-sm text-text-secondary line-clamp-2">{msg.content}</p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(msg.id); }}
                    className={clsx(
                      'p-1.5 rounded transition-colors',
                      msg.isStarred ? 'text-yellow-400' : 'text-text-tertiary hover:text-yellow-400'
                    )}
                  >
                    {msg.isStarred ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                  </button>
                  
                  {!msg.isHandled && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsHandled(msg.id); }}
                      className="p-1.5 rounded text-text-tertiary hover:text-green-400 transition-colors"
                      title="Mark as handled"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare size={48} className="text-text-tertiary mb-4" />
            <p className="text-text-secondary">No messages match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
