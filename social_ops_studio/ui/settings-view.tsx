'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  User, 
  Link, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Key,
  Globe,
  Monitor,
  Check,
  RefreshCw,
  Download,
  Upload,
  HardDrive,
  Keyboard
} from 'lucide-react';
import clsx from 'clsx';
import { Platform } from '@/data/models';
import { useToast } from '@/ui/toast';

type SettingsTab = 'profile' | 'accounts' | 'notifications' | 'appearance' | 'security' | 'data' | 'shortcuts';

interface ConnectedAccount {
  platform: Platform;
  handle: string;
  connected: boolean;
  lastSync: Date | null;
}

const platformConfig: Record<Platform, { label: string; color: string }> = {
  twitter_x: { label: 'Twitter / X', color: '#1DA1F2' },
  facebook_pages: { label: 'Facebook', color: '#1877F2' },
  instagram_business: { label: 'Instagram', color: '#E1306C' },
  linkedin_pages: { label: 'LinkedIn', color: '#0A66C2' },
  tiktok: { label: 'TikTok', color: '#FF0050' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  pinterest: { label: 'Pinterest', color: '#E60023' },
  threads: { label: 'Threads', color: '#FFFFFF' },
  bluesky: { label: 'Bluesky', color: '#0085FF' },
};

const mockAccounts: ConnectedAccount[] = [
  { platform: 'twitter_x', handle: '@yourhandle', connected: true, lastSync: new Date() },
  { platform: 'instagram_business', handle: '@yourinsta', connected: true, lastSync: new Date() },
  { platform: 'linkedin_pages', handle: 'Your Company', connected: true, lastSync: new Date(Date.now() - 60 * 60 * 1000) },
  { platform: 'tiktok', handle: '@yourtiktok', connected: false, lastSync: null },
  { platform: 'youtube', handle: 'Your Channel', connected: true, lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000) },
];

// Keyboard shortcuts list for display
const keyboardShortcuts = [
  { keys: ['Ctrl', '1'], description: 'Go to Overview' },
  { keys: ['Ctrl', '2'], description: 'Go to Content Lab' },
  { keys: ['Ctrl', '3'], description: 'Go to Schedule' },
  { keys: ['Ctrl', '4'], description: 'Go to Analytics' },
  { keys: ['Ctrl', ','], description: 'Open Settings' },
  { keys: ['Ctrl', 'N'], description: 'New Post' },
  { keys: ['Ctrl', 'K'], description: 'Search' },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [accounts] = useState(mockAccounts);
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings state
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    pushNotifications: true,
    weeklyReport: true,
    mentionAlerts: true,
    scheduledReminders: false,
  });
  
  const [appearance, setAppearance] = useState({
    theme: 'dark',
    compactMode: false,
    showAnimations: true,
  });

  // Calculate storage used
  const calculateStorageUsed = useCallback(() => {
    if (typeof window === 'undefined') return { used: 0, percentage: 0 };
    
    let totalSize = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        totalSize += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16 = 2 bytes per char
      }
    }
    const usedKB = totalSize / 1024;
    const usedMB = usedKB / 1024;
    const maxMB = 5; // localStorage limit is typically ~5MB
    const percentage = Math.min((usedMB / maxMB) * 100, 100);
    
    return { used: usedMB, percentage };
  }, []);

  const [storageInfo] = useState(calculateStorageUsed);

  // Export all data
  const handleExportData = useCallback(() => {
    try {
      const data: Record<string, unknown> = {};
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key) && key.startsWith('sos_')) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      }
      
      // Also include autosave states
      const autosaveKey = 'autosave_states';
      const autosaveData = localStorage.getItem(autosaveKey);
      if (autosaveData) {
        try {
          data[autosaveKey] = JSON.parse(autosaveData);
        } catch {
          data[autosaveKey] = autosaveData;
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-ops-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Data Exported',
        message: 'Your data has been downloaded successfully.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
      });
    }
  }, [addToast]);

  // Import data
  const handleImportData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }

        addToast({
          type: 'success',
          title: 'Data Imported',
          message: 'Your data has been restored. Refreshing...',
        });

        // Refresh the page to load new data
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Import Failed',
          message: 'Invalid backup file. Please select a valid backup.',
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addToast]);

  // Clear all data
  const handleClearData = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Remove all sos_ prefixed items and autosave
      const keysToRemove: string[] = [];
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key) && 
            (key.startsWith('sos_') || key === 'autosave_states')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      addToast({
        type: 'success',
        title: 'Data Cleared',
        message: 'All data has been removed. Refreshing...',
      });

      setTimeout(() => window.location.reload(), 1500);
    }
  }, [addToast]);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'accounts', label: 'Connected Accounts', icon: <Link size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'data', label: 'Data & Storage', icon: <Database size={18} /> },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: <Keyboard size={18} /> },
  ];

  return (
    <div className="h-full flex gap-6 animate-slideUp">
      {/* Sidebar */}
      <div className="w-[220px] flex-shrink-0">
        <div className="glass-card p-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                activeTab === tab.id
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Profile Settings</h3>
            
            <div className="flex items-start gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-3xl text-background font-bold">
                D
              </div>
              <div>
                <button className="btn-secondary text-sm mb-2">Change Avatar</button>
                <p className="text-xs text-text-tertiary">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>

            <div className="grid gap-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  defaultValue="Dev User"
                  className="w-full px-4 py-2 bg-surface border border-card-border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue="dev@example.com"
                  className="w-full px-4 py-2 bg-surface border border-card-border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Time Zone</label>
                <select className="w-full px-4 py-2 bg-surface border border-card-border rounded-lg">
                  <option>Eastern Time (US & Canada)</option>
                  <option>Pacific Time (US & Canada)</option>
                  <option>UTC</option>
                </select>
              </div>
              
              <button className="btn-primary w-fit mt-4">Save Changes</button>
            </div>
          </div>
        )}

        {/* Connected Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Connected Accounts</h3>
            
            <div className="space-y-4">
              {accounts.map((account) => {
                const config = platformConfig[account.platform];
                
                return (
                  <div
                    key={account.platform}
                    className="flex items-center justify-between p-4 rounded-lg bg-surface"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Globe size={20} style={{ color: config.color }} />
                      </div>
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-sm text-text-secondary">
                          {account.connected ? account.handle : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {account.connected ? (
                        <>
                          <span className="flex items-center gap-1 text-sm text-green-400">
                            <Check size={14} />
                            Connected
                          </span>
                          <button className="p-2 rounded-lg hover:bg-background transition-colors text-text-tertiary">
                            <RefreshCw size={16} />
                          </button>
                          <button className="btn-secondary text-sm py-1.5">
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn-primary text-sm py-1.5"
                          style={{ 
                            background: config.color,
                          }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
            
            <div className="space-y-4 max-w-md">
              {[
                { key: 'emailDigest', label: 'Daily Email Digest', description: 'Receive a summary of your account activity' },
                { key: 'pushNotifications', label: 'Push Notifications', description: 'Get notified about important events' },
                { key: 'weeklyReport', label: 'Weekly Performance Report', description: 'Detailed analytics every Monday' },
                { key: 'mentionAlerts', label: 'Mention Alerts', description: 'Notify when someone mentions you' },
                { key: 'scheduledReminders', label: 'Scheduled Post Reminders', description: 'Remind before posts go live' },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between p-4 rounded-lg bg-surface">
                  <div>
                    <p className="font-medium">{setting.label}</p>
                    <p className="text-sm text-text-secondary">{setting.description}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(n => ({ 
                      ...n, 
                      [setting.key]: !n[setting.key as keyof typeof notifications] 
                    }))}
                    className={clsx(
                      'w-12 h-6 rounded-full transition-colors relative',
                      notifications[setting.key as keyof typeof notifications]
                        ? 'bg-accent-cyan'
                        : 'bg-card-border'
                    )}
                  >
                    <span 
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        notifications[setting.key as keyof typeof notifications]
                          ? 'translate-x-7'
                          : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Appearance Settings</h3>
            
            <div className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-3">Theme</label>
                <div className="flex gap-3">
                  {['dark', 'light', 'system'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setAppearance(a => ({ ...a, theme }))}
                      className={clsx(
                        'flex-1 p-4 rounded-lg border transition-all capitalize',
                        appearance.theme === theme
                          ? 'border-accent-cyan bg-accent-cyan/10'
                          : 'border-card-border hover:border-text-tertiary'
                      )}
                    >
                      <Monitor size={24} className="mx-auto mb-2" />
                      <p className="text-sm">{theme}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
                <div>
                  <p className="font-medium">Compact Mode</p>
                  <p className="text-sm text-text-secondary">Reduce spacing and padding</p>
                </div>
                <button
                  onClick={() => setAppearance(a => ({ ...a, compactMode: !a.compactMode }))}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    appearance.compactMode ? 'bg-accent-cyan' : 'bg-card-border'
                  )}
                >
                  <span 
                    className={clsx(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      appearance.compactMode ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
                <div>
                  <p className="font-medium">Animations</p>
                  <p className="text-sm text-text-secondary">Enable smooth transitions</p>
                </div>
                <button
                  onClick={() => setAppearance(a => ({ ...a, showAnimations: !a.showAnimations }))}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    appearance.showAnimations ? 'bg-accent-cyan' : 'bg-card-border'
                  )}
                >
                  <span 
                    className={clsx(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      appearance.showAnimations ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Security Settings</h3>
            
            <div className="space-y-4 max-w-md">
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center gap-3 mb-3">
                  <Key size={20} className="text-accent-cyan" />
                  <p className="font-medium">Change Password</p>
                </div>
                <button className="btn-secondary text-sm">Update Password</button>
              </div>
              
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={20} className="text-accent-cyan" />
                  <p className="font-medium">Two-Factor Authentication</p>
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  Add an extra layer of security to your account
                </p>
                <button className="btn-primary text-sm">Enable 2FA</button>
              </div>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Data & Storage</h3>
            
            <div className="space-y-4 max-w-md">
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center gap-3 mb-3">
                  <HardDrive size={20} className="text-accent-cyan" />
                  <p className="font-medium">Local Storage Used</p>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-accent-cyan transition-all" 
                    style={{ width: `${storageInfo.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-text-secondary">
                  {storageInfo.used.toFixed(2)} MB of ~5 MB used
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center gap-3 mb-3">
                  <Download size={20} className="text-accent-cyan" />
                  <p className="font-medium">Export Data</p>
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  Download all your data as a JSON backup file.
                </p>
                <button 
                  onClick={handleExportData}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Download size={16} />
                  Download Backup
                </button>
              </div>
              
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center gap-3 mb-3">
                  <Upload size={20} className="text-accent-cyan" />
                  <p className="font-medium">Import Data</p>
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  Restore from a previous backup file.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-file"
                />
                <label 
                  htmlFor="import-file"
                  className="btn-secondary text-sm flex items-center gap-2 cursor-pointer inline-flex"
                >
                  <Upload size={16} />
                  Select Backup File
                </label>
              </div>
              
              <div className="p-4 rounded-lg bg-surface border border-red-500/20">
                <p className="font-medium text-red-400 mb-2">Danger Zone</p>
                <p className="text-sm text-text-secondary mb-3">
                  Clear all local data. This cannot be undone.
                </p>
                <button 
                  onClick={handleClearData}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Tab */}
        {activeTab === 'shortcuts' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Keyboard Shortcuts</h3>
            <p className="text-sm text-text-secondary mb-6">
              Use these keyboard shortcuts for faster navigation and actions.
            </p>
            
            <div className="space-y-2 max-w-md">
              {keyboardShortcuts.map((shortcut, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-2 py-1 bg-background border border-card-border rounded text-xs font-mono"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-text-tertiary mt-6">
              On macOS, use ⌘ (Command) instead of Ctrl.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
