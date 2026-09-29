import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ThemeToggle = ({ className }: { className?: string }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeDark = saved === 'dark' || (!saved && systemDark);
    setIsDark(activeDark);
    document.documentElement.classList.toggle('dark', activeDark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('app_theme', next ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "p-2 rounded-xl text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-[#1a1a20] hover:bg-zinc-200 dark:hover:bg-[#26262e] border border-zinc-200 dark:border-[#26262e] transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-xs shrink-0",
        className
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />}
    </button>
  );
};
