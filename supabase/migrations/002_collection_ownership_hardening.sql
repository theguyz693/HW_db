-- ==============================================================================
-- 002 — Ownership hardening for collection items (My Garage / Scan to Collect)
--
-- 1. user_id is always the authenticated user: defaulted AND forced by trigger,
--    so a client-supplied user_id is never trusted.
-- 2. Items may only be inserted/moved into collections the user owns
--    (001 only checked user_id, not the target collection).
-- 3. Basic server-side shape validation on fields Scan to Collect writes.
--    Constraints are NOT VALID so pre-existing rows don't block the migration;
--    they apply to every new insert/update.
-- ==============================================================================

ALTER TABLE public.collection_items ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.collections ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.force_owner_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Service-role / SQL-editor writes (no JWT) keep their explicit value.
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collection_items_owner ON public.collection_items;
CREATE TRIGGER trg_collection_items_owner
  BEFORE INSERT OR UPDATE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.force_owner_user_id();

DROP TRIGGER IF EXISTS trg_collections_owner ON public.collections;
CREATE TRIGGER trg_collections_owner
  BEFORE INSERT OR UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.force_owner_user_id();

-- Target collection must belong to the same user.
DROP POLICY IF EXISTS "Users can insert own items" ON public.collection_items;
CREATE POLICY "Users can insert own items"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own items" ON public.collection_items;
CREATE POLICY "Users can update own items"
  ON public.collection_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid())
  );

-- Shape validation
ALTER TABLE public.collection_items
  ADD CONSTRAINT items_name_len CHECK (char_length(name) BETWEEN 1 AND 200) NOT VALID,
  ADD CONSTRAINT items_model_number_len CHECK (char_length(model_number) <= 20) NOT VALID,
  ADD CONSTRAINT items_barcode_format CHECK (barcode = '' OR barcode ~ '^[0-9]{6,14}$') NOT VALID,
  ADD CONSTRAINT items_release_year_range CHECK (release_year IS NULL OR release_year BETWEEN 1960 AND 2100) NOT VALID,
  ADD CONSTRAINT items_images_is_array CHECK (jsonb_typeof(images) = 'array') NOT VALID,
  ADD CONSTRAINT items_duplicate_count CHECK (
    ownership->>'duplicateCount' IS NULL OR (ownership->>'duplicateCount')::int BETWEEN 1 AND 9999
  ) NOT VALID;

-- Fast duplicate lookups for Scan to Collect
CREATE INDEX IF NOT EXISTS idx_items_user_model ON public.collection_items(user_id, model_number);
