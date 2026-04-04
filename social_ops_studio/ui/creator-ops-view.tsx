'use client';

import { useState } from 'react';
import { 
  Target, 
  FileText, 
  Plus, 
  Copy,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

interface MicroBrief {
  id: string;
  campaignId: string;
  goal: string;
  targetAudience: string;
  keyMessage: string;
  tone: string;
  deliverableType: string;
  status: 'draft' | 'ready' | 'in_use';
  createdAt: Date;
}

const mockBriefs: MicroBrief[] = [
  {
    id: '1',
    campaignId: 'Q4 Launch',
    goal: 'Drive product awareness',
    targetAudience: 'Tech enthusiasts 25-35',
    keyMessage: 'Revolutionary features for modern creators',
    tone: 'Excited, Professional',
    deliverableType: 'social_post',
    status: 'ready',
    createdAt: new Date(),
  },
  {
    id: '2',
    campaignId: 'Holiday Campaign',
    goal: 'Increase engagement',
    targetAudience: 'Existing customers',
    keyMessage: 'Thank you for an amazing year',
    tone: 'Warm, Grateful',
    deliverableType: 'short_video',
    status: 'draft',
    createdAt: new Date(),
  },
  {
    id: '3',
    campaignId: 'Brand Refresh',
    goal: 'Introduce new visual identity',
    targetAudience: 'All followers',
    keyMessage: 'Same mission, fresh look',
    tone: 'Modern, Bold',
    deliverableType: 'carousel',
    status: 'in_use',
    createdAt: new Date(),
  },
];

const briefTemplates = [
  { id: 'social_post', label: 'Social Post', icon: <FileText size={18} />, color: '#00F5D4' },
  { id: 'short_video', label: 'Short Video', icon: <Target size={18} />, color: '#FF6F91' },
  { id: 'email_blurb', label: 'Email Blurb', icon: <FileText size={18} />, color: '#5B5FFF' },
  { id: 'flyer_graphic', label: 'Flyer/Graphic', icon: <FileText size={18} />, color: '#FFB800' },
  { id: 'landing_section', label: 'Landing Section', icon: <FileText size={18} />, color: '#00FF88' },
];

const toneOptions = ['Professional', 'Casual', 'Excited', 'Warm', 'Bold', 'Humorous', 'Inspiring'];

export function CreatorOpsView() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [briefs] = useState(mockBriefs);

  const statusConfig = {
    draft: { label: 'Draft', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    ready: { label: 'Ready', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
    in_use: { label: 'In Use', color: 'text-green-400', bg: 'bg-green-500/10' },
  };

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Creator Ops</h2>
          <p className="text-sm text-text-secondary">
            Generate content briefs and manage your creative workflow
          </p>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold mb-4">Quick Brief Templates</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {briefTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={clsx(
                'p-4 rounded-lg border transition-all text-center',
                selectedTemplate === template.id
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-card-border hover:border-text-tertiary'
              )}
            >
              <div 
                className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${template.color}20` }}
              >
                <span style={{ color: template.color }}>{template.icon}</span>
              </div>
              <p className="text-sm font-medium">{template.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Brief Generator Form */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles size={20} className="text-accent-cyan" />
            Micro Brief Generator
          </h3>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            Generate Brief
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Campaign</label>
            <input
              type="text"
              placeholder="e.g., Q4 Product Launch"
              className="w-full px-4 py-2 bg-background border border-card-border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Goal</label>
            <input
              type="text"
              placeholder="e.g., Drive awareness, Increase engagement"
              className="w-full px-4 py-2 bg-background border border-card-border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Target Audience</label>
            <input
              type="text"
              placeholder="e.g., Tech enthusiasts 25-35"
              className="w-full px-4 py-2 bg-background border border-card-border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Key Message</label>
            <input
              type="text"
              placeholder="Core message to communicate"
              className="w-full px-4 py-2 bg-background border border-card-border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Tone</label>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((tone) => (
                <button
                  key={tone}
                  className="px-3 py-1.5 text-sm rounded-lg border border-card-border hover:border-accent-cyan hover:text-accent-cyan transition-colors"
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Deliverable Type</label>
            <select className="w-full px-4 py-2 bg-background border border-card-border rounded-lg">
              <option>Social Post</option>
              <option>Short Video</option>
              <option>Email Blurb</option>
              <option>Flyer/Graphic</option>
              <option>Landing Section</option>
            </select>
          </div>
        </div>
      </div>

      {/* Saved Briefs */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Saved Briefs</h3>
          <span className="text-sm text-text-secondary">{briefs.length} briefs</span>
        </div>

        <div className="space-y-3">
          {briefs.map((brief) => {
            const status = statusConfig[brief.status];
            
            return (
              <div key={brief.id} className="p-4 rounded-lg bg-surface hover:bg-surface/70 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{brief.campaignId}</h4>
                      <span className={clsx('px-2 py-0.5 text-xs rounded', status.bg, status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{brief.goal}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-background transition-colors text-text-tertiary hover:text-text-primary">
                      <Copy size={16} />
                    </button>
                    <button className="btn-secondary text-sm py-1.5 flex items-center gap-1">
                      Use Brief
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-text-tertiary">Audience:</span>
                    <p className="text-text-secondary">{brief.targetAudience}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Key Message:</span>
                    <p className="text-text-secondary">{brief.keyMessage}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Tone:</span>
                    <p className="text-text-secondary">{brief.tone}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
