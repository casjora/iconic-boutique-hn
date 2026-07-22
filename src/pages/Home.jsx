import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const categories = [
  { name: 'For Men', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800' },
  { name: 'For Women', image: 'https://images.unsplash.com/photo-1629198688000-7a3d3c23389c?auto=format&fit=crop&q=80&w=800' },
  { name: 'Gift Sets', image: 'https://images.unsplash.com/photo-1544813545-052d34464521?auto=format&fit=crop&q=80&w=800' },
  { name: 'Best Sellers', image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800' }
];

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % categories.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Carousel */}
      <section className="relative h-[80vh] w-full overflow-hidden rounded-3xl bg-neutral-900 shadow-2xl">
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
              src={categories[currentIndex].image}
              alt={categories[currentIndex].name}
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight"
              >
                {categories[currentIndex].name}
              </motion.h2>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
              >
                <Link to="/catalog" className="rounded-full bg-white px-8 py-4 text-sm font-bold text-neutral-950 transition hover:bg-neutral-100">
                  Explorar Colección
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Controls */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + categories.length) % categories.length)}
          className="absolute left-4 top-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % categories.length)}
          className="absolute right-4 top-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <ChevronRight />
        </button>
      </section>

      {/* Categories Grid */}
      <section className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {categories.map((cat) => (
          <Link key={cat.name} to="/catalog" className="group relative aspect-square overflow-hidden rounded-3xl bg-neutral-100">
            <img src={cat.image} alt={cat.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-6">
              <h3 className="font-display text-lg font-bold text-white">{cat.name}</h3>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}