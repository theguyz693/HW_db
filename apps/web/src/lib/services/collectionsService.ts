// ──────────────────────────────────────────────
// Collections Service — Supabase PostgreSQL & Extensible Collections
// ──────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '../supabase.ts';
import { mockDb } from '../mockDb.ts';
import type { Collection, CollectionPrivacy, MetadataFieldSchema } from '@collectorhub/shared-types';

/**
 * Transforms a Supabase collection row to the shared frontend Collection interface
 */
export function mapSupabaseCollection(row: any): Collection {
  return {
    _id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    coverImage: row.cover_image || null,
    icon: row.icon || 'Library',
    color: row.color || 'violet',
    collectibleType: row.collectible_type || 'Hot Wheels',
    metadataSchema: (row.metadata_schema as MetadataFieldSchema[]) || [],
    privacy: (row.privacy as CollectionPrivacy) || 'private',
    stats: {
      totalItems: 0,
      totalValue: 0,
      wishlistCount: 0,
      completionPercentage: 0,
    },
    sortOrder: row.sort_order || 0,
    isPinned: Boolean(row.is_pinned),
    isArchived: Boolean(row.is_archived),
    tags: row.tags || [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export const collectionsService = {
  /**
   * Get all collections for the authenticated user
   */
  async getCollections(): Promise<Collection[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch collections error, falling back to mockDb:', error);
          return mockDb.getCollections();
        }

        if (data && data.length > 0) {
          const collections = data.map(mapSupabaseCollection);
          
          // Enrich with item stats
          const { data: itemsData } = await supabase
            .from('collection_items')
            .select('collection_id, ownership');

          if (itemsData) {
            collections.forEach((col) => {
              const colItems = itemsData.filter((it: any) => it.collection_id === col._id);
              const totalItems = colItems.filter((it: any) => it.ownership?.status === 'owned').length;
              const totalValue = colItems.reduce((acc: number, it: any) => acc + (it.ownership?.estimatedValue || 0), 0);
              const wishlistCount = colItems.filter((it: any) => it.ownership?.status === 'wishlist').length;
              
              col.stats = {
                totalItems,
                totalValue,
                wishlistCount,
                completionPercentage: totalItems > 0 ? 100 : 0,
              };
            });
          }

          return collections;
        }
      } catch (err) {
        console.warn('Error reading Supabase collections:', err);
      }
    }

    return mockDb.getCollections();
  },

  /**
   * Get single collection by slug
   */
  async getCollectionBySlug(slug: string): Promise<Collection | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          return mockDb.getCollectionBySlug(slug) || null;
        }

        return mapSupabaseCollection(data);
      } catch (err) {
        console.warn('Error reading collection by slug:', err);
      }
    }

    return mockDb.getCollectionBySlug(slug) || null;
  },

  /**
   * Get single collection by ID
   */
  async getCollectionById(id: string): Promise<Collection | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          return mockDb.getCollections().find(c => c._id === id) || null;
        }

        return mapSupabaseCollection(data);
      } catch (err) {
        console.warn('Error reading collection by id:', err);
      }
    }

    return mockDb.getCollections().find(c => c._id === id) || null;
  },

  /**
   * Create or update a collection
   */
  async saveCollection(colData: Partial<Collection> & { name: string }): Promise<Collection> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

        const slug = colData.slug || colData.name?.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'collection';

        const row = {
          user_id: userId,
          name: colData.name || 'Untitled Collection',
          slug,
          description: colData.description || '',
          cover_image: colData.coverImage || null,
          icon: colData.icon || 'Library',
          color: colData.color || 'violet',
          collectible_type: colData.collectibleType || 'Hot Wheels',
          metadata_schema: colData.metadataSchema || [],
          privacy: colData.privacy || 'private',
          tags: colData.tags || [colData.collectibleType || 'Hot Wheels'],
          sort_order: colData.sortOrder ?? 0,
          is_pinned: Boolean(colData.isPinned),
          is_archived: Boolean(colData.isArchived),
          updated_at: new Date().toISOString(),
        };

        if (colData._id && !colData._id.startsWith('coll-')) {
          // Update existing Supabase row
          const { data, error } = await supabase
            .from('collections')
            .update(row)
            .eq('id', colData._id)
            .select()
            .single();

          if (error) throw error;
          return mapSupabaseCollection(data);
        } else {
          // Insert new row
          const { data, error } = await supabase
            .from('collections')
            .insert({ ...row, created_at: new Date().toISOString() })
            .select()
            .single();

          if (error) throw error;
          return mapSupabaseCollection(data);
        }
      } catch (err) {
        console.warn('Supabase saveCollection error, persisting to mockDb:', err);
      }
    }

    return mockDb.saveCollection({
      _id: colData._id,
      name: colData.name,
      slug: colData.slug || colData.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      description: colData.description || '',
      coverImage: colData.coverImage || null,
      icon: colData.icon || 'Library',
      color: colData.color || 'violet',
      collectibleType: colData.collectibleType || 'Hot Wheels',
      metadataSchema: colData.metadataSchema || [],
      privacy: colData.privacy || 'private',
      sortOrder: colData.sortOrder ?? 0,
      isPinned: Boolean(colData.isPinned),
      isArchived: Boolean(colData.isArchived),
      tags: colData.tags || ['Hot Wheels'],
    });
  },

  /**
   * Delete a collection
   */
  async deleteCollection(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase && !id.startsWith('coll-')) {
      try {
        const { error } = await supabase.from('collections').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase deleteCollection error:', err);
      }
    }

    mockDb.deleteCollection(id);
  },

  /**
   * Toggle pinned status
   */
  async togglePinCollection(id: string, isPinned: boolean): Promise<void> {
    if (isSupabaseConfigured() && supabase && !id.startsWith('coll-')) {
      try {
        await supabase
          .from('collections')
          .update({ is_pinned: !isPinned, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Error updating pin status:', err);
      }
    }

    const col = mockDb.getCollections().find(c => c._id === id);
    if (col) {
      mockDb.saveCollection({ ...col, isPinned: !isPinned });
    }
  },
};
