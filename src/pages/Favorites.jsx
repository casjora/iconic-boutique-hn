import React from 'react';
import CatalogView from '../components/CatalogView';

export default function Favorites() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-black font-display text-neutral-900 mb-6 uppercase tracking-tight">Mis Favoritos</h2>
      <CatalogView initialShowFavorites={true} />
    </div>
  );
}
