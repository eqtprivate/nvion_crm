import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Alterna entre claro/escuro. Usa next-themes (persiste em localStorage e
// respeita o sistema quando o usuário nunca escolheu).
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita mismatch de hidratação: só renderiza o ícone após montar.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-gray-600 dark:text-gray-300"
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {mounted && isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </Button>
  );
}
