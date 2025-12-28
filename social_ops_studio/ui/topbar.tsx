'use client';

import { useAppStore } from '@/app/store';
import { Search, Bell, Plus, Sun, Moon, User } from 'lucide-react';
import { useState } from 'react';

export function Topbar() {
  const { currentPage, inboxItems } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const unreadCount = inboxItems.filter(item => !item.isRead).length;

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-lg border-b border-card-border flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-semibold">{currentPage}</h2>
      </div>

      {/* Center - Search Bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
          <input
            type="text"
            placeholder="Search posts, accounts, campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background/50 border border-card-border rounded-lg
                     text-sm focus:border-accent-cyan focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Quick Add Button */}
        <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <Plus size={16} />
          <span>New Post</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg hover:bg-card-background transition-colors text-text-secondary hover:text-text-primary"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-card-background transition-colors text-text-secondary hover:text-text-primary">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-pink text-xs rounded-full flex items-center justify-center text-background font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <button className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
          <User size={18} className="text-background" />
        </button>
      </div>
    </header>
  );
}
