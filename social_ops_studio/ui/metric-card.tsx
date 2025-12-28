'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: number | string;
  delta?: number;
  deltaPercent?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  format?: 'number' | 'percent' | 'currency';
  platformColor?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaPercent,
  trend = 'neutral',
  icon,
  format = 'number',
  platformColor,
}: MetricCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      default:
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        }
        if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} className="text-green-400" />;
      case 'down':
        return <TrendingDown size={16} className="text-red-400" />;
      default:
        return <Minus size={16} className="text-text-tertiary" />;
    }
  };

  return (
    <div className="glass-card p-5 animate-fadeIn">
      <div className="flex items-start justify-between mb-3">
        <span className="text-text-secondary text-sm">{label}</span>
        {icon && (
          <span 
            className="text-text-tertiary"
            style={platformColor ? { color: platformColor } : undefined}
          >
            {icon}
          </span>
        )}
      </div>
      
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold">{formatValue(value)}</span>
        
        {(delta !== undefined || deltaPercent !== undefined) && (
          <div className={clsx(
            'flex items-center gap-1 text-sm pb-1',
            trend === 'up' && 'text-green-400',
            trend === 'down' && 'text-red-400',
            trend === 'neutral' && 'text-text-tertiary'
          )}>
            {getTrendIcon()}
            <span>
              {deltaPercent !== undefined 
                ? `${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`
                : delta !== undefined
                  ? `${delta > 0 ? '+' : ''}${formatValue(delta)}`
                  : ''
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricRowProps {
  metrics: MetricCardProps[];
}

export function MetricRow({ metrics }: MetricRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}
