import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pin,
  Trash2,
  Edit2,
  Library,
  Flame,
  Trophy,
  Gem,
  Heart,
  Star,
  Car,
  Blocks,
  Layers,
  Sparkles,
  X,
  Lock,
  Globe2,
  Users2,
  Coins,
  Shield,
  Layers3,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import type { Collection, CollectionPrivacy } from '@collectorhub/shared-types';
import { BrandLogo } from '@/components/ui/BrandLogo.tsx';

// Placeholder stock photos from the original demo data aren't real covers.
const isStockCover = (url: string) => /images\.unsplash\.com/.test(url);

// Map of available icons for selection
const ICON_OPTIONS = [
  { name: 'Library', component: Library },
  { name: 'Car', component: Car },
  { name: 'Blocks', component: Blocks },
  { name: 'Flame', component: Flame },
  { name: 'Trophy', component: Trophy },
  { name: 'Gem', component: Gem },
  { name: 'Heart', component: Heart },
  { name: 'Star', component: Star },
  { name: 'Layers', component: Layers },
  { name: 'Coins', component: Coins },
  { name: 'Shield', component: Shield },
  { name: 'Layers3', component: Layers3 },
];

const COLOR_OPTIONS = [
  { name: 'violet', class: 'bg-violet', border: 'border-violet/30', text: 'text-violet' },
  { name: 'accent', class: 'bg-accent', border: 'border-accent/30', text: 'text-accent' },
  { name: 'cyan', class: 'bg-cyan', border: 'border-cyan/30', text: 'text-cyan' },
  { name: 'rose', class: 'bg-rose', border: 'border-rose/30', text: 'text-rose' },
  { name: 'emerald', class: 'bg-emerald', border: 'border-emerald/30', text: 'text-emerald' },
  { name: 'amber', class: 'bg-amber', border: 'border-amber/30', text: 'text-amber' },
];

const CATEGORY_PRESETS = [
  'Hot Wheels',
  'Die-cast Cars',
  'LEGO',
  'Pokémon Cards',
  'Coins & Currency',
  'Trading Cards',
  'Action Figures',
  'Custom Collection',
];

// Helper to render dynamic Lucide icon
export function DynamicIcon({ name, className, size = 20 }: { name: string; className?: string; size?: number }) {
  const IconComponent = (Icons as any)[name] || Library;
  return <IconComponent className={className} size={size} />;
}

export function CollectionsPage() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [collectibleType, setCollectibleType] = useState('Hot Wheels');
  const [coverImage, setCoverImage] = useState('');
  const [themeColor, setThemeColor] = useState('violet');
  const [selectedIcon, setSelectedIcon] = useState('Library');
  const [privacy, setPrivacy] = useState<CollectionPrivacy>('private');

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const data = await collectionsService.getCollections();
      setCollections(data);
    } catch (err) {
      console.error('Error loading collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCollection(null);
    setName('');
    setDescription('');
    setCollectibleType('Hot Wheels');
    setCoverImage('');
    setThemeColor('violet');
    setSelectedIcon('Library');
    setPrivacy('private');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, collection: Collection) => {
    e.stopPropagation();
    setEditingCollection(collection);
    setName(collection.name);
    setDescription(collection.description);
    setCollectibleType(collection.collectibleType);
    setCoverImage(collection.coverImage || '');
    setThemeColor(collection.color);
    setSelectedIcon(collection.icon);
    setPrivacy(collection.privacy);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    await collectionsService.saveCollection({
      _id: editingCollection?._id,
      name,
      slug: editingCollection?.slug || slug,
      description,
      collectibleType,
      coverImage: coverImage.trim() || null,
      color: themeColor,
      icon: selectedIcon,
      privacy,
      metadataSchema: editingCollection?.metadataSchema || [],
      tags: editingCollection?.tags || [collectibleType],
      sortOrder: editingCollection?.sortOrder || collections.length + 1,
      isPinned: editingCollection?.isPinned || false,
      isArchived: editingCollection?.isArchived || false,
    });

    await loadCollections();
    setIsModalOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this collection and all its items? This cannot be undone.')) {
      await collectionsService.deleteCollection(id);
      await loadCollections();
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, collection: Collection) => {
    e.stopPropagation();
    await collectionsService.togglePinCollection(collection._id, collection.isPinned);
    await loadCollections();
  };

  // Sort pinned first
  const sortedCollections = [...collections].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const getPrivacyIcon = (p: CollectionPrivacy) => {
    switch (p) {
      case 'public': return <Globe2 size={12} />;
      case 'friends': return <Users2 size={12} />;
      default: return <Lock size={12} />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">My Collections</h1>
          <p className="text-text-secondary mt-1">Organize and manage your Hot Wheels libraries and custom hobbies</p>
        </div>
        <Button
          variant="accent"
          leftIcon={<Plus size={18} />}
          onClick={handleOpenCreateModal}
        >
          Add Collection
        </Button>
      </div>

      {/* --- Grid Layout --- */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-bg-elevated/50 border border-border animate-pulse" />
          ))}
        </div>
      ) : sortedCollections.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-bg-elevated border border-border border-dashed p-16 text-center max-w-md mx-auto mt-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center mb-6 mx-auto">
            <Library size={32} className="text-text-muted" />
          </div>
          <h2 className="text-xl font-bold mb-2">No collections yet</h2>
          <p className="text-text-secondary text-sm mb-6">
            Create your first collection to start cataloging your items. Choose Hot Wheels or a custom category.
          </p>
          <Button variant="accent" leftIcon={<Plus size={16} />} onClick={handleOpenCreateModal} fullWidth>
            Create First Collection
          </Button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {sortedCollections.map((col) => {
              const activeColor = COLOR_OPTIONS.find(c => c.name === col.color) || COLOR_OPTIONS[0]!;
              return (
                <motion.div
                  key={col._id}
                  layoutId={col._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => navigate(`/collections/${col.slug}`)}
                  className="group relative rounded-2xl bg-bg-elevated border border-border hover:border-border-hover overflow-hidden shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col min-h-[220px]"
                >
                  {/* Pinned Icon Ribbon */}
                  {col.isPinned && (
                    <div className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-accent/20 text-accent border border-accent/20">
                      <Pin size={14} className="fill-accent" />
                    </div>
                  )}

                  {/* Cover: a custom image if the owner set one, otherwise the Hot Wheels logo tile */}
                  <div className="h-36 relative w-full overflow-hidden">
                    {col.coverImage && !isStockCover(col.coverImage) ? (
                      <>
                        <img
                          src={col.coverImage}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated to-transparent opacity-80" />
                      </>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_50%_0%,#3a0b10_0%,#16070a_55%,#0b0b0d_100%)]">
                        <BrandLogo className="w-[62%] max-w-[260px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)] group-hover:scale-[1.03] transition-transform duration-500" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col relative z-10">
                    <div className="flex items-start gap-4">
                      {/* Collection Icon */}
                      <div className={`w-12 h-12 rounded-2xl bg-bg-elevated border ${activeColor.border} flex items-center justify-center shadow-md ${activeColor.text} group-hover:scale-110 transition-transform duration-300`}>
                        <DynamicIcon name={col.icon} size={22} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate group-hover:text-accent transition-colors duration-200">{col.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                          <span className="capitalize font-medium text-text-secondary">{col.collectibleType}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {getPrivacyIcon(col.privacy)}
                            <span className="capitalize">{col.privacy}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-text-secondary mt-4 line-clamp-2 flex-1">
                      {col.description || 'No description provided.'}
                    </p>

                    {/* Stats Footer */}
                    <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-bold text-text-primary text-sm">{col.stats?.totalItems ?? 0}</span> items
                        </div>
                        {(col.stats?.wishlistCount ?? 0) > 0 && (
                          <div>
                            <span className="font-bold text-rose text-sm">{col.stats.wishlistCount}</span> wishlist
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-text-primary text-sm">
                        ${(col.stats?.totalValue ?? 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Edit/Delete Hover Controls */}
                    <div className="absolute top-4 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => { handleTogglePin(e, col); }}
                        className="p-1.5 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-muted hover:text-accent border border-border shadow-sm cursor-pointer"
                        title={col.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={12} className={col.isPinned ? 'fill-accent text-accent' : ''} />
                      </button>
                      <button
                        onClick={(e) => handleOpenEditModal(e, col)}
                        className="p-1.5 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-muted hover:text-text-primary border border-border shadow-sm cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, col._id)}
                        className="p-1.5 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-muted hover:text-error border border-border shadow-sm cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* --- Create/Edit Dialog --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="glass rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                    <Sparkles size={18} />
                  </div>
                  <h2 className="text-xl font-bold">
                    {editingCollection ? 'Edit Collection' : 'Create Collection'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
                <Input
                  label="Collection Name"
                  id="col-name"
                  placeholder="e.g. Hot Wheels Boulevard, Mainline Classics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">Collectible Type</label>
                    <select
                      value={collectibleType}
                      onChange={(e) => setCollectibleType(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl text-sm text-text-primary bg-bg-surface border border-border hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all duration-200"
                    >
                      {CATEGORY_PRESETS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">Privacy Setting</label>
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value as CollectionPrivacy)}
                      className="w-full h-11 px-4 rounded-xl text-sm text-text-primary bg-bg-surface border border-border hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all duration-200"
                    >
                      <option value="private">Private (Only Me)</option>
                      <option value="public">Public (Everyone)</option>
                      <option value="friends">Friends Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Description</label>
                  <textarea
                    placeholder="Describe what makes this collection special..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full p-4 rounded-xl text-sm text-text-primary bg-bg-surface border border-border hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all duration-200 resize-none"
                  />
                </div>

                <Input
                  label="Cover Image URL (Optional)"
                  id="col-cover"
                  placeholder="https://images.unsplash.com/..."
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                />

                {/* Theme Color Picker */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Theme Color</label>
                  <div className="flex gap-3 flex-wrap">
                    {COLOR_OPTIONS.map((col) => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => setThemeColor(col.name)}
                        className={`w-8 h-8 rounded-full ${col.class} cursor-pointer flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${themeColor === col.name ? 'ring-4 ring-offset-2 ring-offset-bg-elevated ring-accent' : ''}`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Collection Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {ICON_OPTIONS.map((ico) => {
                      const IconComp = ico.component;
                      return (
                        <button
                          key={ico.name}
                          type="button"
                          onClick={() => setSelectedIcon(ico.name)}
                          className={`h-11 rounded-xl bg-bg-surface border flex items-center justify-center cursor-pointer transition-all hover:bg-bg-hover active:scale-95 ${selectedIcon === ico.name ? 'border-accent text-accent shadow-sm' : 'border-border text-text-muted hover:text-text-primary'}`}
                          title={ico.name}
                        >
                          <IconComp size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    className="flex-1"
                  >
                    {editingCollection ? 'Save Changes' : 'Create'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
