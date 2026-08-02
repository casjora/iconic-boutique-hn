import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

const isEstuche = (p) => {
  const text = ((p.name || '') + ' ' + (p.description || '') + ' ' + (p.brand || '')).toLowerCase();
  return text.includes('estuche') || text.includes('set') || text.includes('kit') || text.includes('gift set');
};

export default function Home() {
  const { products } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Dynamically compute category images from products curated in Showroom
  const categories = useMemo(() => {
    const usedImages = new Set();

    const getCategoryImage = (catKey, defaultImage) => {
      const isSet = catKey.startsWith('estuches');
      const isMale = catKey.includes('caballero') || catKey === 'caballeros';
      const isFemale = catKey.includes('dama') || catKey === 'damas';

      const match = products.find(p => {
        // Must be selected in Showroom (featuredPublic is true)
        if (!p.featuredPublic) return false;
        
        const setFlag = isEstuche(p);
        if (isSet !== setFlag) return false;

        const pCat = String(p.category || '');
        const isProductMale = pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'Unisex';
        const isProductFemale = pCat === 'Damas' || pCat === 'Femenino' || pCat === 'Unisex';

        if (isMale && !isProductMale) return false;
        if (isFemale && !isProductFemale) return false;

        // Ensure the product has a valid image string and has not been used already
        if (!p.image_url || !p.image_url.startsWith('http')) return false;
        if (usedImages.has(p.image_url)) return false;

        return true;
      });

      if (match) {
        usedImages.add(match.image_url);
        return match.image_url;
      }
      return defaultImage;
    };

    return [
      { 
        name: 'Para Damas', 
        path: '/category/damas', 
        image: getCategoryImage('damas', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800') 
      },
      { 
        name: 'Para Caballeros', 
        path: '/category/caballeros', 
        image: getCategoryImage('caballeros', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800') 
      },
      { 
        name: 'Estuches para Dama', 
        path: '/category/estuches-dama', 
        image: getCategoryImage('estuches-dama', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=800') 
      },
      { 
        name: 'Estuches para Caballero', 
        path: '/category/estuches-caballero', 
        image: getCategoryImage('estuches-caballero', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=800') 
      }
    ];
  }, [products]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % categories.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [categories.length]);

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Hero Carousel */}
      <section className="relative h-[65vh] w-full overflow-hidden rounded-3xl bg-neutral-900 shadow-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            <img
              src={categories[currentIndex]?.image}
              alt={categories[currentIndex]?.name}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white bg-gradient-to-t from-neutral-950/40 via-transparent to-transparent">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-display text-4xl sm:text-6xl font-black tracking-tight"
              >
                {categories[currentIndex]?.name}
              </motion.h2>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
              >
                <Link to={categories[currentIndex]?.path || '#'} className="rounded-full bg-white px-8 py-3.5 text-xs font-black text-neutral-950 tracking-wider uppercase transition hover:bg-neutral-100 shadow-md">
                  Explorar Colección
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Controls */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + categories.length) % categories.length)}
          aria-label="Anterior"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md transition hover:bg-white/20 cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % categories.length)}
          aria-label="Siguiente"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md transition hover:bg-white/20 cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </section>

      {/* Categories Grid */}
      <section className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
        {categories.map((cat) => (
          <Link key={cat.name} to={cat.path} className="group relative aspect-square overflow-hidden rounded-3xl bg-neutral-100 border border-neutral-200 shadow-sm">
            <img 
              src={cat.image} 
              alt="" 
              loading="lazy"
              decoding="async"
              width="300"
              height="300"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            <div className="absolute inset-0 flex items-end gradient-to-t from-neutral-950/80 to-transparent p-6">
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">{cat.name}</h3>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
