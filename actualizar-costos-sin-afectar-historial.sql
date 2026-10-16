-- ==============================================================================
-- BLINDAJE DE HISTORIAL Y ACTUALIZACIÓN SEGURA DE COSTOS DE PRODUCTOS
-- Iconic Boutique HN
-- ==============================================================================

-- 1. Añadir columna 'cost_at_sale' si no existe
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS cost_at_sale NUMERIC DEFAULT NULL;

-- 2. Actualizar la función del trigger PRIMERO con la excepción para actualizaciones internas (UPDATE)
-- Esto evita tener que desactivar triggers de sistema y previene cualquier error de permisos.
CREATE OR REPLACE FUNCTION public.validate_order_item_integrity()
RETURNS TRIGGER AS $
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
  -- ⚡ EXCEPCIÓN PARA ACTUALIZACIONES INTERNAS (UPDATE):
  -- Si no cambiaron ni el producto, ni la cantidad, ni el precio pagado (ej: solo se actualiza cost_at_sale o auditoría),
  -- permitir la actualización de inmediato sin revalidar contra precios de catálogo actuales.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.product_id = NEW.product_id 
       AND OLD.quantity = NEW.quantity 
       AND OLD.price_paid = NEW.price_paid THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Leer desde products_raw para que el trigger tenga acceso a datos crudos
  SELECT stock, featured_public, name, price_public, description, cost
  INTO p_stock, p_featured, p_name, p_price_public, p_description, p_cost
  FROM public.products_raw
  WHERE id = NEW.product_id;

  IF p_name IS NULL THEN
    RAISE EXCEPTION 'El producto con ID % no existe.', NEW.product_id;
  END IF;

  -- ⚡ BLINDAJE DE HISTORICIDAD: Congelar el costo unitario exacto al momento de la venta
  IF NEW.cost_at_sale IS NULL OR NEW.cost_at_sale <= 0 THEN
    NEW.cost_at_sale := COALESCE(p_cost, 0);
  END IF;

  -- Si quien ejecuta es el rol de sistema o superusuario en consola SQL, permitir sin restricciones de cliente
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vincular trigger en order_items
DROP TRIGGER IF EXISTS tr_validate_order_item_integrity ON public.order_items;
CREATE TRIGGER tr_validate_order_item_integrity
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE PROCEDURE public.validate_order_item_integrity();

-- 4. Congelar los costos históricos en todas las ventas existentes
-- (Pasa directamente y sin bloqueos gracias a la función actualizada en el paso 2)
UPDATE public.order_items oi
SET cost_at_sale = COALESCE(pr.cost, 0)
FROM public.products_raw pr
WHERE oi.product_id = pr.id
  AND (oi.cost_at_sale IS NULL OR oi.cost_at_sale <= 0);

UPDATE public.order_items
SET cost_at_sale = 0
WHERE cost_at_sale IS NULL;

-- 5. Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
