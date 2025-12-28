'use client';

import { useState } from 'react';
import { useAppStore } from '@/app/store';
import { MetricCard, MetricRow } from '@/ui/metric-card';
import { ChartCard } from '@/ui/chart-card';
import { 
  Eye, 
  Users, 
  Calendar, 
  TrendingUp,
  Heart,
  MessageSquare,
  Share2,
  Clock
} from 'lucide-react';
import { formatRelativeDate } from '@/utils/timeutils';
import { subDays, format } from 'date-fns';

// Generate mock data for charts
function generateMockEngagementData(days: number) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: format(date, 'MMM d'),
      likes: Math.floor(Math.random() * 500) + 100,
      comments: Math.floor(Math.random() * 100) + 20,
      shares: Math.floor(Math.random() * 50) + 10,
      saves: Math.floor(Math.random() * 30) + 5,
    });
  }
  return data;
}

function generateMockPlatformData() {
  return [
    { name: 'Twitter/X', impressions: 45000, engagementRate: 4.2 },
    { name: 'Instagram', impressions: 62000, engagementRate: 5.8 },
    { name: 'TikTok', impressions: 120000, engagementRate: 8.3 },
    { name: 'LinkedIn', impressions: 15000, engagementRate: 3.1 },
    { name: 'YouTube', impressions: 35000, engagementRate: 6.5 },
  ];
}

interface UpcomingPost {
  id: string;
  title: string;
  platform: string;
  scheduledFor: Date;
  platformColor: string;
}

const mockUpcomingPosts: UpcomingPost[] = [
  { 
    id: '1', 
    title: 'New Product Launch Announcement 🚀', 
    platform: 'Twitter/X', 
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
    platformColor: '#1DA1F2'
  },
  { 
    id: '2', 
    title: 'Behind the Scenes - Studio Tour', 
    platform: 'Instagram', 
    scheduledFor: new Date(Date.now() + 5 * 60 * 60 * 1000),
    platformColor: '#E1306C'
  },
  { 
    id: '3', 
    title: 'Quick Tips: Productivity Hacks', 
    platform: 'TikTok', 
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    platformColor: '#FF0050'
  },
  { 
    id: '4', 
    title: 'Weekly Newsletter Preview', 
    platform: 'LinkedIn', 
    scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000),
    platformColor: '#0A66C2'
  },
];

interface ActivityItem {
  id: string;
  type: 'post' | 'metric' | 'comment' | 'milestone';
  message: string;
  timestamp: Date;
}

const mockActivityFeed: ActivityItem[] = [
  { id: '1', type: 'milestone', message: 'Reached 10K followers on Instagram! 🎉', timestamp: new Date(Date.now() - 30 * 60 * 1000) },
  { id: '2', type: 'post', message: 'Post "Summer Collection" published on Twitter', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '3', type: 'comment', message: '15 new comments on TikTok video', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) },
  { id: '4', type: 'metric', message: 'Engagement rate increased by 12%', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  { id: '5', type: 'post', message: 'Scheduled 3 new posts for next week', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) },
];

export function DashboardOverview() {
  const { accounts, scheduledPosts } = useAppStore();
  const [engagementData] = useState(generateMockEngagementData(30));
  const [platformData] = useState(generateMockPlatformData());

  // Calculate metrics
  const totalReach = 287500;
  const followerDelta = 1243;
  const postsScheduled = scheduledPosts.length || mockUpcomingPosts.length;
  const engagementRate = 5.2;
  const totalImpressions = 892000;
  const totalEngagements = 46500;
  const activePlatforms = accounts.length || 5;
  const avgPostingFrequency = 2.3;

  const heroMetrics = [
    { 
      label: 'Total Reach (30d)', 
      value: totalReach, 
      delta: 32500, 
      deltaPercent: 12.7, 
      trend: 'up' as const,
      icon: <Eye size={20} />
    },
    { 
      label: 'Follower Growth (7d)', 
      value: followerDelta, 
      delta: 234, 
      deltaPercent: 23.2, 
      trend: 'up' as const,
      icon: <Users size={20} />
    },
    { 
      label: 'Posts Scheduled', 
      value: postsScheduled, 
      trend: 'neutral' as const,
      icon: <Calendar size={20} />
    },
    { 
      label: 'Engagement Rate', 
      value: engagementRate, 
      delta: 0.8, 
      deltaPercent: 18.2, 
      trend: 'up' as const,
      format: 'percent' as const,
      icon: <TrendingUp size={20} />
    },
  ];

  const engagementSeries = [
    { key: 'likes', name: 'Likes', color: '#FF6F91' },
    { key: 'comments', name: 'Comments', color: '#00F5D4' },
    { key: 'shares', name: 'Shares', color: '#5B5FFF' },
    { key: 'saves', name: 'Saves', color: '#FFB800' },
  ];

  const platformSeries = [
    { key: 'impressions', name: 'Impressions', color: '#00F5D4' },
  ];

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Welcome Hero */}
      <div className="glass-card p-6 bg-gradient-to-r from-accent-cyan/10 via-transparent to-accent-purple/10">
        <h1 className="text-2xl font-bold mb-2">Welcome back, Dev! 👋</h1>
        <p className="text-text-secondary">
          Here&apos;s your performance snapshot and upcoming posts for today.
        </p>
      </div>

      {/* Hero Metrics Row */}
      <MetricRow metrics={heroMetrics} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Engagement Trends"
          type="line"
          data={engagementData}
          series={engagementSeries}
          xAxisKey="date"
        />
        <ChartCard
          title="Platform Performance"
          type="bar"
          data={platformData}
          series={platformSeries}
          xAxisKey="name"
          timeRanges={['7d', '30d', '90d', 'All']}
        />
      </div>

      {/* Bottom Row - Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Posts */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Next Scheduled Posts</h3>
            <button className="text-sm text-accent-cyan hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {mockUpcomingPosts.map((post) => (
              <div 
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
              >
                <div 
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: post.platformColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{post.title}</p>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span style={{ color: post.platformColor }}>{post.platform}</span>
                    <span>•</span>
                    <Clock size={14} />
                    <span>{formatRelativeDate(post.scheduledFor)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button className="text-sm text-accent-cyan hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {mockActivityFeed.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-background/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'milestone' ? 'bg-accent-pink/20 text-accent-pink' :
                  activity.type === 'post' ? 'bg-accent-cyan/20 text-accent-cyan' :
                  activity.type === 'comment' ? 'bg-accent-purple/20 text-accent-purple' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {activity.type === 'milestone' && '🎉'}
                  {activity.type === 'post' && <Calendar size={14} />}
                  {activity.type === 'comment' && <MessageSquare size={14} />}
                  {activity.type === 'metric' && <TrendingUp size={14} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {formatRelativeDate(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Impressions (30d)"
          value={totalImpressions}
          icon={<Eye size={18} />}
        />
        <MetricCard
          label="Total Engagements"
          value={totalEngagements}
          icon={<Heart size={18} />}
        />
        <MetricCard
          label="Active Platforms"
          value={activePlatforms}
          icon={<Share2 size={18} />}
        />
        <MetricCard
          label="Avg. Posts/Day"
          value={avgPostingFrequency.toFixed(1)}
          icon={<Calendar size={18} />}
        />
      </div>
    </div>
  );
}
