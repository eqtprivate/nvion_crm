import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { isAdminRole } from '@/lib/modules';
import {
  SlidersHorizontal, Building2, Package, Users, UserRound, Percent, UserPlus,
} from 'lucide-react';

// Passos de configuração inicial (ordem por dependência do domínio de consórcio).
// Cada passo detecta conclusão sozinho por contagem de registros da empresa.
export function useOnboarding() {
  const { user } = useAuth();
  const empresa = user?.empresa_vinculada;
  const isAdmin = isAdminRole(user?.role);
  const enabled = isAdmin && Boolean(empresa);
  const filterEmpresa = (items) => (items || []).filter((i) => i.empresa_vinculada === empresa);

  const administradoras = useQuery({
    queryKey: ['accounts', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.Account.list('-created_date')),
  }).data || [];
  const produtos = useQuery({
    queryKey: ['produtosConsorcio', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.ProdutoConsorcio.list('-created_date')),
  }).data || [];
  const equipes = useQuery({
    queryKey: ['equipes', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.EquipeComercial.list('-created_date')),
  }).data || [];
  const vendedores = useQuery({
    queryKey: ['vendedores', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.Vendedores.list('-created_date')),
  }).data || [];
  const regras = useQuery({
    queryKey: ['regrasComissao', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.RegrasComissao.list('-created_date')),
  }).data || [];
  const usuarios = useQuery({
    queryKey: ['usuariosAcesso', empresa], enabled,
    queryFn: async () => filterEmpresa(await db.UsuarioAcesso.list()),
  }).data || [];
  const empresas = useQuery({
    queryKey: ['empresas'], enabled: isAdmin && Boolean(user?.empresa_id),
    queryFn: () => db.Empresa.list(),
  }).data || [];

  const empresaRec = empresas.find((e) => e.id === user?.empresa_id);

  const steps = useMemo(() => [
    { key: 'empresa', title: 'Dados da empresa', desc: 'Preencha razão social, CNPJ e contato.', icon: SlidersHorizontal, path: 'Settings', done: Boolean(empresaRec?.cnpj) },
    { key: 'administradoras', title: 'Cadastrar administradoras', desc: 'As administradoras de consórcio com quem você opera.', icon: Building2, path: 'Accounts', done: administradoras.length > 0 },
    { key: 'produtos', title: 'Cadastrar produtos de consórcio', desc: 'Produtos vinculados às administradoras.', icon: Package, path: 'ProdutoConsorcio', done: produtos.length > 0 },
    { key: 'equipes', title: 'Montar equipes comerciais', desc: 'Times e líderes responsáveis.', icon: Users, path: 'EquipeComercial', done: equipes.length > 0 },
    { key: 'vendedores', title: 'Cadastrar vendedores', desc: 'Vendedores vinculados às equipes.', icon: UserRound, path: 'Vendedores', done: vendedores.length > 0 },
    { key: 'regras', title: 'Definir regras de comissão', desc: 'Percentuais e parcelamento por produto/administradora.', icon: Percent, path: 'RegrasComissao', done: regras.length > 0 },
    { key: 'usuarios', title: 'Convidar usuários da equipe', desc: 'Crie acessos para líderes, vendedores e gestores.', icon: UserPlus, path: 'GestaoAcessos', done: usuarios.length > 1 },
  ], [empresaRec, administradoras.length, produtos.length, equipes.length, vendedores.length, regras.length, usuarios.length]);

  const doneCount = steps.filter((s) => s.done).length;

  return {
    isAdmin,
    empresa,
    steps,
    doneCount,
    total: steps.length,
    allDone: doneCount === steps.length,
    proximo: steps.find((s) => !s.done) || null,
  };
}
