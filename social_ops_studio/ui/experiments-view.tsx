'use client';

import { useState } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Pause,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Layers
} from 'lucide-react';
import clsx from 'clsx';
import { formatRelativeDate } from '@/utils/timeutils';

interface Experiment {
  id: string;
  name: string;
  dimensions: string[];
  variants: ExperimentVariant[];
  metrics: string[];
  status: 'draft' | 'running' | 'completed';
  startDate: Date;
  endDate: Date | null;
  results?: {
    winner: string;
    lift: number;
    confidence: number;
  };
}

interface ExperimentVariant {
  id: string;
  name: string;
  configuration: Record<string, string>;
  metrics: Record<string, number>;
}

const mockExperiments: Experiment[] = [
  {
    id: '1',
    name: 'Hook Testing - Product Launch',
    dimensions: ['hook', 'visual_style'],
    variants: [
      { id: 'a', name: 'Variant A', configuration: { hook: 'Question', visual_style: 'Minimal' }, metrics: { ctr: 4.2, save_rate: 2.1, share_rate: 1.8 } },
      { id: 'b', name: 'Variant B', configuration: { hook: 'Statement', visual_style: 'Bold' }, metrics: { ctr: 5.8, save_rate: 3.4, share_rate: 2.5 } },
    ],
    metrics: ['ctr', 'save_rate', 'share_rate'],
    status: 'running',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    endDate: null,
  },
  {
    id: '2',
    name: 'Posting Time Optimization',
    dimensions: ['posting_time'],
    variants: [
      { id: 'a', name: 'Morning (9AM)', configuration: { posting_time: '9:00 AM' }, metrics: { ctr: 3.8, engagement: 5.2 } },
      { id: 'b', name: 'Afternoon (2PM)', configuration: { posting_time: '2:00 PM' }, metrics: { ctr: 4.1, engagement: 4.8 } },
      { id: 'c', name: 'Evening (7PM)', configuration: { posting_time: '7:00 PM' }, metrics: { ctr: 5.5, engagement: 6.8 } },
    ],
    metrics: ['ctr', 'engagement'],
    status: 'completed',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    results: {
      winner: 'Evening (7PM)',
      lift: 38,
      confidence: 95,
    },
  },
  {
    id: '3',
    name: 'CTA Button Test',
    dimensions: ['call_to_action'],
    variants: [
      { id: 'a', name: 'Learn More', configuration: { call_to_action: 'Learn More' }, metrics: { ctr: 2.8 } },
      { id: 'b', name: 'Shop Now', configuration: { call_to_action: 'Shop Now' }, metrics: { ctr: 4.2 } },
    ],
    metrics: ['ctr'],
    status: 'draft',
    startDate: new Date(),
    endDate: null,
  },
];

const metricLabels: Record<string, string> = {
  ctr: 'Click-through Rate',
  save_rate: 'Save Rate',
  share_rate: 'Share Rate',
  engagement: 'Engagement',
  comment_depth: 'Comment Depth',
};

const dimensionLabels: Record<string, string> = {
  hook: 'Hook Style',
  visual_style: 'Visual Style',
  posting_time: 'Posting Time',
  call_to_action: 'Call to Action',
};

export function ExperimentsView() {
  const [experiments, setExperiments] = useState(mockExperiments);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);

  const statusConfig = {
    draft: { label: 'Draft', color: 'text-text-tertiary', bg: 'bg-surface' },
    running: { label: 'Running', color: 'text-green-400', bg: 'bg-green-500/10' },
    completed: { label: 'Completed', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
  };

  const runningCount = experiments.filter(e => e.status === 'running').length;
  const completedCount = experiments.filter(e => e.status === 'completed').length;

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Arcs & Experiments</h2>
          <p className="text-sm text-text-secondary">
            Test content variations and discover what works best
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <Plus size={16} />
          New Experiment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-cyan/20">
              <FlaskConical size={20} className="text-accent-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold">{experiments.length}</p>
              <p className="text-sm text-text-secondary">Total Experiments</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Play size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{runningCount}</p>
              <p className="text-sm text-text-secondary">Running</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-cyan/20">
              <Target size={20} className="text-accent-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-sm text-text-secondary">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-pink/20">
              <ArrowUpRight size={20} className="text-accent-pink" />
            </div>
            <div>
              <p className="text-2xl font-bold">+38%</p>
              <p className="text-sm text-text-secondary">Best Lift</p>
            </div>
          </div>
        </div>
      </div>

      {/* Experiments List */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold mb-4">All Experiments</h3>
        
        <div className="space-y-4">
          {experiments.map((exp) => {
            const status = statusConfig[exp.status];
            
            return (
              <div 
                key={exp.id} 
                className={clsx(
                  'p-5 rounded-lg bg-surface hover:bg-surface/70 transition-all cursor-pointer',
                  selectedExperiment?.id === exp.id && 'ring-1 ring-accent-cyan'
                )}
                onClick={() => setSelectedExperiment(exp)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{exp.name}</h4>
                      <span className={clsx('px-2 py-0.5 text-xs rounded', status.bg, status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Layers size={14} />
                        {exp.variants.length} variants
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Started {formatRelativeDate(exp.startDate)}
                      </span>
                    </div>
                  </div>
                  
                  {exp.status === 'running' && (
                    <button className="p-2 rounded-lg bg-green-500/20 text-green-400">
                      <Pause size={16} />
                    </button>
                  )}
                </div>

                {/* Dimensions */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-text-tertiary">Testing:</span>
                  {exp.dimensions.map((dim) => (
                    <span key={dim} className="px-2 py-1 text-xs rounded bg-background text-text-secondary">
                      {dimensionLabels[dim] || dim}
                    </span>
                  ))}
                </div>

                {/* Variants Performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exp.variants.map((variant, idx) => {
                    const isWinner = exp.results?.winner === variant.name;
                    
                    return (
                      <div 
                        key={variant.id}
                        className={clsx(
                          'p-3 rounded-lg',
                          isWinner 
                            ? 'bg-accent-cyan/10 border border-accent-cyan/30' 
                            : 'bg-background'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{variant.name}</span>
                          {isWinner && (
                            <span className="text-xs text-accent-cyan flex items-center gap-1">
                              <ArrowUpRight size={12} />
                              Winner
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {Object.entries(variant.metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-text-tertiary">{metricLabels[key] || key}</span>
                              <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Results */}
                {exp.results && (
                  <div className="mt-4 pt-4 border-t border-card-border">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-text-tertiary text-sm">Winner: </span>
                        <span className="font-medium text-accent-cyan">{exp.results.winner}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary text-sm">Lift: </span>
                        <span className="font-medium text-green-400">+{exp.results.lift}%</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary text-sm">Confidence: </span>
                        <span className="font-medium">{exp.results.confidence}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Start Templates */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold mb-4">Quick Start Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 rounded-lg border border-card-border hover:border-accent-cyan hover:bg-accent-cyan/5 transition-all text-left">
            <h4 className="font-medium mb-1">Hook A/B Test</h4>
            <p className="text-sm text-text-secondary">Compare different opening lines</p>
          </button>
          <button className="p-4 rounded-lg border border-card-border hover:border-accent-pink hover:bg-accent-pink/5 transition-all text-left">
            <h4 className="font-medium mb-1">Posting Time Test</h4>
            <p className="text-sm text-text-secondary">Find your best posting times</p>
          </button>
          <button className="p-4 rounded-lg border border-card-border hover:border-accent-purple hover:bg-accent-purple/5 transition-all text-left">
            <h4 className="font-medium mb-1">Visual Style Test</h4>
            <p className="text-sm text-text-secondary">Test image vs video content</p>
          </button>
        </div>
      </div>
    </div>
  );
}
