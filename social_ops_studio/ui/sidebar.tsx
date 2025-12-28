'use client';

import { useAppStore } from '@/app/store';
import { 
  LayoutDashboard, 
  PenSquare, 
  Calendar, 
  BarChart3, 
  Inbox, 
  FolderOpen, 
  Zap, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Target,
  FlaskConical
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

const mainNavItems: NavItem[] = [
  { id: 'Overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'Content Lab', label: 'Content Lab', icon: <PenSquare size={20} /> },
  { id: 'Schedule', label: 'Schedule', icon: <Calendar size={20} /> },
  { id: 'Analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { id: 'Inbox', label: 'Inbox', icon: <Inbox size={20} /> },
  { id: 'Assets', label: 'Assets', icon: <FolderOpen size={20} /> },
  { id: 'Automation', label: 'Automation', icon: <Zap size={20} /> },
];

const addonNavItems: NavItem[] = [
  { id: 'Community', label: 'Community', icon: <Users size={20} />, group: 'Community' },
  { id: 'Creator Ops', label: 'Creator Ops', icon: <Target size={20} />, group: 'Ops' },
  { id: 'Experiments', label: 'Experiments', icon: <FlaskConical size={20} />, group: 'Strategy' },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-background border-r border-card-border z-50',
        'flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-card-border">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold gradient-text">Social Ops Studio</h1>
        )}
        <button
          onClick={toggleSidebar}
          className={clsx(
            'p-2 rounded-lg hover:bg-surface transition-colors',
            sidebarCollapsed ? 'mx-auto' : 'ml-auto'
          )}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-6">
          {!sidebarCollapsed && (
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2 px-3">
              Main
            </p>
          )}
          {mainNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1',
                'transition-all duration-200',
                currentPage === item.id
                  ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 text-accent-cyan glow-cyan'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              )}
            >
              <span className={currentPage === item.id ? 'text-accent-cyan' : ''}>
                {item.icon}
              </span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Addon Navigation */}
        <div className="px-3 mb-6">
          {!sidebarCollapsed && (
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2 px-3">
              Add-ons
            </p>
          )}
          {addonNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1',
                'transition-all duration-200',
                currentPage === item.id
                  ? 'bg-gradient-to-r from-accent-pink/20 to-accent-purple/20 text-accent-pink'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              )}
            >
              <span className={currentPage === item.id ? 'text-accent-pink' : ''}>
                {item.icon}
              </span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Settings */}
      <div className="px-3 py-4 border-t border-card-border">
        <button
          onClick={() => setCurrentPage('Settings')}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
            'transition-all duration-200',
            currentPage === 'Settings'
              ? 'bg-surface text-text-primary'
              : 'text-text-secondary hover:bg-surface hover:text-text-primary'
          )}
        >
          <Settings size={20} />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
