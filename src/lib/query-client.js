import { QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

function messageFromError(error) {
  const raw = error?.message || error?.error_description || '';
  const lower = String(raw).toLowerCase();
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Você não tem permissão para esta operação.';
  }
  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'Registro duplicado: já existe um item com esses dados.';
  }
  if (lower.includes('violates') && lower.includes('not-null')) {
    return 'Preencha todos os campos obrigatórios antes de salvar.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }
  return raw || 'Não foi possível concluir a operação. Tente novamente.';
}

// Handler global: qualquer mutação que falhe e NÃO trate o erro localmente
// (onError próprio) recebe um toast padrão, evitando falhas silenciosas.
const mutationCache = new MutationCache({
  onError: (error, _vars, _ctx, mutation) => {
    if (mutation.options.onError) return; // a tela já cuida do feedback
    toast.error(messageFromError(error));
  },
});

export const queryClientInstance = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
