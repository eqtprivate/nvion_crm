import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { isAdminRole } from '@/lib/modules';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SlidersHorizontal, Building2, Package, Users, UserRound, Percent,
  CheckCircle2, Circle, ArrowRight, X, Rocket,
} from 'lucide-react';

const STORAGE_PREFIX = 'nvion_onboarding_hidden:';

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const isAdmin = isAdminRole(user?.role);
  const storageKey = `${STORAGE_PREFIX}${empresa || 'global'}`;
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  const enabled = isAdmin && Boolean(empresa);
  const filterEmpresa = (items) => (items || []).filter((i) => i.empresa_vinculada === empresa);

  const { data: administradoras = [] } = useQuery({
    queryKey: ['accounts', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.Account.list('-created_date')),
  });
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtosConsorcio', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.ProdutoConsorcio.list('-created_date')),
  });
  const { data: equipes = [] } = useQuery({
    queryKey: ['equipes', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.EquipeComercial.list('-created_date')),
  });
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.Vendedores.list('-created_date')),
  });
  const { data: regras = [] } = useQuery({
    queryKey: ['regrasComissao', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.RegrasComissao.list('-created_date')),
  });
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => db.Empresa.list(),
    enabled: isAdmin && Boolean(user?.empresa_id),
  });

  const empresaRec = empresas.find((e) => e.id === user?.empresa_id);

  const steps = useMemo(() => [
    { key: 'empresa', title: 'Dados da empresa', desc: 'Preencha razão social, CNPJ e contato.', icon: SlidersHorizontal, path: 'Settings', done: Boolean(empresaRec?.cnpj) },
    { key: 'administradoras', title: 'Cadastrar administradoras', desc: 'As administradoras de consórcio com quem você opera.', icon: Building2, path: 'Accounts', done: administradoras.length > 0 },
    { key: 'produtos', title: 'Cadastrar produtos de consórcio', desc: 'Produtos vinculados às administradoras.', icon: Package, path: 'ProdutoConsorcio', done: produtos.length > 0 },
    { key: 'equipes', title: 'Montar equipes comerciais', desc: 'Times e líderes responsáveis.', icon: Users, path: 'EquipeComercial', done: equipes.length > 0 },
    { key: 'vendedores', title: 'Cadastrar vendedores', desc: 'Vendedores vinculados às equipes.', icon: UserRound, path: 'Vendedores', done: vendedores.length > 0 },
    { key: 'regras', title: 'Definir regras de comissão', desc: 'Percentuais e parcelamento por produto/administradora.', icon: Percent, path: 'RegrasComissao', done: regras.length > 0 },
  ], [empresaRec, administradoras.length, produtos.length, equipes.length, vendedores.length, regras.length]);

  if (!isAdmin || !empresa || hidden) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = doneCount === total;
  const proximo = steps.find((s) => !s.done);

  const dismiss = () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {allDone ? 'Configuração concluída! 🎉' : 'Primeiros passos'}
              </h2>
              <p className="text-sm text-gray-500">
                {allDone
                  ? 'Sua empresa está pronta para registrar leads, oportunidades e vendas.'
                  : 'Cadastre nesta ordem para deixar a operação pronta.'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600" onClick={dismiss} title="Ocultar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progresso */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{doneCount} de {total} concluídos</span>
            <span>{Math.round((doneCount / total) * 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
          </div>
        </div>

        {/* Passos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map((step, index) => {
            const isNext = !step.done && step.key === proximo?.key;
            return (
              <Link
                key={step.key}
                to={createPageUrl(step.path)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                  step.done
                    ? 'border-green-200 bg-green-50/60'
                    : isNext
                      ? 'border-primary/40 bg-white shadow-sm ring-1 ring-primary/20 hover:bg-primary/5'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                {step.done
                  ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${step.done ? 'text-green-800' : 'text-gray-900'}`}>
                    <span className="text-gray-400 mr-1">{index + 1}.</span>{step.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{step.desc}</p>
                </div>
                {!step.done && isNext && (
                  <span className="text-xs font-medium text-primary flex items-center gap-1 flex-shrink-0">
                    Começar <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
