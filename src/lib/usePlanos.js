import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
export function usePlanos() {
  return useQuery({
    queryKey: ['planos'],
    queryFn: () => db.Plano.list('-created_date'),
    staleTime: 1000 * 60 * 5,
  });
}

export function maxUsuarios(plano) {
  if (!plano) return Infinity;
  return plano.max_usuarios === 0 ? Infinity : plano.max_usuarios;
}
