'use client';

import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  MoreHorizontal,
  Calendar as CalendarIcon
} from 'lucide-react';
import clsx from 'clsx';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { Platform } from '@/data/models';

interface ScheduledPostDisplay {
  id: string;
  title: string;
  platform: Platform;
  time: string;
  status: 'pending' | 'published' | 'failed';
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

// Mock scheduled posts
const mockScheduledPosts: Record<string, ScheduledPostDisplay[]> = {
  [format(new Date(), 'yyyy-MM-dd')]: [
    { id: '1', title: 'Product Launch 🚀', platform: 'twitter_x', time: '10:00 AM', status: 'pending' },
    { id: '2', title: 'Behind the Scenes', platform: 'instagram_business', time: '2:00 PM', status: 'pending' },
  ],
  [format(addDays(new Date(), 1), 'yyyy-MM-dd')]: [
    { id: '3', title: 'Tutorial Video', platform: 'youtube', time: '11:00 AM', status: 'pending' },
    { id: '4', title: 'Quick Tips Thread', platform: 'twitter_x', time: '4:00 PM', status: 'pending' },
  ],
  [format(addDays(new Date(), 2), 'yyyy-MM-dd')]: [
    { id: '5', title: 'User Story Highlight', platform: 'linkedin_pages', time: '9:00 AM', status: 'pending' },
  ],
  [format(addDays(new Date(), 3), 'yyyy-MM-dd')]: [
    { id: '6', title: 'Weekend Vibes', platform: 'tiktok', time: '7:00 PM', status: 'pending' },
    { id: '7', title: 'Community Poll', platform: 'twitter_x', time: '12:00 PM', status: 'pending' },
    { id: '8', title: 'Story Series', platform: 'instagram_business', time: '3:00 PM', status: 'pending' },
  ],
  [format(addDays(new Date(), 5), 'yyyy-MM-dd')]: [
    { id: '9', title: 'Weekly Roundup', platform: 'linkedin_pages', time: '10:00 AM', status: 'pending' },
  ],
  [format(addDays(new Date(), 7), 'yyyy-MM-dd')]: [
    { id: '10', title: 'New Feature Announcement', platform: 'twitter_x', time: '11:00 AM', status: 'pending' },
    { id: '11', title: 'Feature Demo', platform: 'youtube', time: '2:00 PM', status: 'pending' },
  ],
};

type ViewMode = 'month' | 'week' | 'list';

export function ScheduleView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const getDaysArray = () => {
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getPostsForDate = (date: Date): ScheduledPostDisplay[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return mockScheduledPosts[dateKey] || [];
  };

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  return (
    <div className="h-full flex flex-col animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-surface transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm rounded-lg hover:bg-surface transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg hover:bg-surface transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface rounded-lg p-1">
            {(['month', 'week', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-4 py-1.5 text-sm rounded-md transition-colors capitalize',
                  viewMode === mode
                    ? 'bg-accent-cyan/20 text-accent-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <Plus size={16} />
            Schedule Post
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 glass-card p-4 overflow-hidden flex flex-col">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm text-text-tertiary py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {getDaysArray().map((day) => {
              const posts = getPostsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    'p-2 rounded-lg text-left transition-all min-h-[80px] flex flex-col',
                    !isCurrentMonth && 'opacity-30',
                    isSelected && 'ring-2 ring-accent-cyan bg-accent-cyan/10',
                    !isSelected && 'hover:bg-surface'
                  )}
                >
                  <span className={clsx(
                    'text-sm font-medium mb-1',
                    isCurrentDay && 'w-6 h-6 bg-accent-cyan text-background rounded-full flex items-center justify-center'
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Post Indicators */}
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {posts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: platformColors[post.platform] }}
                        title={post.title}
                      />
                    ))}
                    {posts.length > 3 && (
                      <span className="text-[10px] text-text-tertiary">
                        +{posts.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Selected Day Details */}
        <div className="w-[320px] flex-shrink-0">
          <div className="glass-card p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a day'}
              </h3>
              <button className="p-1.5 rounded hover:bg-surface transition-colors">
                <MoreHorizontal size={16} className="text-text-tertiary" />
              </button>
            </div>

            {selectedDatePosts.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3">
                {selectedDatePosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-full min-h-[40px] rounded-full"
                        style={{ backgroundColor: platformColors[post.platform] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                          <Clock size={12} />
                          <span>{post.time}</span>
                          <span 
                            className="px-1.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${platformColors[post.platform]}20`,
                              color: platformColors[post.platform]
                            }}
                          >
                            {post.platform.replace('_', ' ').replace('business', '').replace('pages', '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <CalendarIcon size={40} className="text-text-tertiary mb-3" />
                <p className="text-text-secondary text-sm mb-4">
                  No posts scheduled for this day
                </p>
                <button className="btn-secondary flex items-center gap-2 text-sm">
                  <Plus size={14} />
                  Schedule a post
                </button>
              </div>
            )}

            {/* Quick Add */}
            {selectedDatePosts.length > 0 && (
              <button className="mt-4 w-full p-3 border border-dashed border-card-border rounded-lg text-text-tertiary hover:text-text-secondary hover:border-text-tertiary transition-colors flex items-center justify-center gap-2 text-sm">
                <Plus size={16} />
                Add Another Post
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
