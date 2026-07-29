import CatalogView from '../components/CatalogView';

export default function Favorites() {
  return (
    <div className="container mx-auto">
      <CatalogView favoritesOnly={true} />
    </div>
  );
}
