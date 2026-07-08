import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

// Palette de navegação rápida (Cmd/Ctrl+K).
// `sections` é a mesma estrutura de menu do Layout: [{ label, items:[{name, icon, path}] }].
export default function CommandPalette({ open, setOpen, sections = [] }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const go = (path) => {
    setOpen(false);
    navigate(createPageUrl(path));
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar páginas… (Ctrl/Cmd + K)" />
      <CommandList>
        <CommandEmpty>Nenhuma página encontrada.</CommandEmpty>
        {sections.map((sec) => (
          <CommandGroup key={sec.label} heading={sec.label}>
            {sec.items.map((item) => (
              <CommandItem key={item.path} value={`${item.name} ${sec.label}`} onSelect={() => go(item.path)}>
                {item.icon && <item.icon className="w-4 h-4 mr-2 text-muted-foreground" />}
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
