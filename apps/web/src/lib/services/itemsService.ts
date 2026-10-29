// ──────────────────────────────────────────────
// Items Service — Supabase PostgreSQL & Hot Wheels Item Management
// ──────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '../supabase.ts';
import { mockDb } from '../mockDb.ts';
import type { Item } from '@collectorhub/shared-types';

/**
 * Transforms a Supabase collection_items row to the shared Item model
 */
export function mapSupabaseItem(row: any): Item {
  return {
    _id: row.id,
    userId: row.user_id,
    collectionId: row.collection_id,
    name: row.name,
    brand: row.brand || '',
    series: row.series || '',
    releaseYear: row.release_year ?? null,
    modelNumber: row.model_number || '',
    collectorNumber: row.collector_number || '',
    category: row.category || '',
    description: row.description || '',
    scale: row.scale || '1:64',
    color: Array.isArray(row.color) ? row.color : [],
    material: Array.isArray(row.material) ? row.material : [],
    manufacturer: row.manufacturer || '',
    barcode: row.barcode || '',
    qrCode: row.qr_code || '',
    images: Array.isArray(row.images) ? row.images : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    customMetadata: row.custom_metadata || {},
    ownership: {
      status: row.ownership?.status || 'owned',
      condition: row.ownership?.condition || 'mint',
      duplicateCount: row.ownership?.duplicateCount ?? 1,
      acquiredDate: row.ownership?.acquiredDate || null,
      estimatedValue: row.ownership?.estimatedValue ?? 0,
      valueCurrency: row.ownership?.valueCurrency || 'USD',
      valueLastUpdated: row.ownership?.valueLastUpdated || null,
      purchase: {
        price: row.ownership?.purchase?.price ?? null,
        currency: row.ownership?.purchase?.currency || 'USD',
        date: row.ownership?.purchase?.date || null,
        seller: row.ownership?.purchase?.seller || '',
        marketplace: row.ownership?.purchase?.marketplace || '',
        receiptImage: row.ownership?.purchase?.receiptImage || null,
      },
    },
    location: {
      type: row.location?.type || 'Display Case',
      name: row.location?.name || '',
      position: row.location?.position || '',
    },
    personal: {
      notes: row.personal?.notes || '',
      isFavorite: Boolean(row.personal?.isFavorite),
      isDisplayed: Boolean(row.personal?.isDisplayed),
      isGrail: Boolean(row.personal?.isGrail),
      isHolyGrail: Boolean(row.personal?.isHolyGrail),
      isNeverSell: Boolean(row.personal?.isNeverSell),
      isPinned: Boolean(row.personal?.isPinned),
      rating: row.personal?.rating ?? null,
      categories: Array.isArray(row.personal?.categories) ? row.personal.categories : [],
    },
    timeline: {
      dateAdded: row.timeline?.dateAdded || row.created_at,
      lastViewed: row.timeline?.lastViewed || null,
      timesViewed: row.timeline?.timesViewed || 1,
      history: Array.isArray(row.timeline?.history) ? row.timeline.history : [],
    },
    dataSource: {
      provider: row.data_source?.provider || 'Manual Entry',
      sourceUrl: row.data_source?.sourceUrl || '',
      lastSynced: row.data_source?.lastSynced || null,
      confidence: row.data_source?.confidence ?? 1,
    },
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export const itemsService = {
  /**
   * Get all items belonging to a collection
   */
  async getItemsByCollectionId(collectionId: string): Promise<Item[]> {
    if (isSupabaseConfigured() && supabase && !collectionId.startsWith('coll-')) {
      try {
        const { data, error } = await supabase
          .from('collection_items')
          .select('*')
          .eq('collection_id', collectionId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch items error:', error);
          return mockDb.getItemsByCollectionId(collectionId);
        }

        if (data) {
          return data.map(mapSupabaseItem);
        }
      } catch (err) {
        console.warn('Error reading items by collectionId:', err);
      }
    }

    return mockDb.getItemsByCollectionId(collectionId);
  },

  /**
   * Get all items across all collections
   */
  async getAllItems(): Promise<Item[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('collection_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase getAllItems error:', error);
          return mockDb.getAllItems();
        }

        if (data && data.length > 0) {
          return data.map(mapSupabaseItem);
        }
      } catch (err) {
        console.warn('Error reading all items:', err);
      }
    }

    return mockDb.getAllItems();
  },

  /**
   * Get only the signed-in user's items (the garage).
   * RLS also exposes public-collection items from other users, so we scope by the
   * server-verified auth user — never by a client-supplied id.
   */
  async getMyItems(): Promise<Item[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('collection_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(mapSupabaseItem);
      }
    }

    return mockDb.getAllItems().filter((it) => !it.isArchived);
  },

  /**
   * Get a single item by id (RLS limits this to own or public items)
   */
  async getItemById(id: string): Promise<Item | null> {
    if (isSupabaseConfigured() && supabase && !id.startsWith('item-')) {
      const { data, error } = await supabase
        .from('collection_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapSupabaseItem(data) : null;
    }

    return mockDb.getAllItems().find((it) => it._id === id) ?? null;
  },

  /**
   * Save (create or update) an item
   */
  async saveItem(itemData: Partial<Item> & { name: string; collectionId: string }): Promise<Item> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

        const row = {
          user_id: userId,
          collection_id: itemData.collectionId,
          name: itemData.name || 'Untitled Collectible',
          brand: itemData.brand || '',
          series: itemData.series || '',
          release_year: itemData.releaseYear ? Number(itemData.releaseYear) : null,
          model_number: itemData.modelNumber || '',
          collector_number: itemData.collectorNumber || '',
          category: itemData.category || '',
          description: itemData.description || '',
          scale: itemData.scale || '1:64',
          color: itemData.color || [],
          material: itemData.material || [],
          manufacturer: itemData.manufacturer || itemData.brand || '',
          barcode: itemData.barcode || '',
          qr_code: itemData.qrCode || '',
          images: itemData.images || [],
          tags: itemData.tags || [],
          custom_metadata: itemData.customMetadata || {},
          ownership: itemData.ownership || {
            status: 'owned',
            condition: 'mint',
            duplicateCount: 1,
            acquiredDate: null,
            estimatedValue: 0,
            valueCurrency: 'USD',
            purchase: {
              price: null,
              currency: 'USD',
              date: null,
              seller: '',
              marketplace: '',
              receiptImage: null,
            },
          },
          location: itemData.location || {
            type: 'Display Case',
            name: '',
            position: '',
          },
          personal: itemData.personal || {
            notes: '',
            isFavorite: false,
            isGrail: false,
            rating: null,
          },
          timeline: itemData.timeline || {
            dateAdded: new Date().toISOString(),
            history: [{ action: 'Created', timestamp: new Date().toISOString(), details: {} }],
          },
          data_source: itemData.dataSource || {
            provider: 'Manual Entry',
            sourceUrl: '',
            confidence: 1,
          },
          is_archived: Boolean(itemData.isArchived),
          updated_at: new Date().toISOString(),
        };

        if (itemData._id && !itemData._id.startsWith('item-')) {
          // Update item
          const { data, error } = await supabase
            .from('collection_items')
            .update(row)
            .eq('id', itemData._id)
            .select()
            .single();

          if (error) throw error;
          return mapSupabaseItem(data);
        } else {
          // Insert item
          const { data, error } = await supabase
            .from('collection_items')
            .insert({ ...row, created_at: new Date().toISOString() })
            .select()
            .single();

          if (error) throw error;
          return mapSupabaseItem(data);
        }
      } catch (err) {
        console.warn('Supabase saveItem error, saving to mockDb:', err);
      }
    }

    return mockDb.saveItem(itemData);
  },

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase && !id.startsWith('item-')) {
      try {
        const { error } = await supabase.from('collection_items').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase deleteItem error:', err);
      }
    }

    mockDb.deleteItem(id);
  },

  /**
   * Toggle favorite flag
   */
  async toggleFavorite(item: Item): Promise<Item> {
    const updatedFavorite = !item.personal.isFavorite;
    const updatedPersonal = { ...item.personal, isFavorite: updatedFavorite };

    if (isSupabaseConfigured() && supabase && !item._id.startsWith('item-')) {
      try {
        const { data, error } = await supabase
          .from('collection_items')
          .update({
            personal: updatedPersonal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item._id)
          .select()
          .single();

        if (!error && data) {
          return mapSupabaseItem(data);
        }
      } catch (err) {
        console.warn('Supabase toggleFavorite error:', err);
      }
    }

    return mockDb.toggleItemFavorite(item._id);
  },
};
