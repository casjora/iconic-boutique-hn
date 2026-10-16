CREATE OR REPLACE FUNCTION public.products_view_dml()
RETURNS TRIGGER AS $func$
DECLARE
  v_role TEXT;
  v_jwt_json JSONB;
  v_profile_role TEXT;
  v_real_cost NUMERIC;
  v_real_price_public NUMERIC;
  v_real_price_promotional NUMERIC;
BEGIN
  v_role := COALESCE(public.get_my_role(), '');

  -- Fallback JWT claim check si get_my_role falló
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

  IF v_role NOT IN ('dueño', 'owner', 'vendedor') AND auth.uid() IS NOT NULL THEN
    BEGIN
      SELECT lower(trim(coalesce(raw_user_meta_data->>'role', ''))) INTO v_role FROM auth.users WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    IF v_role NOT IN ('dueño', 'owner', 'vendedor') THEN
      BEGIN
        SELECT lower(trim(coalesce(role, ''))) INTO v_profile_role FROM public.profiles WHERE id = auth.uid();
        IF v_profile_role IN ('dueño', 'owner', 'vendedor') THEN
          v_role := v_profile_role;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  IF v_role NOT IN ('dueño', 'owner', 'vendedor') THEN
    RAISE EXCEPTION 'Acceso denegado: No tienes permisos para modificar productos. (Rol detectado: %)', v_role;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_role IN ('dueño', 'owner') THEN
      INSERT INTO public.products_raw (
        id, name, brand, size, cost, price_public, price_promotional, stock, category, barcode, description, image_url, created_at, featured_public, public_discount
      ) VALUES (
        COALESCE(NEW.id, 'prod_' || gen_random_uuid()), COALESCE(NEW.name, 'Perfume Desconocido'), COALESCE(NEW.brand, 'Marca Desconocida'), COALESCE(NEW.size, '100 ml'),
        COALESCE(NEW.cost, 0), COALESCE(NEW.price_public, 0), COALESCE(NEW.price_promotional, 0), COALESCE(NEW.stock, 0), COALESCE(NEW.category, 'Femenino'), NEW.barcode, NEW.description,
        NEW.image_url, COALESCE(NEW.created_at, now()), COALESCE(NEW.featured_public, true), COALESCE(NEW.public_discount, 0)
      ) RETURNING * INTO NEW;
      RETURN NEW;
    ELSE
      INSERT INTO public.products_raw (
        id, name, brand, size, cost, price_public, price_promotional, stock, category, barcode, description, image_url, created_at, featured_public, public_discount
      ) VALUES (
        COALESCE(NEW.id, 'prod_' || gen_random_uuid()), COALESCE(NEW.name, 'Perfume Desconocido'), COALESCE(NEW.brand, 'Marca Desconocida'), COALESCE(NEW.size, '100 ml'),
        0, COALESCE(NEW.price_public, 0), COALESCE(NEW.price_promotional, 0), COALESCE(NEW.stock, 0), COALESCE(NEW.category, 'Femenino'), NEW.barcode, NEW.description,
        NEW.image_url, COALESCE(NEW.created_at, now()), COALESCE(NEW.featured_public, true), COALESCE(NEW.public_discount, 0)
      ) RETURNING * INTO NEW;
      NEW.cost := 0;
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_role IN ('dueño', 'owner') THEN
      UPDATE public.products_raw SET
        name = COALESCE(NEW.name, OLD.name),
        brand = COALESCE(NEW.brand, OLD.brand),
        size = COALESCE(NEW.size, OLD.size),
        cost = CASE WHEN NEW.cost IS NOT NULL AND NEW.cost >= 0 THEN NEW.cost ELSE OLD.cost END,
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
      -- FIX: Buscar el costo real actual porque la vista siempre da 0 para vendedores
      SELECT cost 
      INTO v_real_cost
      FROM public.products_raw WHERE id = OLD.id;

      UPDATE public.products_raw SET
        name = COALESCE(NEW.name, OLD.name),
        brand = COALESCE(NEW.brand, OLD.brand),
        size = COALESCE(NEW.size, OLD.size),
        cost = v_real_cost, -- Usar el costo real extraído y no permitir que se altere a 0
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

      -- Regresar máscara para la vista
      NEW.cost := 0;
      NEW.price_public := v_real_price_public;
      NEW.price_promotional := v_real_price_promotional;
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.products_raw WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

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

-- ==========================================
-- 6. Funciones de Integridad de Ordenes (Leen de products_raw)
-- ==========================================

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
  IF clean_val LIKE '%%' THEN
    num_val := COALESCE(nullif(regexp_replace(clean_val, '[^0-9.]', '', 'g'), '')::NUMERIC, 0);
    RETURN GREATEST(0, round(base_price * (1.0 - num_val / 100.0)));
  ELSE
    num_val := COALESCE(nullif(regexp_replace(clean_val, '[^0-9.]', '', 'g'), '')::NUMERIC, 0);
    RETURN GREATEST(0, round(base_price - num_val));
  END IF;
END;
$func$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

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
  promo_detalle_str := substring(p_description from '\[PROMO_DETALLE:([^\]]+)\]');
  IF promo_detalle_str IS NULL THEN
    IF substring(p_description from '\[PROMO:(\d+)\]') IS NOT NULL THEN
      promo_detalle_str := substring(p_description from '\[PROMO:(\d+)\]') || '%';
    END IF;
  END IF;
  final_detalle := public.apply_promo_value(promo_detalle_str, p_price_public);

  base_wholesale := round(p_price_public * 0.75);
  promo_mayorista_str := substring(p_description from '\[PROMO_MAYORISTA:([^\]]+)\]');
  final_wholesale := public.apply_promo_value(promo_mayorista_str, base_wholesale);

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
  -- FIX: Leer desde products_raw para que el trigger tenga acceso a datos crudos
  SELECT stock, featured_public, name, price_public, description, cost
  INTO p_stock, p_featured, p_name, p_price_public, p_description, p_cost
  FROM public.products_raw
  WHERE id = NEW.product_id;

  IF p_name IS NULL THEN
    RAISE EXCEPTION 'El producto con ID % no existe.', NEW.product_id;
  END IF;

  caller_role := public.get_my_role();

  SELECT role_used INTO o_role_used FROM public.orders WHERE id = NEW.order_id;
  o_role_used := lower(coalesce(o_role_used, 'detalle'));

  p_wholesale_price := public.get_expected_product_price(p_price_public, p_description, 'mayorista');

  IF o_role_used = 'mayorista' THEN
    IF NEW.price_paid < p_cost THEN
      RAISE EXCEPTION 'Acceso denegado: El precio de mayoreo para "%" (L. %) no puede ser inferior al costo del producto (L. %).', p_name, NEW.price_paid, p_cost;
    END IF;
  ELSE
    IF NEW.price_paid < p_wholesale_price THEN
      RAISE EXCEPTION 'Acceso denegado: El precio de detalle para "%" (L. %) no puede ser inferior al precio de mayoreo (L. %).', p_name, NEW.price_paid, p_wholesale_price;
    END IF;
  END IF;

  IF COALESCE(caller_role, '') NOT IN ('dueño', 'owner', 'vendedor') THEN
    IF NOT COALESCE(p_featured, true) THEN
      RAISE EXCEPTION 'El producto "%" no está disponible para la venta al público.', p_name;
    END IF;
    IF p_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Lo sentimos, el producto "%" no tiene suficientes existencias (Disponibles: %, Solicitadas: %).', p_name, p_stock, NEW.quantity;
    END IF;
    IF NEW.price_paid <= 0 THEN
      RAISE EXCEPTION 'El precio pagado por el producto "%" debe ser mayor que cero.', p_name;
    END IF;

    expected_price := public.get_expected_product_price(p_price_public, p_description, o_role_used);
    IF NEW.price_paid < expected_price THEN
      RAISE EXCEPTION 'El precio enviado para "%" (%) es inferior al precio oficial de catálogo (%).', p_name, NEW.price_paid, expected_price;
    END IF;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;