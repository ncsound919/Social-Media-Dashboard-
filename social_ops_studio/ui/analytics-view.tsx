'use client';

import { useState } from 'react';
import { ChartCard } from '@/ui/chart-card';
import { MetricCard, MetricRow } from '@/ui/metric-card';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Eye, 
  Heart, 
  MessageSquare,
  Share2,
  Bookmark,
  Clock,
  Target
} from 'lucide-react';
import clsx from 'clsx';
import { subDays, format } from 'date-fns';
import { Platform } from '@/data/models';

type AnalyticsTab = 'overview' | 'platform' | 'content' | 'experiments';

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

// Generate mock data
function generateFollowerGrowth(days: number) {
  const data = [];
  let followers = 45000;
  for (let i = days - 1; i >= 0; i--) {
    followers += Math.floor(Math.random() * 200) - 50;
    data.push({
      date: format(subDays(new Date(), i), 'MMM d'),
      followers,
    });
  }
  return data;
}

function generateEngagementByType() {
  return [
    { type: 'Likes', value: 15420, change: 12.5 },
    { type: 'Comments', value: 3280, change: 8.2 },
    { type: 'Shares', value: 1450, change: -3.1 },
    { type: 'Saves', value: 890, change: 22.4 },
  ];
}

function generatePlatformPerformance() {
  return [
    { platform: 'Instagram', followers: 42000, impressions: 125000, engagement: 5.8, posts: 45 },
    { platform: 'Twitter/X', followers: 28500, impressions: 89000, engagement: 4.2, posts: 120 },
    { platform: 'TikTok', followers: 15200, impressions: 350000, engagement: 8.5, posts: 28 },
    { platform: 'LinkedIn', followers: 8900, impressions: 35000, engagement: 3.1, posts: 32 },
    { platform: 'YouTube', followers: 12400, impressions: 78000, engagement: 6.2, posts: 12 },
  ];
}

function generateBestTimes() {
  return [
    { day: 'Mon', hour: 9, engagements: 450 },
    { day: 'Mon', hour: 12, engagements: 680 },
    { day: 'Mon', hour: 17, engagements: 520 },
    { day: 'Tue', hour: 10, engagements: 390 },
    { day: 'Tue', hour: 14, engagements: 720 },
    { day: 'Wed', hour: 9, engagements: 580 },
    { day: 'Wed', hour: 18, engagements: 890 },
    { day: 'Thu', hour: 11, engagements: 650 },
    { day: 'Thu', hour: 19, engagements: 780 },
    { day: 'Fri', hour: 10, engagements: 420 },
    { day: 'Fri', hour: 15, engagements: 550 },
  ];
}

export function AnalyticsView() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [timeRange, setTimeRange] = useState('30d');
  
  const followerData = generateFollowerGrowth(30);
  const engagementByType = generateEngagementByType();
  const platformPerformance = generatePlatformPerformance();
  const bestTimes = generateBestTimes();

  const overviewMetrics = [
    { 
      label: 'Total Followers', 
      value: 107000, 
      delta: 3420, 
      deltaPercent: 3.3,
      trend: 'up' as const,
      icon: <Users size={18} /> 
    },
    { 
      label: 'Total Impressions', 
      value: 677000, 
      delta: 45000, 
      deltaPercent: 7.1,
      trend: 'up' as const,
      icon: <Eye size={18} /> 
    },
    { 
      label: 'Avg Engagement Rate', 
      value: 5.6, 
      delta: 0.4, 
      deltaPercent: 7.7,
      trend: 'up' as const,
      format: 'percent' as const,
      icon: <Heart size={18} /> 
    },
    { 
      label: 'Best Post Time', 
      value: 'Wed 6PM', 
      trend: 'neutral' as const,
      icon: <Clock size={18} /> 
    },
  ];

  const tabs: { id: AnalyticsTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'platform', label: 'Per Platform' },
    { id: 'content', label: 'Content Type' },
    { id: 'experiments', label: 'Experiments' },
  ];

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-2 text-sm rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 bg-surface border border-card-border rounded-lg text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="12m">Last 12 months</option>
        </select>
      </div>

      {/* Overview Metrics */}
      <MetricRow metrics={overviewMetrics} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower Growth */}
        <ChartCard
          title="Follower Growth"
          type="line"
          data={followerData}
          series={[{ key: 'followers', name: 'Followers', color: '#00F5D4' }]}
          xAxisKey="date"
        />

        {/* Engagement by Type */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-4">Engagement Breakdown</h3>
          <div className="space-y-4">
            {engagementByType.map((item) => (
              <div key={item.type} className="flex items-center gap-4">
                <div className="w-24">
                  <span className="text-sm text-text-secondary">{item.type}</span>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.value / 20000) * 100}%`,
                        background: item.type === 'Likes' ? '#FF6F91' :
                                   item.type === 'Comments' ? '#00F5D4' :
                                   item.type === 'Shares' ? '#5B5FFF' : '#FFB800'
                      }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className="font-medium">{item.value.toLocaleString()}</span>
                </div>
                <div className={clsx(
                  'w-16 text-right text-sm',
                  item.change > 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Performance Table */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold mb-4">Platform Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Platform</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Followers</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Impressions</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Engagement</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Posts</th>
              </tr>
            </thead>
            <tbody>
              {platformPerformance.map((row) => (
                <tr key={row.platform} className="border-b border-card-border/50 hover:bg-surface/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: row.platform === 'Instagram' ? '#E1306C' :
                                          row.platform === 'Twitter/X' ? '#1DA1F2' :
                                          row.platform === 'TikTok' ? '#FF0050' :
                                          row.platform === 'LinkedIn' ? '#0A66C2' : '#FF0000'
                        }}
                      />
                      <span className="font-medium">{row.platform}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">{row.followers.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">{row.impressions.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={clsx(
                      'px-2 py-1 rounded text-sm',
                      row.engagement > 5 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    )}>
                      {row.engagement}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-text-secondary">{row.posts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Times Heat Map */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold mb-4">Best Times to Post</h3>
        <div className="flex items-center gap-6 flex-wrap">
          {bestTimes.slice(0, 6).map((time, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface"
            >
              <Clock size={16} className="text-accent-cyan" />
              <div>
                <p className="font-medium">{time.day} {time.hour}:00</p>
                <p className="text-sm text-text-secondary">
                  {time.engagements} avg. engagements
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp size={20} className="text-green-400" />
            </div>
            <div>
              <p className="font-medium mb-1">Top Performing Content</p>
              <p className="text-sm text-text-secondary">
                Video content has 45% higher engagement than images
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent-cyan/20">
              <Target size={20} className="text-accent-cyan" />
            </div>
            <div>
              <p className="font-medium mb-1">Audience Growth</p>
              <p className="text-sm text-text-secondary">
                TikTok growing fastest at +15% month over month
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent-pink/20">
              <Clock size={20} className="text-accent-pink" />
            </div>
            <div>
              <p className="font-medium mb-1">Optimal Posting</p>
              <p className="text-sm text-text-secondary">
                Best results on Wed and Thu between 5-7 PM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
