import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useOnboarding } from '@/lib/useOnboarding';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Rocket, ShieldAlert, Sparkles } from 'lucide-react';
import ProgressRing from '@/components/ProgressRing';

export default function BoasVindas() {
  const { user } = useAuth();
  const { isAdmin, empresa, steps, doneCount, total, allDone, proximo } = useOnboarding();

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Página restrita</p>
          <p className="text-sm text-gray-400">A configuração inicial é feita pelo administrador da empresa.</p>
        </div>
      </div>
    );
  }

  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Bem-vindo(a){user?.display_name ? `, ${user.display_name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Vamos preparar a operação da {empresa ? <strong>{empresa}</strong> : 'sua empresa'} em alguns passos.
                Siga a ordem abaixo — cada item é marcado automaticamente conforme você cadastra.
              </p>
            </div>
            <div className="hidden sm:block flex-shrink-0">
              <ProgressRing value={pct} size={72} stroke={7} />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1.5">
              <span className="font-medium">{doneCount} de {total} concluídos</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white dark:bg-card/70 overflow-hidden border border-primary/10">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {!allDone && proximo && (
            <div className="mt-5">
              <Button asChild>
                <Link to={createPageUrl(proximo.path)}>
                  Continuar: {proximo.title} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {allDone && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-4 text-green-800 dark:text-green-300">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Configuração concluída! Sua empresa está pronta para registrar leads, oportunidades e vendas.
            </p>
          </div>
        )}

        {/* Passos */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isNext = !step.done && step.key === proximo?.key;
            const Icon = step.icon;
            return (
              <Card
                key={step.key}
                className={`transition-all ${step.done ? 'border-green-200 dark:border-green-900/60 bg-green-50/50 dark:bg-green-950/20' : isNext ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center flex-shrink-0">
                    {step.done
                      ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                      : <Circle className="w-6 h-6 text-gray-300" />}
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-100 dark:bg-muted'}`}>
                    <Icon className={`w-5 h-5 ${step.done ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      <span className="text-gray-400 mr-1.5">{index + 1}.</span>{step.title}
                      {step.done && <span className="ml-2 text-xs font-medium text-green-700 dark:text-green-400">Concluído</span>}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
                  </div>
                  <Button asChild variant={step.done ? 'ghost' : isNext ? 'default' : 'outline'} size="sm" className="flex-shrink-0">
                    <Link to={createPageUrl(step.path)}>
                      {step.done ? 'Revisar' : 'Cadastrar'}
                      {!step.done && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 text-center pt-2">
          Depois desses passos, use <strong>Prospecção</strong> → <strong>Oportunidades</strong> → <strong>Vendas de Consórcio</strong>.
          Comissões e recebíveis são gerados automaticamente.
        </p>
      </div>
    </div>
  );
}
