'use client';

import { useEffect, useMemo } from 'react';
import { useAppStore } from './store';
import { Sidebar } from '@/ui/sidebar';
import { Topbar } from '@/ui/topbar';
import { DashboardOverview } from '@/ui/dashboard-overview';
import { ContentLabView } from '@/ui/content-lab-view';
import { ScheduleView } from '@/ui/schedule-view';
import { AnalyticsView } from '@/ui/analytics-view';
import { InboxView } from '@/ui/inbox-view';
import { AssetsView } from '@/ui/assets-view';
import { AutomationView } from '@/ui/automation-view';
import { SettingsView } from '@/ui/settings-view';
import { CommunityView } from '@/ui/community-view';
import { CreatorOpsView } from '@/ui/creator-ops-view';
import { ExperimentsView } from '@/ui/experiments-view';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/utils/keyboard-shortcuts';
import { useToast } from '@/ui/toast';
import clsx from 'clsx';

export default function Home() {
  const { currentPage, sidebarCollapsed, loadAllData, setCurrentPage } = useAppStore();
  const { addToast } = useToast();

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: '1',
      ctrl: true,
      description: 'Go to Overview',
      action: () => setCurrentPage('Overview'),
    },
    {
      key: '2',
      ctrl: true,
      description: 'Go to Content Lab',
      action: () => setCurrentPage('Content Lab'),
    },
    {
      key: '3',
      ctrl: true,
      description: 'Go to Schedule',
      action: () => setCurrentPage('Schedule'),
    },
    {
      key: '4',
      ctrl: true,
      description: 'Go to Analytics',
      action: () => setCurrentPage('Analytics'),
    },
    {
      key: ',',
      ctrl: true,
      description: 'Settings',
      action: () => setCurrentPage('Settings'),
    },
    {
      key: 'n',
      ctrl: true,
      description: 'New Post',
      action: () => {
        setCurrentPage('Content Lab');
        addToast({
          type: 'info',
          title: 'New Post',
          message: 'Create your new post in Content Lab',
        });
      },
    },
  ], [setCurrentPage, addToast]);

  useKeyboardShortcuts(shortcuts);

  const renderPage = () => {
    switch (currentPage) {
      case 'Overview':
        return <DashboardOverview />;
      case 'Content Lab':
        return <ContentLabView />;
      case 'Schedule':
        return <ScheduleView />;
      case 'Analytics':
        return <AnalyticsView />;
      case 'Inbox':
        return <InboxView />;
      case 'Assets':
        return <AssetsView />;
      case 'Automation':
        return <AutomationView />;
      case 'Settings':
        return <SettingsView />;
      case 'Community':
        return <CommunityView />;
      case 'Creator Ops':
        return <CreatorOpsView />;
      case 'Experiments':
        return <ExperimentsView />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={clsx(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-[70px]' : 'ml-[260px]'
        )}
      >
        {/* Top Bar */}
        <Topbar />

        {/* Page Content */}
        <div className="p-6 h-[calc(100vh-64px)] overflow-y-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
