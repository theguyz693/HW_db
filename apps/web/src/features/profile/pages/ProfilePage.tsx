import { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Trophy,
  Award,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { mockDb, type Achievement, getAchievements } from '@/lib/mockDb.ts';
import { authService } from '@/lib/services/authService.ts';
import { itemsService } from '@/lib/services/itemsService.ts';
import { collectionsService } from '@/lib/services/collectionsService.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { formatCurrency } from '@collectorhub/utilities';
import type { Item, User as UserProfile } from '@collectorhub/shared-types';

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [totalCollectionsCount, setTotalCollectionsCount] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allItems, allCols] = await Promise.all([
        itemsService.getAllItems(),
        collectionsService.getCollections(),
      ]);
      setItems(allItems);
      setTotalCollectionsCount(allCols.length);
      setAchievements(getAchievements(allItems));

      const user = mockDb.getUser();
      if (user) {
        setProfile(user);
        setDisplayName(user.displayName);
        setBio(user.bio);
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    const updated = await authService.updateProfile({
      displayName,
      bio,
    });
    if (updated) {
      setProfile(updated);
    }
    setIsEditing(false);
  };

  if (!profile) return null;

  const totalValue = items.reduce((acc, it) => acc + (it.ownership?.estimatedValue ?? 0), 0);
  const totalItems = items.filter(it => it.ownership?.status === 'owned').length;
  const unlockedCount = achievements.filter(a => a.unlockedAt !== null).length;

  const rarityColorMap: Record<string, string> = {
    Common: 'bg-text-secondary/10 text-text-secondary border-text-secondary/20',
    Rare: 'bg-cyan/10 text-cyan border-cyan/20',
    Epic: 'bg-violet/10 text-violet border-violet/20',
    Legendary: 'bg-amber/10 text-amber border-amber/20 shadow-glow',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Profile Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-bg-elevated to-bg-secondary border border-border p-6 lg:p-8 overflow-hidden shadow-sm">
        {/* Background blobs */}
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet/5 rounded-full blur-3xl" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-violet flex items-center justify-center text-white text-3xl font-black shadow-lg relative border border-border">
            {profile.displayName[0]?.toUpperCase()}
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-bg-surface border border-border text-accent shadow-md">
              <Award size={14} className="fill-accent/10" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            {!isEditing ? (
              <>
                <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                <p className="text-xs text-text-muted">@{profile.username}</p>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xl">{profile.bio || 'Add a bio to show off your collecting goals!'}</p>
                
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-2 text-xs text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Active Collector</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSave} className="space-y-3 max-w-md">
                <Input
                  label="Display Name"
                  id="profile-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" size="sm">
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-border/60">
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40 text-center sm:text-left">
            <p className="text-xs text-text-muted">Collections</p>
            <p className="text-xl font-bold mt-0.5">{totalCollectionsCount}</p>
          </div>
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40 text-center sm:text-left">
            <p className="text-xs text-text-muted">Owned Items</p>
            <p className="text-xl font-bold mt-0.5 text-accent">{totalItems}</p>
          </div>
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40 text-center sm:text-left">
            <p className="text-xs text-text-muted">Portfolio Value</p>
            <p className="text-xl font-bold mt-0.5 text-emerald">{formatCurrency(totalValue)}</p>
          </div>
          <div className="p-3 bg-bg-surface/30 rounded-2xl border border-border/40 text-center sm:text-left">
            <p className="text-xs text-text-muted">Achievements</p>
            <p className="text-xl font-bold mt-0.5 text-amber">{unlockedCount}/{achievements.length}</p>
          </div>
        </div>
      </div>

      {/* Collector Achievements Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Collector Badges & Milestones</h2>
            <p className="text-xs text-text-secondary mt-0.5">Automated achievements calculated from your collections</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
            {unlockedCount} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {achievements.map((ach) => {
            const isUnlocked = ach.unlockedAt !== null;
            const IconComponent = (Icons as any)[ach.icon] || Trophy;

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${isUnlocked ? 'bg-bg-elevated border-border shadow-sm' : 'bg-bg-elevated/40 border-border/40 opacity-60'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${isUnlocked ? 'bg-accent/10 border-accent/30 text-accent shadow-sm' : 'bg-bg-surface border-border text-text-muted'}`}>
                    <IconComponent size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-bold truncate text-text-primary">{ach.title}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize ${rarityColorMap[ach.rarity] || ''}`}>
                        {ach.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{ach.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px]">
                  <span className="text-text-muted">
                    {isUnlocked ? `Unlocked ${new Date(ach.unlockedAt!).toLocaleDateString()}` : 'Locked'}
                  </span>
                  {isUnlocked ? (
                    <span className="text-emerald font-bold flex items-center gap-1">
                      <Sparkles size={10} /> Completed
                    </span>
                  ) : (
                    <span className="text-text-muted">In Progress</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
