import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOnboarding } from '@/lib/useOnboarding';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, X } from 'lucide-react';

const STORAGE_PREFIX = 'nvion_onboarding_hidden:';

// Banner discreto no Painel que leva à página de Boas-vindas enquanto a
// configuração inicial não está completa. Some quando concluído ou ocultado.
export default function OnboardingBanner() {
  const { isAdmin, empresa, doneCount, total, allDone, proximo } = useOnboarding();
  const storageKey = `${STORAGE_PREFIX}${empresa || 'global'}`;
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  if (!isAdmin || !empresa || allDone || hidden) return null;

  const dismiss = () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Rocket className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100">Complete a configuração da sua empresa</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {doneCount} de {total} concluídos{proximo ? ` · próximo: ${proximo.title}` : ''}
        </p>
      </div>
      <Button asChild size="sm" className="flex-shrink-0">
        <Link to={createPageUrl('BoasVindas')}>Continuar <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
      </Button>
      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 dark:text-gray-300 flex-shrink-0" onClick={dismiss} title="Ocultar">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
