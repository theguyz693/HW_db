// ──────────────────────────────────────────────
// Storage Service — Image Upload & Asset Management
// ──────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '../supabase.ts';

export interface UploadResult {
  url: string;
  thumbnail: string;
  path: string;
}

export const storageService = {
  /**
   * Upload an item image file to Supabase Storage bucket 'item-images'
   * or generate a local base64/data-URL if Supabase is offline/demo mode.
   */
  async uploadItemImage(file: File, userId = 'default-user'): Promise<UploadResult> {
    if (isSupabaseConfigured() && supabase) {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.warn('Supabase storage upload error, falling back to local object URL:', error);
        // Fallback if bucket doesn't exist yet
        return this.readFileAsDataUrl(file);
      }

      const { data: publicUrlData } = supabase.storage
        .from('item-images')
        .getPublicUrl(data.path);

      return {
        url: publicUrlData.publicUrl,
        thumbnail: publicUrlData.publicUrl,
        path: data.path,
      };
    }

    // Offline / Local Demo mode: read as Data URL
    return this.readFileAsDataUrl(file);
  },

  /**
   * Read file as data URL for local display / offline demo
   */
  readFileAsDataUrl(file: File): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          url: result,
          thumbnail: result,
          path: `local/${file.name}`,
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },
};
