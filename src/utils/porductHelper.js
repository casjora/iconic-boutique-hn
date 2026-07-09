/**
 * Utility functions for analyzing and classifying products (e.g. detecting Sets).
 */

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
