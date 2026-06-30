import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePlanos() {
  return useQuery({
    queryKey: ['planos'],
    queryFn: () => base44.entities.Plano.list('-created_date'),
    staleTime: 1000 * 60 * 5,
  });
}

export function maxUsuarios(plano) {
  if (!plano) return Infinity;
  return plano.max_usuarios === 0 ? Infinity : plano.max_usuarios;
}
