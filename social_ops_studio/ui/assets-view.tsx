'use client';

import { useState } from 'react';
import { 
  Image, 
  Video, 
  Music, 
  FileText, 
  Hash,
  Search,
  Grid,
  List,
  Upload,
  FolderOpen,
  Tag,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import clsx from 'clsx';

type AssetType = 'images' | 'videos' | 'audio' | 'templates' | 'hashtags';
type ViewMode = 'grid' | 'list';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  thumbnail: string;
  tags: string[];
  size: string;
  dimensions?: string;
  createdAt: Date;
}

const mockAssets: Asset[] = [
  { id: '1', name: 'Product Hero Shot', type: 'images', thumbnail: '/placeholder.jpg', tags: ['product', 'marketing'], size: '2.4 MB', dimensions: '1920x1080', createdAt: new Date() },
  { id: '2', name: 'Team Photo', type: 'images', thumbnail: '/placeholder.jpg', tags: ['team', 'about'], size: '1.8 MB', dimensions: '1200x800', createdAt: new Date() },
  { id: '3', name: 'Instagram Story BG', type: 'templates', thumbnail: '/placeholder.jpg', tags: ['instagram', 'story'], size: '450 KB', dimensions: '1080x1920', createdAt: new Date() },
  { id: '4', name: 'Product Demo Video', type: 'videos', thumbnail: '/placeholder.jpg', tags: ['product', 'demo'], size: '45 MB', dimensions: '1920x1080', createdAt: new Date() },
  { id: '5', name: 'Podcast Intro', type: 'audio', thumbnail: '/placeholder.jpg', tags: ['podcast', 'intro'], size: '3.2 MB', createdAt: new Date() },
  { id: '6', name: 'Marketing Hashtags', type: 'hashtags', thumbnail: '/placeholder.jpg', tags: ['marketing'], size: '-', createdAt: new Date() },
  { id: '7', name: 'Office Tour Reel', type: 'videos', thumbnail: '/placeholder.jpg', tags: ['office', 'culture'], size: '28 MB', dimensions: '1080x1920', createdAt: new Date() },
  { id: '8', name: 'LinkedIn Banner', type: 'templates', thumbnail: '/placeholder.jpg', tags: ['linkedin', 'banner'], size: '680 KB', dimensions: '1584x396', createdAt: new Date() },
];

const categoryConfig: Record<AssetType, { label: string; icon: React.ReactNode; color: string }> = {
  images: { label: 'Images', icon: <Image size={18} />, color: '#00F5D4' },
  videos: { label: 'Videos', icon: <Video size={18} />, color: '#FF6F91' },
  audio: { label: 'Audio', icon: <Music size={18} />, color: '#5B5FFF' },
  templates: { label: 'Templates', icon: <FileText size={18} />, color: '#FFB800' },
  hashtags: { label: 'Hashtag Sets', icon: <Hash size={18} />, color: '#00FF88' },
};

export function AssetsView() {
  const [activeCategory, setActiveCategory] = useState<AssetType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = mockAssets.filter(asset => {
    if (activeCategory !== 'all' && asset.type !== activeCategory) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCategoryCount = (type: AssetType) => mockAssets.filter(a => a.type === type).length;

  return (
    <div className="h-full flex flex-col animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Assets Library</h2>
          <p className="text-sm text-text-secondary">
            {mockAssets.length} assets • Manage your media files and templates
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface border border-card-border rounded-lg text-sm w-[200px]"
            />
          </div>
          
          <div className="flex bg-surface rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-tertiary'
              )}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-tertiary'
              )}
            >
              <List size={16} />
            </button>
          </div>
          
          <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <Upload size={16} />
            Upload
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sidebar Categories */}
        <div className="w-[200px] flex-shrink-0">
          <div className="glass-card p-3 space-y-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                activeCategory === 'all'
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-text-secondary hover:bg-surface'
              )}
            >
              <FolderOpen size={18} />
              <span>All Assets</span>
              <span className="ml-auto text-xs bg-surface px-2 py-0.5 rounded-full">
                {mockAssets.length}
              </span>
            </button>
            
            {(Object.keys(categoryConfig) as AssetType[]).map((type) => {
              const config = categoryConfig[type];
              const count = getCategoryCount(type);
              
              return (
                <button
                  key={type}
                  onClick={() => setActiveCategory(type)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                    activeCategory === type
                      ? 'bg-surface'
                      : 'text-text-secondary hover:bg-surface/50'
                  )}
                >
                  <span style={{ color: config.color }}>{config.icon}</span>
                  <span>{config.label}</span>
                  <span className="ml-auto text-xs text-text-tertiary">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Tags */}
          <div className="glass-card p-3 mt-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Tag size={14} />
              Popular Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {['product', 'marketing', 'team', 'instagram', 'linkedin'].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs rounded bg-surface text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Assets Grid/List */}
        <div className="flex-1 overflow-y-auto">
          {filteredAssets.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => {
                  const config = categoryConfig[asset.type];
                  
                  return (
                    <div key={asset.id} className="glass-card overflow-hidden group">
                      <div className="aspect-square bg-surface relative flex items-center justify-center">
                        <span style={{ color: config.color }}>
                          {asset.type === 'images' && <Image size={48} />}
                          {asset.type === 'videos' && <Video size={48} />}
                          {asset.type === 'audio' && <Music size={48} />}
                          {asset.type === 'templates' && <FileText size={48} />}
                          {asset.type === 'hashtags' && <Hash size={48} />}
                        </span>
                        
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button className="p-2 rounded-lg bg-accent-cyan/20 text-accent-cyan">
                            Open
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-3">
                        <p className="font-medium text-sm truncate mb-1">{asset.name}</p>
                        <div className="flex items-center justify-between text-xs text-text-tertiary">
                          <span>{asset.size}</span>
                          {asset.dimensions && <span>{asset.dimensions}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Upload Card */}
                <button className="aspect-square border-2 border-dashed border-card-border rounded-card flex flex-col items-center justify-center gap-2 text-text-tertiary hover:text-text-secondary hover:border-text-tertiary transition-colors">
                  <Plus size={24} />
                  <span className="text-sm">Upload New</span>
                </button>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-card-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Tags</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => {
                      const config = categoryConfig[asset.type];
                      
                      return (
                        <tr key={asset.id} className="border-b border-card-border/50 hover:bg-surface/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span style={{ color: config.color }}>{config.icon}</span>
                              <span className="font-medium">{asset.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-text-secondary">{config.label}</td>
                          <td className="py-3 px-4 text-text-secondary">{asset.size}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              {asset.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="px-2 py-0.5 text-xs rounded bg-surface text-text-tertiary">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="p-1.5 rounded hover:bg-surface transition-colors">
                              <MoreHorizontal size={16} className="text-text-tertiary" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FolderOpen size={48} className="text-text-tertiary mb-4" />
              <p className="text-text-secondary mb-4">No assets found</p>
              <button className="btn-primary flex items-center gap-2 text-sm">
                <Upload size={16} />
                Upload your first asset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
