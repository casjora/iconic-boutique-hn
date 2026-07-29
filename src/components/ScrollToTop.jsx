import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 250) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Ir al inicio"
      title="Volver arriba"
      className="fixed bottom-6 right-6 z-50 p-3 bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 border border-neutral-700/30 dark:border-amber-300/50 cursor-pointer flex items-center justify-center group"
    >
      <ArrowUp className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
