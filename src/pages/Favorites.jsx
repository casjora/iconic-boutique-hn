
import CatalogView from '../components/CatalogView';

export default function Favorites() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CatalogView favoritesOnly={true} />
    </div>
  );
}
