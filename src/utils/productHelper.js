export function normalizeCategory(cat) {
  if (!cat) return null;
  const c = String(cat).trim().toUpperCase();
  if (c === 'M' || c === 'MAN' || c === 'MEN' || c === 'MASCULINO' || c === 'CABALLERO' || c === 'CABALLEROS' || c === 'HOMBRE' || c === 'MALE') {
    return 'Caballeros';
  }
  if (c === 'W' || c === 'WOMAN' || c === 'WOMEN' || c === 'FEMENINO' || c === 'DAMA' || c === 'DAMAS' || c === 'LADY' || c === 'LADIES' || c === 'MUJER' || c === 'FEMALE') {
    return 'Damas';
  }
  if (c === 'U' || c === 'UNISEX' || c === 'REVISION' || c === 'REVISIÓN' || c === 'PENDIENTE') {
    return 'Unisex';
  }
  return null;
}

export function detectProductCategory(str) {
  if (!str) return 'Unisex';
  const text = String(str).trim();
  const upper = text.toUpperCase();

  // Direct exact match
  const direct = normalizeCategory(upper);
  if (direct) return direct;

  // 1. Explicit multi-word phrases or full words (Higher confidence)
  // Check women phrases/keywords first so "WOMEN" or "WOMAN" doesn't get confused with "MEN" or "MAN"
  if (/\b(POUR FEMME|FOR WOMEN|FOR WOMAN|FEMENINO|DAMAS|DAMA|LADIES|LADY|MUJER|WOMEN|WOMAN|GIRL)\b/.test(upper)) {
    return 'Damas';
  }
  if (/\b(POUR HOMME|FOR MEN|FOR MAN|MASCULINO|CABALLEROS|CABALLERO|HOMBRE|MEN|MAN|BOY)\b/.test(upper)) {
    return 'Caballeros';
  }
  if (/\b(UNISEX)\b/.test(upper)) {
    return 'Unisex';
  }

  // 2. Standalone single letter codes (M, W, U) with word boundaries
  // Note: \bM\b, \bW\b, \bU\b.
  // Replace parentheses like (M), (W), (U) with spaces so word boundary works
  const cleanUpper = upper.replace(/[()]/g, ' ');

  if (/\bW\b/.test(cleanUpper)) {
    return 'Damas';
  }
  if (/\bM\b/.test(cleanUpper)) {
    return 'Caballeros';
  }
  if (/\bU\b/.test(cleanUpper)) {
    return 'Unisex';
  }

  // 3. Substring fallback checks if full words exist
  if (upper.includes('CABALLERO') || upper.includes('MASCULINO')) {
    return 'Caballeros';
  }
  if (upper.includes('DAMA') || upper.includes('FEMENINO')) {
    return 'Damas';
  }

  return 'Unisex';
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

export function getProductIsRemate(product) {
  if (!product || !product.description) return false;
  return /\[REMATE:.*?\]/.test(product.description);
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
  const pricePublic = Number(product?.pricePublic || product?.price_public || 0);
  const cost = Number(product?.cost || 0);
  const isRemate = getProductIsRemate(product);

  const explicitWholesale = Number(product?.pricePromotional || product?.price_promotional || 0);
  const baseWholesale = (explicitWholesale > 0 && explicitWholesale < pricePublic)
    ? explicitWholesale
    : Math.round(pricePublic * 0.75); // Always 25% discount off base retail price

  // 1. Detalle (Retail) Promo: <= 25% discount off pricePublic (unless isRemate)
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
        const pct = isRemate ? parsed.value : Math.min(25, parsed.value);
        finalDetalle = Math.max(0, Math.round(pricePublic * (1 - pct / 100)));
      } else {
        const maxDiscount = isRemate ? pricePublic : Math.round(pricePublic * 0.25);
        const discount = Math.min(parsed.value, maxDiscount);
        finalDetalle = Math.max(0, Math.round(pricePublic - discount));
      }
    }
  }

  const effectiveDetallePct = pricePublic > 0
    ? Math.round(((pricePublic - finalDetalle) / pricePublic) * 100)
    : 0;

  // 2. Mayorista (Wholesale) Promo: >= 25% total discount off pricePublic, price >= cost (unless isRemate)
  const promoMayoristaStr = getProductPromoMayorista(product);
  let finalWholesale = baseWholesale;
  let promoMayoristaValue = null;
  let promoMayoristaType = null;

  if (promoMayoristaStr) {
    const parsed = parsePromoValue(promoMayoristaStr);
    if (parsed) {
      promoMayoristaType = parsed.type;
      promoMayoristaValue = parsed.value;
      const requested = parsed.type === 'percent'
        ? Math.round(baseWholesale * (1 - parsed.value / 100))
        : Math.round(baseWholesale - parsed.value);
      if (!isRemate && cost > 0) {
        finalWholesale = Math.max(cost, requested);
      } else {
        finalWholesale = Math.max(0, requested);
      }
    }
  } else {
    // If no explicit promo, ensure baseWholesale is not below cost unless isRemate
    if (!isRemate && cost > 0) {
      finalWholesale = Math.max(cost, baseWholesale);
    }
  }

  const effectiveWholesalePct = pricePublic > 0
    ? Math.round(((pricePublic - finalWholesale) / pricePublic) * 100)
    : 25;

  return {
    pricePublic,        // Base Detalle
    baseWholesale,      // Base Mayorista (25% off detail)
    cost,
    finalDetalle,       // Final Detalle (after Detalle promo if any)
    finalWholesale,     // Final Mayorista (after Mayorista promo if any)
    hasDetallePromo: !!promoDetalleStr || (isRemate && finalDetalle < pricePublic),
    hasMayoristaPromo: !!promoMayoristaStr || (isRemate && finalWholesale < baseWholesale),
    isRemate,
    effectiveDetallePct,
    effectiveWholesalePct,
    promoDetalleType,
    promoDetalleValue,
    promoMayoristaType,
    promoMayoristaValue
  };
}

export function getProductDiscountBadges(product, user) {
  if (!product) return [];
  const prices = getProductPrices(product);
  const role = user?.role ? String(user.role).toLowerCase() : 'publico';
  const isOwner = role === 'owner' || role === 'dueño';
  const isStaff = role === 'vendedor' || isOwner || role === 'admin';
  const isMayorista = role === 'mayorista';
  const isPublic = !isStaff && !isMayorista;

  const badges = [];

  if (prices.isRemate) {
    const rematePct = prices.effectiveDetallePct || prices.effectiveWholesalePct || 30;
    badges.push({
      key: 'remate',
      type: 'remate',
      label: `REMATE: ${rematePct}%`,
      bgClass: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
    });
    return badges;
  }

  // 1. Detalle discount badge
  // Visible ONLY to public/detalle clients OR staff
  if ((isPublic || isStaff) && prices.hasDetallePromo && prices.effectiveDetallePct > 0) {
    badges.push({
      key: 'detalle',
      type: 'detalle',
      label: `DETALLE: ${prices.effectiveDetallePct}%`,
      bgClass: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800'
    });
  }

  // 2. Mayorista discount badge
  // Visible ONLY to mayorista clients OR staff
  if ((isMayorista || isStaff) && (prices.hasMayoristaPromo || (isMayorista && prices.effectiveWholesalePct > 25))) {
    badges.push({
      key: 'mayorista',
      type: 'mayorista',
      label: `MAYOREO: ${prices.effectiveWholesalePct}%`,
      bgClass: 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
    });
  }

  return badges;
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
    .replace(/\[REMATE:.*?\]/g, '')
    .replace(/\[PUB_CATS:.*?\]/g, '')
    .trim();
}

export function setProductPromotions(description, promoDetalle, promoMayorista, isRemate = false) {
  let cleanDesc = cleanProductDescription(description);
  
  if (promoDetalle && String(promoDetalle).trim() !== '') {
    cleanDesc = `${cleanDesc}\n\n[PROMO_DETALLE:${String(promoDetalle).trim()}]`.trim();
  }
  if (promoMayorista && String(promoMayorista).trim() !== '') {
    cleanDesc = `${cleanDesc}\n\n[PROMO_MAYORISTA:${String(promoMayorista).trim()}]`.trim();
  }
  if (isRemate) {
    cleanDesc = `${cleanDesc}\n\n[REMATE:true]`.trim();
  }
  
  return cleanDesc;
}

export function getConsolidatedProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return [];

  // Pass 1: Gather available images indexed by brand + name
  const imageByPerfume = new Map();
  for (const p of products) {
    if (!p) continue;
    const img = p.imageUrl || p.image_url;
    if (img) {
      const bnKey = `${(p.brand || '').trim().toLowerCase()}|${(p.name || '').trim().toLowerCase()}`;
      if (!imageByPerfume.has(bnKey)) {
        imageByPerfume.set(bnKey, img);
      }
    }
  }

  const map = new Map();

  for (const p of products) {
    if (!p) continue;
    const brandKey = (p.brand || '').trim().toLowerCase();
    const nameKey = (p.name || '').trim().toLowerCase();
    const sizeKey = (p.size || '').trim().toLowerCase();
    const key = `${brandKey}|${nameKey}|${sizeKey}`;
    const bnKey = `${brandKey}|${nameKey}`;

    // Inherit image if missing
    const inheritedImg = p.imageUrl || p.image_url || imageByPerfume.get(bnKey) || '';

    const normalizedP = {
      ...p,
      category: normalizeCategory(p.category) || p.category || 'Damas',
      imageUrl: inheritedImg,
      image_url: inheritedImg
    };

    if (!map.has(key)) {
      map.set(key, {
        ...normalizedP,
        stock: Number(p.stock || 0),
        batches: [normalizedP],
        batchIds: [p.id]
      });
    } else {
      const existing = map.get(key);
      existing.stock += Number(p.stock || 0);
      existing.batches.push(normalizedP);
      existing.batchIds.push(p.id);

      if (!existing.imageUrl && inheritedImg) {
        existing.imageUrl = inheritedImg;
        existing.image_url = inheritedImg;
      }

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
