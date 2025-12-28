'use client';

import { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause,
  Trash2,
  Edit,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { formatRelativeDate } from '@/utils/timeutils';
import { RuleTriggerType, RuleActionType } from '@/data/models';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerType: RuleTriggerType;
  conditions: string[];
  actions: RuleActionType[];
  enabled: boolean;
  lastTriggeredAt: Date | null;
  triggerCount: number;
}

const mockRules: AutomationRule[] = [
  {
    id: '1',
    name: 'Auto-flag High Performers',
    description: 'Mark posts as evergreen when engagement rate exceeds threshold',
    triggerType: 'post_published',
    conditions: ['engagement_rate > 5%'],
    actions: ['mark_evergreen', 'add_to_recycle_queue'],
    enabled: true,
    lastTriggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    triggerCount: 23,
  },
  {
    id: '2',
    name: 'Avoid Overposting',
    description: 'Warn when same content is scheduled too close together',
    triggerType: 'before_schedule',
    conditions: ['same_content_recently_published'],
    actions: ['warn_user', 'suggest_alternative_slot'],
    enabled: true,
    lastTriggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    triggerCount: 8,
  },
  {
    id: '3',
    name: 'Weekly Engagement Alert',
    description: 'Notify when weekly engagement drops below average',
    triggerType: 'metric_threshold_reached',
    conditions: ['engagement_rate < weekly_avg'],
    actions: ['send_notification'],
    enabled: false,
    lastTriggeredAt: null,
    triggerCount: 0,
  },
  {
    id: '4',
    name: 'Content Status Update',
    description: 'Auto-move drafts to ready when reviewed',
    triggerType: 'manual_trigger',
    conditions: ['status == reviewed'],
    actions: ['update_status'],
    enabled: true,
    lastTriggeredAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    triggerCount: 45,
  },
];

const triggerLabels: Record<RuleTriggerType, string> = {
  post_published: 'After Post Published',
  before_schedule: 'Before Scheduling',
  metric_threshold_reached: 'Metric Threshold',
  time_based: 'Time-based',
  manual_trigger: 'Manual Trigger',
};

const triggerColors: Record<RuleTriggerType, string> = {
  post_published: '#00F5D4',
  before_schedule: '#FFB800',
  metric_threshold_reached: '#FF6F91',
  time_based: '#5B5FFF',
  manual_trigger: '#00FF88',
};

const actionLabels: Record<RuleActionType, string> = {
  mark_evergreen: 'Mark Evergreen',
  add_to_recycle_queue: 'Add to Recycle',
  warn_user: 'Show Warning',
  suggest_alternative_slot: 'Suggest Alternative',
  send_notification: 'Send Notification',
  update_status: 'Update Status',
};

export function AutomationView() {
  const [rules, setRules] = useState(mockRules);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const enabledCount = rules.filter(r => r.enabled).length;
  const totalTriggers = rules.reduce((sum, r) => sum + r.triggerCount, 0);

  return (
    <div className="h-full flex flex-col animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Automation Rules</h2>
          <p className="text-sm text-text-secondary">
            {enabledCount} active rules • {totalTriggers} total triggers
          </p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
        >
          <Plus size={16} />
          New Rule
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-cyan/20">
              <Zap size={20} className="text-accent-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rules.length}</p>
              <p className="text-sm text-text-secondary">Total Rules</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enabledCount}</p>
              <p className="text-sm text-text-secondary">Active</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-pink/20">
              <Target size={20} className="text-accent-pink" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTriggers}</p>
              <p className="text-sm text-text-secondary">Total Triggers</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-purple/20">
              <Clock size={20} className="text-accent-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold">2h ago</p>
              <p className="text-sm text-text-secondary">Last Triggered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={clsx(
              'glass-card p-5 transition-all',
              !rule.enabled && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    rule.enabled 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-surface text-text-tertiary'
                  )}
                >
                  {rule.enabled ? <Play size={18} /> : <Pause size={18} />}
                </button>
                
                <div>
                  <h3 className="font-semibold mb-1">{rule.name}</h3>
                  <p className="text-sm text-text-secondary">{rule.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-surface transition-colors text-text-tertiary hover:text-text-primary">
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => deleteRule(rule.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-text-tertiary hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Rule Flow */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Trigger */}
              <div 
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ 
                  backgroundColor: `${triggerColors[rule.triggerType]}20`,
                  color: triggerColors[rule.triggerType]
                }}
              >
                {triggerLabels[rule.triggerType]}
              </div>
              
              <ArrowRight size={16} className="text-text-tertiary" />
              
              {/* Conditions */}
              {rule.conditions.map((condition, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-surface text-sm text-text-secondary">
                  {condition}
                </div>
              ))}
              
              <ArrowRight size={16} className="text-text-tertiary" />
              
              {/* Actions */}
              {rule.actions.map((action, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-accent-purple/20 text-accent-purple text-sm">
                  {actionLabels[action]}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-sm text-text-tertiary pt-3 border-t border-card-border">
              <span>
                Triggered {rule.triggerCount} times
              </span>
              {rule.lastTriggeredAt && (
                <span>
                  Last: {formatRelativeDate(rule.lastTriggeredAt)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-card-border">
        <h3 className="text-sm font-medium mb-3">Quick Templates</h3>
        <div className="flex gap-3">
          <button className="btn-secondary text-sm flex items-center gap-2">
            <Zap size={14} />
            Evergreen Detector
          </button>
          <button className="btn-secondary text-sm flex items-center gap-2">
            <AlertTriangle size={14} />
            Conflict Warning
          </button>
          <button className="btn-secondary text-sm flex items-center gap-2">
            <Clock size={14} />
            Optimal Timing
          </button>
        </div>
      </div>
    </div>
  );
}
