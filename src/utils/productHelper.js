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

export function cleanProductDescription(description) {
  if (!description) return '';
  return description
    .replace(/\[PROMO_DETALLE:.*?\]/g, '')
    .replace(/\[PROMO_MAYORISTA:.*?\]/g, '')
    .replace(/\[PROMO:\d+\]/g, '')
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
