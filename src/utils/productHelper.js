export function detectProductCategory(str) {
  if (!str) return 'Revision';
  const text = String(str).trim();
  const upper = text.toUpperCase();

  // 1. Direct explicit single letter tokens or categories
  if (upper === 'M' || upper === 'MAN' || upper === 'MEN' || upper === 'MASCULINO' || upper === 'CABALLERO' || upper === 'CABALLEROS' || upper === 'HOMBRE') {
    return 'Caballeros';
  }
  if (upper === 'W' || upper === 'WOMAN' || upper === 'WOMEN' || upper === 'FEMENINO' || upper === 'LADY' || upper === 'LADIES' || upper === 'DAMAS' || upper === 'DAMA' || upper === 'MUJER') {
    return 'Damas';
  }
  if (upper === 'U' || upper === 'UNISEX') {
    return 'Unisex';
  }

  // 2. Token boundary / word match check in multi-word product strings or descriptions
  // Check for standalone M, W, U tokens with word boundaries (e.g., "100 ML EDT M", "EDP W 3.4 OZ", "SPRAY U")
  if (/\bM\b/.test(upper) || /\bMEN\b/.test(upper) || /\bMAN\b/.test(upper) || /\bPOUR HOMME\b/.test(upper) || /\bCABALLERO\b/.test(upper) || /\bHOMBRE\b/.test(upper) || /\bBOY\b/.test(upper)) {
    return 'Caballeros';
  }
  if (/\bW\b/.test(upper) || /\bWOMEN\b/.test(upper) || /\bWOMAN\b/.test(upper) || /\bPOUR FEMME\b/.test(upper) || /\bLADY\b/.test(upper) || /\bLADIES\b/.test(upper) || /\bDAMA\b/.test(upper) || /\bMUJER\b/.test(upper) || /\bGIRL\b/.test(upper)) {
    return 'Damas';
  }
  if (/\bU\b/.test(upper) || /\bUNISEX\b/.test(upper)) {
    return 'Unisex';
  }

  // 3. Substring search if full words exist
  if (upper.includes('MASCULINO') || upper.includes('CABALLEROS')) {
    return 'Caballeros';
  }
  if (upper.includes('FEMENINO') || upper.includes('DAMAS')) {
    return 'Damas';
  }

  // Fallback: Revision Manual
  return 'Revision';
}

export function isProductSet(product) {
  if (!product) return false;
  
  const nameLower = (product.name || '').toLowerCase();
  const descLower = (product.description || '').toLowerCase();
  const sizeLower = (product.size || '').toLowerCase();
  
  // High confidence indicators of a set (e.g. Set, Gift Set, Kit, etc.)
  return (
    nameLower.includes('set') ||
    nameLower.includes('giftset') ||
    nameLower.includes('gift set') ||
    nameLower.includes('include') ||
    nameLower.includes('piezas') ||
    nameLower.includes('pzs') ||
    nameLower.includes('estuche') ||
    nameLower.includes('kit') ||
    nameLower.includes('pack') ||
    nameLower.includes('hard box') ||
    descLower.includes('includes:') ||
    descLower.includes('include:') ||
    descLower.includes('incluye:') ||
    descLower.includes('set includes') ||
    descLower.includes('gift set') ||
    sizeLower.includes('pc') ||
    sizeLower.includes('pcs') ||
    sizeLower.includes('piezas') ||
    sizeLower.includes('pzs')
  );
}

export function parsePromoValue(valueStr) {
  if (!valueStr) return null;
  const val = String(valueStr).trim();
  if (val.endsWith('%')) {
    const num = parseFloat(val.replace('%', ''));
    return { type: 'percent', value: isNaN(num) ? 0 : num };
  } else {
    const cleanNum = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanNum);
    return { type: 'amount', value: isNaN(num) ? 0 : num };
  }
}

export function getProductPromoDetalle(product) {
  if (!product || !product.description) return null;
  const matchDetalle = product.description.match(/\[PROMO_DETALLE:(.*?)\]/);
  if (matchDetalle) return matchDetalle[1].trim();
  const matchLegacy = product.description.match(/\[PROMO:(\d+)\]/);
  if (matchLegacy) return `${matchLegacy[1]}%`;
  return null;
}

export function getProductPromoMayorista(product) {
  if (!product || !product.description) return null;
  const match = product.description.match(/\[PROMO_MAYORISTA:(.*?)\]/);
  return match ? match[1].trim() : null;
}

export function getProductPrices(product) {
  const pricePublic = Number(product?.pricePublic || 0);
  const baseWholesale = Math.round(pricePublic * 0.75); // Always 25% discount off base retail price

  // 1. Detalle (Retail) Promo
  const promoDetalleStr = getProductPromoDetalle(product);
  let finalDetalle = pricePublic;
  let promoDetalleValue = null;
  let promoDetalleType = null;

  if (promoDetalleStr) {
    const parsed = parsePromoValue(promoDetalleStr);
    if (parsed) {
      promoDetalleType = parsed.type;
      promoDetalleValue = parsed.value;
      if (parsed.type === 'percent') {
        finalDetalle = Math.max(0, Math.round(pricePublic * (1 - parsed.value / 100)));
      } else {
        finalDetalle = Math.max(0, Math.round(pricePublic - parsed.value));
      }
    }
  }

  // 2. Mayorista (Wholesale) Promo
  const promoMayoristaStr = getProductPromoMayorista(product);
  let finalWholesale = baseWholesale;
  let promoMayoristaValue = null;
  let promoMayoristaType = null;

  if (promoMayoristaStr) {
    const parsed = parsePromoValue(promoMayoristaStr);
    if (parsed) {
      promoMayoristaType = parsed.type;
      promoMayoristaValue = parsed.value;
      if (parsed.type === 'percent') {
        finalWholesale = Math.max(0, Math.round(baseWholesale * (1 - parsed.value / 100)));
      } else {
        finalWholesale = Math.max(0, Math.round(baseWholesale - parsed.value));
      }
    }
  }

  return {
    pricePublic,        // Base Detalle
    baseWholesale,      // Base Mayorista (25% off detail)
    finalDetalle,       // Final Detalle (after Detalle promo if any)
    finalWholesale,     // Final Mayorista (after Mayorista promo if any)
    hasDetallePromo: !!promoDetalleStr,
    hasMayoristaPromo: !!promoMayoristaStr,
    promoDetalleType,
    promoDetalleValue,
    promoMayoristaType,
    promoMayoristaValue
  };
}

export function getProductPriceForUser(product, user) {
  const prices = getProductPrices(product);
  const role = user?.role ? String(user.role).toLowerCase() : 'publico';
  
  if (role === 'mayorista') {
    return prices.finalWholesale;
  } else if (role === 'vendedor' || role === 'owner' || role === 'dueño') {
    return prices.finalWholesale; // Staff default to wholesale representation
  } else {
    return prices.finalDetalle;
  }
}

export function getProductPromoDiscount(product) {
  const prices = getProductPrices(product);
  if (prices.hasDetallePromo && prices.promoDetalleType === 'percent') {
    return prices.promoDetalleValue;
  }
  return 0;
}

export function getProductPublicCategories(product) {
  if (!product) return [];
  // 1. If description contains [PUB_CATS:cat1,cat2], parse it
  if (product.description) {
    const match = product.description.match(/\[PUB_CATS:(.*?)\]/);
    if (match) {
      if (!match[1].trim()) return [];
      return match[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    }
  }

  // 2. Default fallback based on product category & isProductSet
  const pCat = String(product.category || '').trim();
  const setFlag = isProductSet(product);

  const isDama = pCat === 'Damas' || pCat === 'Femenino' || pCat === 'W';
  const isCaballero = pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'M';
  const isUnisex = pCat === 'Unisex' || pCat === 'U';

  const cats = [];
  if (!setFlag) {
    if (isDama) cats.push('damas');
    if (isCaballero) cats.push('caballeros');
    if (isUnisex) {
      cats.push('damas');
      cats.push('caballeros');
    }
  } else {
    if (isDama) cats.push('estuches-dama');
    if (isCaballero) cats.push('estuches-caballero');
    if (isUnisex) {
      cats.push('estuches-dama');
      cats.push('estuches-caballero');
    }
  }

  return cats;
}

export function setProductPublicCategoriesInDesc(description, categoriesArray) {
  const desc = String(description || '').replace(/\[PUB_CATS:.*?\]/g, '').trim();
  const tag = `[PUB_CATS:${categoriesArray.join(',')}]`;
  return desc ? `${desc} ${tag}` : tag;
}

export function isProductInPublicCategory(product, targetCat) {
  if (!product) return false;
  if (product.featuredPublic === false) return false;
  const cats = getProductPublicCategories(product);
  return cats.includes(targetCat.toLowerCase());
}

export function cleanProductDescription(description) {
  if (!description) return '';
  return description
    .replace(/\[PROMO_DETALLE:.*?\]/g, '')
    .replace(/\[PROMO_MAYORISTA:.*?\]/g, '')
    .replace(/\[PROMO:\d+\]/g, '')
    .replace(/\[PUB_CATS:.*?\]/g, '')
    .trim();
}

export function setProductPromotions(description, promoDetalle, promoMayorista) {
  let cleanDesc = cleanProductDescription(description);
  
  if (promoDetalle && String(promoDetalle).trim() !== '') {
    cleanDesc = `${cleanDesc}\n\n[PROMO_DETALLE:${String(promoDetalle).trim()}]`.trim();
  }
  if (promoMayorista && String(promoMayorista).trim() !== '') {
    cleanDesc = `${cleanDesc}\n\n[PROMO_MAYORISTA:${String(promoMayorista).trim()}]`.trim();
  }
  
  return cleanDesc;
}

export function getConsolidatedProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return [];

  const map = new Map();

  for (const p of products) {
    if (!p) continue;
    const brandKey = (p.brand || '').trim().toLowerCase();
    const nameKey = (p.name || '').trim().toLowerCase();
    const sizeKey = (p.size || '').trim().toLowerCase();
    const key = `${brandKey}|${nameKey}|${sizeKey}`;

    if (!map.has(key)) {
      map.set(key, {
        ...p,
        stock: Number(p.stock || 0),
        batches: [p],
        batchIds: [p.id]
      });
    } else {
      const existing = map.get(key);
      existing.stock += Number(p.stock || 0);
      existing.batches.push(p);
      existing.batchIds.push(p.id);

      // If existing product had 0 stock but this batch has >0 stock, take active prices & id
      if (existing.stock <= 0 && Number(p.stock || 0) > 0) {
        existing.id = p.id;
        existing.pricePublic = p.pricePublic;
        existing.pricePromotional = p.pricePromotional;
        if (p.cost && p.cost > 0) existing.cost = p.cost;
      } else if ((!existing.cost || existing.cost === 0) && p.cost > 0) {
        existing.cost = p.cost;
      }
    }
  }

  return Array.from(map.values());
}
