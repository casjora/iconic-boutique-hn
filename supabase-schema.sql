-- =========================================================
-- SECURED SUPABASE SQL MIGRATION FOR ICONIC BOUTIQUE HN
-- Role-based access control, public curation, and dynamic cost protection
-- =========================================================

-- 1. Check & Rename Table 'products' to 'products_raw'
DO $$
BEGIN
  -- If table public.products exists and is a physical table (not a view), rename it to products_raw
  IF EXISTS (
    SELECT 1 
    FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' 
      AND c.relname = 'products' 
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.products RENAME TO products_raw;
  END IF;
END $$;

-- 2. Add columns to products_raw if they don't exist
ALTER TABLE public.products_raw 
ADD COLUMN IF NOT EXISTS featured_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS public_discount NUMERIC DEFAULT 0;

-- Index for fast public catalog queries
CREATE INDEX IF NOT EXISTS idx_products_featured_public ON public.products_raw (featured_public);

-- 3. Ensure profiles and orders tables have proper role constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('detalle', 'mayorista', 'vendedor', 'owner', 'dueño', 'usuario', 'cliente'));

-- Allow new roles in orders table if constraint exists
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_role_used_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_role_used_check 
CHECK (role_used IN ('usuario', 'vendedor', 'dueño', 'owner', 'publico', 'detalle', 'mayorista'));

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch the current user's role securely
-- Checks public.profiles table, auth.users raw_user_meta_data, and JWT session metadata
-- Runs with SECURITY DEFINER privileges to prevent infinite RLS recursion and guarantee role lookup
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $func$
DECLARE
  v_uid UUID;
  v_profile_role TEXT := '';
  v_auth_role TEXT := '';
  v_jwt_role TEXT := '';
  v_jwt_json JSONB;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN 'publico';
  END IF;

  -- 1. Consult JWT metadata directly (fastest, zero DB queries, safe for PostgREST)
  BEGIN
    v_jwt_json := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
    IF v_jwt_json IS NULL THEN
      v_jwt_json := auth.jwt();
    END IF;
    IF v_jwt_json IS NOT NULL THEN
      v_jwt_role := lower(trim(coalesce(
        v_jwt_json -> 'user_metadata' ->> 'role',
        v_jwt_json -> 'app_metadata' ->> 'role',
        v_jwt_json ->> 'role',
        ''
      )));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := '';
  END;

  IF v_jwt_role IN ('dueño', 'owner', 'vendedor') THEN
    RETURN v_jwt_role;
  END IF;

  -- 2. Consult auth.users raw_user_meta_data directly (SECURITY DEFINER allows reading auth.users safely)
  BEGIN
    SELECT lower(trim(coalesce(raw_user_meta_data->>'role', ''))) INTO v_auth_role FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN
    v_auth_role := '';
  END;

  IF v_auth_role IN ('dueño', 'owner', 'vendedor') THEN
    RETURN v_auth_role;
  END IF;

  -- 3. Consult public.profiles directly
  BEGIN
    SELECT lower(trim(coalesce(role, ''))) INTO v_profile_role FROM public.profiles WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN
    v_profile_role := '';
  END;

  IF v_profile_role IN ('dueño', 'owner', 'vendedor') THEN
    RETURN v_profile_role;
  END IF;

  -- Non-privileged specific roles (mayorista, detalle, etc.)
  IF v_jwt_role NOT IN ('', 'publico', 'usuario') THEN
    RETURN v_jwt_role;
  ELSIF v_auth_role NOT IN ('', 'publico', 'usuario') THEN
    RETURN v_auth_role;
  ELSIF v_profile_role NOT IN ('', 'publico', 'usuario') THEN
    RETURN v_profile_role;
  END IF;

  RETURN coalesce(nullif(v_jwt_role, ''), nullif(v_auth_role, ''), nullif(v_profile_role, ''), 'publico');
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Profiles RLS policies: Hardened against PII leakage
DROP POLICY IF EXISTS "Public profiles reading" ON public.profiles;
CREATE POLICY "Public profiles reading" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR
  public.get_my_role() IN ('dueño', 'owner', 'vendedor')
);

DROP POLICY IF EXISTS "Sellers and Owners can insert profiles" ON public.profiles;
CREATE POLICY "Sellers and Owners can insert profiles" ON public.profiles FOR INSERT WITH CHECK (
  auth.uid() = id OR
  public.get_my_role() IN ('dueño', 'owner', 'vendedor')
);

DROP POLICY IF EXISTS "Users can update own profile or owner can update" ON public.profiles;
CREATE POLICY "Users can update own profile or owner can update" ON public.profiles FOR UPDATE USING (
  auth.uid() = id OR 
  public.get_my_role() IN ('dueño', 'owner', 'vendedor')
);

-- =========================================================
-- 4. Products View (Secure Catalog Interface)
-- =========================================================

-- Re-create products as a view that dynamically hides 'cost' column from non-admins.
-- Note: We intentionally DO NOT use WITH (security_invoker = true) here because
-- the underlying table public.products_raw is strictly isolated (REVOKE ALL on raw table).
-- The view acts as a secure, controlled Security Definer boundary, carrying out row-level
-- filtering (featured_public) and column-level masking (cost) on behalf of public users.
CREATE OR REPLACE VIEW public.products AS
SELECT
  id,
  name,
  brand,
  size,
  CASE
    WHEN public.get_my_role() IN ('dueño', 'owner', 'vendedor') THEN cost
    ELSE 0
  END AS cost,
  price_public,
  price_promotional,
  stock,
  category,
  barcode,
  description,
  image_url,
  created_at,
  featured_public,
  public_discount
FROM public.products_raw
WHERE
  (public.get_my_role() IN ('dueño', 'owner', 'vendedor'))
  OR
  (featured_public = true);

-- Revoke all table-level access to the raw table from public roles
REVOKE ALL ON public.products_raw FROM anon, authenticated, public;

-- Grant access on products view
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated, service_role;

-- INSTEAD OF trigger to make the products view fully updatable securely
CREATE OR REPLACE FUNCTION public.products_view_dml()
RETURNS TRIGGER AS $func$
DECLARE
  v_role TEXT;
  v_jwt_json JSONB;
BEGIN
  v_role := COALESCE(public.get_my_role(), '');

  -- Fallback JWT claim check if get_my_role didn't detect seller/owner
  IF v_role NOT IN ('dueño', 'owner', 'vendedor') THEN
    BEGIN
      v_jwt_json := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
      IF v_jwt_json IS NOT NULL THEN
        IF lower(trim(coalesce(v_jwt_json -> 'user_metadata' ->> 'role', v_jwt_json -> 'app_metadata' ->> 'role', ''))) IN ('dueño', 'owner', 'vendedor') THEN
          v_role := lower(trim(coalesce(v_jwt_json -> 'user_metadata' ->> 'role', v_jwt_json -> 'app_metadata' ->> 'role', '')));
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Security check: only users with proper administrative roles can insert, update or delete products
  IF v_role NOT IN ('dueño', 'owner', 'vendedor') THEN
    RAISE EXCEPTION 'Acceso denegado: No tienes permisos para modificar productos. (Rol detectado: %)', v_role;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_role IN ('dueño', 'owner') THEN
      INSERT INTO public.products_raw (
        id, name, brand, size, cost, price_public, price_promotional, stock, category, barcode, description, image_url, created_at, featured_public, public_discount
      ) VALUES (
        COALESCE(NEW.id, 'prod_' || gen_random_uuid()),
        COALESCE(NEW.name, 'Perfume Desconocido'),
        COALESCE(NEW.brand, 'Marca Desconocida'),
        COALESCE(NEW.size, '100 ml'),
        COALESCE(NEW.cost, 0),
        COALESCE(NEW.price_public, 0),
        COALESCE(NEW.price_promotional, 0),
        COALESCE(NEW.stock, 0),
        COALESCE(NEW.category, 'Femenino'),
        NEW.barcode,
        NEW.description,
        NEW.image_url,
        COALESCE(NEW.created_at, now()),
        COALESCE(NEW.featured_public, true),
        COALESCE(NEW.public_discount, 0)
      )
      RETURNING * INTO NEW;
      RETURN NEW;
    ELSE
      -- Vendedor adding a product: set cost default 0
      INSERT INTO public.products_raw (
        id, name, brand, size, cost, price_public, price_promotional, stock, category, barcode, description, image_url, created_at, featured_public, public_discount
      ) VALUES (
        COALESCE(NEW.id, 'prod_' || gen_random_uuid()),
        COALESCE(NEW.name, 'Perfume Desconocido'),
        COALESCE(NEW.brand, 'Marca Desconocida'),
        COALESCE(NEW.size, '100 ml'),
        0,
        COALESCE(NEW.price_public, 0),
        COALESCE(NEW.price_promotional, 0),
        COALESCE(NEW.stock, 0),
        COALESCE(NEW.category, 'Femenino'),
        NEW.barcode,
        NEW.description,
        NEW.image_url,
        COALESCE(NEW.created_at, now()),
        COALESCE(NEW.featured_public, true),
        COALESCE(NEW.public_discount, 0)
      )
      RETURNING * INTO NEW;
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_role IN ('dueño', 'owner') THEN
      UPDATE public.products_raw SET
        name = COALESCE(NEW.name, OLD.name),
        brand = COALESCE(NEW.brand, OLD.brand),
        size = COALESCE(NEW.size, OLD.size),
        cost = COALESCE(NEW.cost, OLD.cost),
        price_public = COALESCE(NEW.price_public, OLD.price_public),
        price_promotional = COALESCE(NEW.price_promotional, OLD.price_promotional),
        stock = COALESCE(NEW.stock, OLD.stock),
        category = COALESCE(NEW.category, OLD.category),
        barcode = COALESCE(NEW.barcode, OLD.barcode),
        description = COALESCE(NEW.description, OLD.description),
        image_url = COALESCE(NEW.image_url, OLD.image_url),
        featured_public = COALESCE(NEW.featured_public, OLD.featured_public),
        public_discount = COALESCE(NEW.public_discount, OLD.public_discount)
      WHERE id = OLD.id
      RETURNING * INTO NEW;
      RETURN NEW;
    ELSE
      -- Vendedor updating: preserve existing cost, allow updating prices and all product details
      UPDATE public.products_raw SET
        name = COALESCE(NEW.name, OLD.name),
        brand = COALESCE(NEW.brand, OLD.brand),
        size = COALESCE(NEW.size, OLD.size),
        cost = OLD.cost,
        price_public = COALESCE(NEW.price_public, OLD.price_public),
        price_promotional = COALESCE(NEW.price_promotional, OLD.price_promotional),
        stock = COALESCE(NEW.stock, OLD.stock),
        category = COALESCE(NEW.category, OLD.category),
        barcode = COALESCE(NEW.barcode, OLD.barcode),
        description = COALESCE(NEW.description, OLD.description),
        image_url = COALESCE(NEW.image_url, OLD.image_url),
        featured_public = COALESCE(NEW.featured_public, OLD.featured_public),
        public_discount = COALESCE(NEW.public_discount, OLD.public_discount)
      WHERE id = OLD.id
      RETURNING * INTO NEW;
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.products_raw WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS products_view_dml_trigger ON public.products;
CREATE TRIGGER products_view_dml_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE PROCEDURE public.products_view_dml();

-- Enable RLS on products_raw
ALTER TABLE public.products_raw ENABLE ROW LEVEL SECURITY;

-- Robust products_raw policies
DROP POLICY IF EXISTS "Anyone can read products_raw" ON public.products_raw;
DROP POLICY IF EXISTS "Anyone can read featured products" ON public.products_raw;
CREATE POLICY "Anyone can read featured products" ON public.products_raw
  FOR SELECT USING (
    (featured_public = true) OR
    (public.get_my_role() IN ('dueño', 'owner', 'vendedor'))
  );

DROP POLICY IF EXISTS "Sellers and Owners can modify products_raw" ON public.products_raw;
CREATE POLICY "Sellers and Owners can modify products_raw" ON public.products_raw
  FOR ALL USING (
    public.get_my_role() IN ('dueño', 'owner', 'vendedor')
  );

-- 5. Trigger function for profile role updates
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER AS $func$
DECLARE
  caller_role TEXT;
BEGIN
  -- Check if the role field is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow if update is done from Supabase Dashboard / SQL Editor / Service Role
    IF auth.uid() IS NULL OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Get caller's role
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

    -- If caller is not owner/dueño and not vendedor, deny immediately
    IF COALESCE(caller_role, '') NOT IN ('dueño', 'owner', 'vendedor') THEN
      RAISE EXCEPTION 'Acceso denegado: No tienes permisos para modificar roles.';
    END IF;

    -- If caller is vendedor
    IF caller_role = 'vendedor' THEN
      -- Cannot modify their own role
      IF auth.uid() = OLD.id THEN
        RAISE EXCEPTION 'Acceso denegado: Los vendedores no pueden cambiar su propio rol.';
      END IF;

      -- Cannot modify role of an owner/dueño or another vendedor
      IF OLD.role IN ('dueño', 'owner', 'vendedor') THEN
        RAISE EXCEPTION 'Acceso denegado: Los vendedores no pueden modificar el rol de un vendedor o dueño.';
      END IF;

      -- Cannot set new role to owner/dueño or vendedor
      IF NEW.role IN ('dueño', 'owner', 'vendedor') THEN
        RAISE EXCEPTION 'Acceso denegado: Los vendedores no pueden asignar roles de vendedor o dueño.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_profile_role_update ON public.profiles;
CREATE TRIGGER tr_check_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.check_profile_role_update();

-- Auto-sync profile role changes back to auth.users raw_user_meta_data
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_users()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE auth.users
    SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS tr_sync_profile_role_to_auth_users ON public.profiles;
CREATE TRIGGER tr_sync_profile_role_to_auth_users
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_role_to_auth_users();

-- Auto-sync auth.users raw_user_meta_data changes to public.profiles
CREATE OR REPLACE FUNCTION public.sync_auth_user_metadata_to_profiles()
RETURNS TRIGGER AS $func$
BEGIN
  IF (NEW.raw_user_meta_data->>'role') IS DISTINCT FROM (OLD.raw_user_meta_data->>'role') AND (NEW.raw_user_meta_data->>'role') IS NOT NULL THEN
    UPDATE public.profiles
    SET role = NEW.raw_user_meta_data->>'role'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS tr_sync_auth_user_metadata_to_profiles ON auth.users;
CREATE TRIGGER tr_sync_auth_user_metadata_to_profiles
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_auth_user_metadata_to_profiles();

-- 6. Trigger to sync newly registered users to profiles with default role 'detalle'
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $func$
BEGIN
  INSERT INTO public.profiles (id, name, role, phone, address)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Cliente'),
    COALESCE(new.raw_user_meta_data->>'role', 'detalle'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address'
  )
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name,
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      address = COALESCE(EXCLUDED.address, profiles.address);
  RETURN new;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 7. Orders & Order Items RLS Policies (Secured)
-- ==========================================

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Select policy: Admins/sellers can read all orders, clients can only read their own
DROP POLICY IF EXISTS "Sellers and Owners can select all orders" ON public.orders;
CREATE POLICY "Sellers and Owners can select all orders" ON public.orders FOR SELECT USING (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor') OR 
  (auth.uid() IS NOT NULL AND auth.uid() = buyer_id)
);

-- Insert policy: Anyone can insert, but if buyer_id is provided it must match their session
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (
  (buyer_id IS NULL) OR 
  (auth.uid() = buyer_id) OR 
  (public.get_my_role() IN ('dueño', 'owner', 'vendedor'))
);

-- Update policy: Sellers and Owners can update any order, users can update their own if it's pending
DROP POLICY IF EXISTS "Sellers and Owners can update orders" ON public.orders;
CREATE POLICY "Sellers and Owners can update orders" ON public.orders FOR UPDATE USING (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor') OR 
  (auth.uid() IS NOT NULL AND auth.uid() = buyer_id)
);

-- Delete policy: Sellers and Owners can delete orders
DROP POLICY IF EXISTS "Sellers and Owners can delete orders" ON public.orders;
CREATE POLICY "Sellers and Owners can delete orders" ON public.orders FOR DELETE USING (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor')
);

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Select policy: Sellers and Owners can view all, clients can view their own
DROP POLICY IF EXISTS "Sellers and Owners can view all order_items" ON public.order_items;
CREATE POLICY "Sellers and Owners can view all order_items" ON public.order_items FOR SELECT USING (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor') OR 
  auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id)
);

-- Insert policy: Sellers/owners can insert, clients can insert for their own orders
DROP POLICY IF EXISTS "Users can insert order_items for their orders" ON public.order_items;
CREATE POLICY "Users can insert order_items for their orders" ON public.order_items FOR INSERT WITH CHECK (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor') OR 
  (SELECT buyer_id FROM public.orders WHERE id = order_id) IS NULL OR
  auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id)
);

-- Update policy: Sellers/owners can update, clients can update for their own orders
DROP POLICY IF EXISTS "Users can update order_items for their orders" ON public.order_items;
CREATE POLICY "Users can update order_items for their orders" ON public.order_items FOR UPDATE USING (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor') OR 
  auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id)
);

-- Delete policy: Sellers/owners can delete, clients can delete for their own orders
DROP POLICY IF EXISTS "Users can delete order_items for their orders" ON public.order_items;
CREATE POLICY "Users can delete order_items for their orders" ON public.order_items FOR DELETE USING (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor') OR 
  auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id)
);

-- ==========================================
-- 8. Favorites RLS Policies (New & Secured)
-- ==========================================

-- Enable RLS on favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (
  auth.uid() = user_id OR
  public.get_my_role() IN ('dueño', 'owner', 'vendedor')
);

DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (
  auth.uid() = user_id
);

-- ==========================================
-- 9. Telegram Integration RLS Policies (New & Secured)
-- ==========================================

-- Enable RLS on telegram config table
ALTER TABLE public.telegram ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage telegram config" ON public.telegram;
CREATE POLICY "Admins can manage telegram config" ON public.telegram FOR ALL USING (
  public.get_my_role() IN ('dueño', 'owner', 'vendedor')
);

-- =========================================================
-- 10. Robust Order & Stock Integrity Trigger
-- =========================================================

-- Helper function to parse and apply promotional value (percent or fixed amount) to a base price.
-- This function mathematically mirrors the JavaScript frontend 'parsePromoValue' logic to the single digit.
CREATE OR REPLACE FUNCTION public.apply_promo_value(promo_str TEXT, base_price NUMERIC)
RETURNS NUMERIC AS $func$
DECLARE
  clean_val TEXT;
  num_val NUMERIC;
BEGIN
  IF promo_str IS NULL OR trim(promo_str) = '' THEN
    RETURN base_price;
  END IF;

  clean_val := trim(promo_str);
  
  -- If it contains '%'
  IF clean_val LIKE '%%' THEN
    -- Percentage discount
    num_val := COALESCE(nullif(regexp_replace(clean_val, '[^0-9.]', '', 'g'), '')::NUMERIC, 0);
    RETURN GREATEST(0, round(base_price * (1.0 - num_val / 100.0)));
  ELSE
    -- Fixed amount discount
    num_val := COALESCE(nullif(regexp_replace(clean_val, '[^0-9.]', '', 'g'), '')::NUMERIC, 0);
    RETURN GREATEST(0, round(base_price - num_val));
  END IF;
END;
$func$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Computes the correct catalog price of a product for a given user role.
CREATE OR REPLACE FUNCTION public.get_expected_product_price(
  p_price_public NUMERIC,
  p_description TEXT,
  p_role TEXT
)
RETURNS NUMERIC AS $func$
DECLARE
  base_wholesale NUMERIC;
  promo_detalle_str TEXT;
  promo_mayorista_str TEXT;
  final_detalle NUMERIC;
  final_wholesale NUMERIC;
  resolved_role TEXT;
BEGIN
  -- 1. Detalle (Retail) Promo calculation
  promo_detalle_str := substring(p_description from '\[PROMO_DETALLE:([^\]]+)\]');
  IF promo_detalle_str IS NULL THEN
    -- Fallback to legacy PROMO
    IF substring(p_description from '\[PROMO:(\d+)\]') IS NOT NULL THEN
      promo_detalle_str := substring(p_description from '\[PROMO:(\d+)\]') || '%';
    END IF;
  END IF;
  
  final_detalle := public.apply_promo_value(promo_detalle_str, p_price_public);

  -- 2. Mayorista (Wholesale) calculation
  base_wholesale := round(p_price_public * 0.75);
  promo_mayorista_str := substring(p_description from '\[PROMO_MAYORISTA:([^\]]+)\]');
  
  final_wholesale := public.apply_promo_value(promo_mayorista_str, base_wholesale);

  -- 3. Resolve role (normalize)
  resolved_role := lower(coalesce(p_role, 'publico'));

  IF resolved_role IN ('mayorista', 'vendedor', 'owner', 'dueño') THEN
    RETURN final_wholesale;
  ELSE
    RETURN final_detalle;
  END IF;
END;
$func$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_order_item_integrity()
RETURNS TRIGGER AS $func$
DECLARE
  p_stock INT;
  p_featured BOOLEAN;
  p_name TEXT;
  p_price_public NUMERIC;
  p_description TEXT;
  p_cost NUMERIC;
  p_wholesale_price NUMERIC;
  caller_role TEXT;
  o_role_used TEXT;
  expected_price NUMERIC;
BEGIN
  -- 1. Get product details from raw products table to ensure we bypass any views
  SELECT stock, featured_public, name, price_public, description, cost
  INTO p_stock, p_featured, p_name, p_price_public, p_description, p_cost
  FROM public.products_raw
  WHERE id = NEW.product_id;

  -- If product does not exist, block the insert
  IF p_name IS NULL THEN
    RAISE EXCEPTION 'El producto con ID % no existe.', NEW.product_id;
  END IF;

  -- 2. Fetch the caller's role securely
  caller_role := public.get_my_role();

  -- 3. Fetch the parent order's role_used
  SELECT role_used INTO o_role_used FROM public.orders WHERE id = NEW.order_id;
  o_role_used := lower(coalesce(o_role_used, 'detalle'));

  -- Calculate official wholesale price limit
  p_wholesale_price := public.get_expected_product_price(p_price_public, p_description, 'mayorista');

  -- 4. Security Validation (Applies to everyone including sellers/owners):
  -- Clientes detalle no pueden tener un cambio en el precio que sea menor al precio de mayoreo.
  -- Clientes de mayoreo no pueden tener un cambio en el precio que sea menor al costo.
  IF o_role_used = 'mayorista' THEN
    IF NEW.price_paid < p_cost THEN
      RAISE EXCEPTION 'Acceso denegado: El precio de mayoreo para "%" (L. %) no puede ser inferior al costo del producto (L. %).', p_name, NEW.price_paid, p_cost;
    END IF;
  ELSE
    -- Detalle / publico / usuario / etc.
    IF NEW.price_paid < p_wholesale_price THEN
      RAISE EXCEPTION 'Acceso denegado: El precio de detalle para "%" (L. %) no puede ser inferior al precio de mayoreo (L. %).', p_name, NEW.price_paid, p_wholesale_price;
    END IF;
  END IF;

  -- 5. If NOT an admin/seller, perform strict validations
  IF COALESCE(caller_role, '') NOT IN ('dueño', 'owner', 'vendedor') THEN
    -- Check if product is published
    IF NOT COALESCE(p_featured, true) THEN
      RAISE EXCEPTION 'El producto "%" no está disponible para la venta al público.', p_name;
    END IF;

    -- Check if there is enough stock
    IF p_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Lo sentimos, el producto "%" no tiene suficientes existencias (Disponibles: %, Solicitadas: %).', p_name, p_stock, NEW.quantity;
    END IF;

    -- Prevent adding items with a zero or negative price unless it's a promotion authorized
    IF NEW.price_paid <= 0 THEN
      RAISE EXCEPTION 'El precio pagado por el producto "%" debe ser mayor que cero.', p_name;
    END IF;

    -- Secure price manipulation verification (non-admins cannot modify below expected catalog price)
    expected_price := public.get_expected_product_price(p_price_public, p_description, o_role_used);
    
    -- If the submitted price is less than the expected catalog price, raise an exception
    IF NEW.price_paid < expected_price THEN
      RAISE EXCEPTION 'El precio enviado para "%" (%) es inferior al precio oficial de catálogo (%).', p_name, NEW.price_paid, expected_price;
    END IF;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_order_item_integrity ON public.order_items;
CREATE TRIGGER tr_validate_order_item_integrity
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE PROCEDURE public.validate_order_item_integrity();

-- =========================================================
-- 11. Robust Order Security and Status Transition Trigger
-- =========================================================

CREATE OR REPLACE FUNCTION public.validate_order_integrity()
RETURNS TRIGGER AS $func$
DECLARE
  caller_role TEXT;
BEGIN
  -- Get caller role
  caller_role := public.get_my_role();

  -- If it's an UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- If caller is not admin/seller
    IF COALESCE(caller_role, '') NOT IN ('dueño', 'owner', 'vendedor') THEN
      -- If they are not the buyer, block completely (handled by RLS, but double-guaranteed here)
      IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM OLD.buyer_id THEN
        RAISE EXCEPTION 'Acceso denegado: No puedes modificar esta orden.';
      END IF;

      -- Customers can ONLY transition from 'pendiente' to 'cancelado' (to cancel their own order)
      -- They CANNOT change total, client_name, client_phone, buyer_id, etc.
      IF NEW.client_name IS DISTINCT FROM OLD.client_name OR
         NEW.client_phone IS DISTINCT FROM OLD.client_phone OR
         NEW.total IS DISTINCT FROM OLD.total OR
         NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR
         NEW.role_used IS DISTINCT FROM OLD.role_used OR
         NEW.date IS DISTINCT FROM OLD.date THEN
        RAISE EXCEPTION 'Acceso denegado: No puedes modificar los detalles de una orden ya enviada.';
      END IF;

      -- Validate status transitions
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status IS DISTINCT FROM 'pendiente' THEN
          RAISE EXCEPTION 'Acceso denegado: Solo puedes cancelar órdenes en estado "pendiente".';
        END IF;
        IF NEW.status IS DISTINCT FROM 'cancelado' THEN
          RAISE EXCEPTION 'Acceso denegado: Solo puedes cambiar el estado a "cancelado" para anular tu orden.';
        END IF;
      END IF;
    END IF;
  END IF;

  -- If it's an INSERT (creating a new order)
  IF TG_OP = 'INSERT' THEN
    -- If caller is not admin/seller
    IF COALESCE(caller_role, '') NOT IN ('dueño', 'owner', 'vendedor') THEN
      -- Forces new orders from public/clients to start as 'pendiente'
      IF NEW.status IS DISTINCT FROM 'pendiente' THEN
        RAISE EXCEPTION 'Acceso denegado: Las nuevas órdenes deben crearse en estado "pendiente".';
      END IF;

      -- Ensure role_used is safe and cannot be elevated
      IF auth.uid() IS NOT NULL THEN
        IF NEW.role_used NOT IN ('usuario', 'detalle', 'publico') AND NEW.role_used IS DISTINCT FROM caller_role THEN
          RAISE EXCEPTION 'Acceso denegado: No puedes usar el rol % para esta orden.', NEW.role_used;
        END IF;
      ELSE
        -- Guest orders must be 'publico'
        IF NEW.role_used IS DISTINCT FROM 'publico' THEN
          RAISE EXCEPTION 'Acceso denegado: Las órdenes de invitados deben usar el rol "publico".';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_order_integrity ON public.orders;
CREATE TRIGGER tr_validate_order_integrity
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.validate_order_integrity();

-- ==========================================
-- 8. Immediate Bi-Directional Role Synchronization Repair
-- Syncs all existing accounts between auth.users and public.profiles
-- ==========================================
DO $func$
BEGIN
  -- Copy roles from auth.users to public.profiles if set
  UPDATE public.profiles p
  SET role = lower(trim(u.raw_user_meta_data->>'role'))
  FROM auth.users u
  WHERE p.id = u.id 
    AND u.raw_user_meta_data->>'role' IS NOT NULL 
    AND lower(trim(u.raw_user_meta_data->>'role')) IN ('vendedor', 'dueño', 'owner', 'mayorista', 'detalle');

  -- Copy roles from public.profiles to auth.users if set
  UPDATE auth.users u
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
  FROM public.profiles p
  WHERE p.id = u.id 
    AND p.role IS NOT NULL 
    AND lower(trim(p.role)) IN ('vendedor', 'dueño', 'owner', 'mayorista', 'detalle')
    AND (u.raw_user_meta_data->>'role' IS NULL OR lower(trim(u.raw_user_meta_data->>'role')) != lower(trim(p.role)));
END $func$;

