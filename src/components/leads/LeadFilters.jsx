import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ORIGENS, TEMPERATURAS, LEAD_STATUSES } from '../forms/LeadDialog';

export default function LeadFilters({ filters, onFilterChange, onClearFilters }) {
  const [open, setOpen] = React.useState(false);
  const hasActive = Object.values(filters).some(v => v && v !== 'all');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filtros {hasActive && <span className="ml-1 w-2 h-2 rounded-full bg-primary inline-block" />}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Status</label><Select value={filters.status} onValueChange={v => onFilterChange('status', v)}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-1 block">Origem</label><Select value={filters.origem} onValueChange={v => onFilterChange('origem', v)}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{ORIGENS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-1 block">Temperatura</label><Select value={filters.temperatura} onValueChange={v => onFilterChange('temperatura', v)}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{TEMPERATURAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <Button variant="outline" className="w-full" onClick={() => { onClearFilters(); setOpen(false); }}><X className="w-4 h-4 mr-2" />Limpar Filtros</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}