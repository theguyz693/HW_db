-- ==============================================================================
-- COLLECTORHUB — SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- Supports Hot Wheels as initial primary collection type, with generic
-- extensible architecture for Pokémon cards, Coins, LEGO, and custom hobbies.
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked directly to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  preferences JSONB DEFAULT '{"theme": "dark", "defaultView": "gallery", "language": "en"}'::jsonb,
  privacy JSONB DEFAULT '{"profilePublic": true, "collectionsPublicByDefault": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. COLLECTIONS TABLE
-- Represents a user's collection container (Hot Wheels, Pokémon, Coins, etc.)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_image TEXT,
  icon TEXT DEFAULT 'Library',
  color TEXT DEFAULT 'violet',
  collectible_type TEXT DEFAULT 'hot_wheels' NOT NULL, -- e.g. 'hot_wheels', 'pokemon', 'coins', 'lego', 'custom'
  metadata_schema JSONB DEFAULT '[]'::jsonb,          -- Custom field definitions for this collection
  privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'public', 'friends')),
  tags TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for user collections lookup & slug lookups
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_collections_type ON public.collections(collectible_type);

-- ------------------------------------------------------------------------------
-- 3. COLLECTION ITEMS TABLE
-- Core generic item model + JSONB metadata for type-specific extensions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  
  -- Core Identity
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  series TEXT DEFAULT '',
  release_year INT,
  model_number TEXT DEFAULT '',
  collector_number TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  
  -- Physical Attributes
  scale TEXT DEFAULT '1:64',
  color TEXT[] DEFAULT '{}',
  material TEXT[] DEFAULT '{}',
  manufacturer TEXT DEFAULT '',
  
  -- Barcode / Identification (Future scanning / lookup support)
  barcode TEXT DEFAULT '',
  qr_code TEXT DEFAULT '',
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb, -- Array of { url, thumbnail, caption, isPrimary, uploadedAt }
  tags TEXT[] DEFAULT '{}',
  
  -- Type-specific custom metadata (e.g. Hot Wheels Boulevard Number, Wheel Type, etc.)
  custom_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ownership & Valuation
  ownership JSONB DEFAULT '{
    "status": "owned",
    "condition": "mint",
    "duplicateCount": 1,
    "acquiredDate": null,
    "estimatedValue": 0,
    "valueCurrency": "USD",
    "purchase": {
      "price": null,
      "currency": "USD",
      "date": null,
      "seller": "",
      "marketplace": "",
      "receiptImage": null
    }
  }'::jsonb,
  
  -- Physical Storage Location
  location JSONB DEFAULT '{"type": "Display Case", "name": "", "position": ""}'::jsonb,
  
  -- Personal Collector Flags
  personal JSONB DEFAULT '{"notes": "", "isFavorite": false, "isGrail": false, "rating": null}'::jsonb,
  
  -- Timeline / Audit
  timeline JSONB DEFAULT '{"dateAdded": null, "history": []}'::jsonb,
  
  -- Data source (e.g. Enrichment / Manual / Barcode Lookup)
  data_source JSONB DEFAULT '{"provider": "Manual Entry", "sourceUrl": "", "confidence": 1}'::jsonb,
  
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for efficient queries and filtering
CREATE INDEX IF NOT EXISTS idx_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.collection_items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON public.collection_items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_brand ON public.collection_items(brand);
CREATE INDEX IF NOT EXISTS idx_items_series ON public.collection_items(series);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.collection_items(created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Complete multi-tenant isolation so users only access their own data
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view public or own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR (privacy->>'profilePublic')::boolean = true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Collections Policies
CREATE POLICY "Users can view own collections or public collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id OR privacy = 'public');

CREATE POLICY "Users can insert own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- Collection Items Policies
CREATE POLICY "Users can view own items or public collection items"
  ON public.collection_items FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.collections c 
      WHERE c.id = collection_items.collection_id AND c.privacy = 'public'
    )
  );

CREATE POLICY "Users can insert own items"
  ON public.collection_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON public.collection_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON public.collection_items FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. SUPABASE STORAGE BUCKET FOR ITEM IMAGES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public item image access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own item images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own item images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);
