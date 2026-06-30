import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard,
  Users,
  Target,
  TrendingUp,
  Building2,
  BarChart3,
  ChevronDown,
  Search,
  Bell,
  Settings,
  ShieldCheck,
  UserCircle,
  Menu,
  X,
  Package,
  ReceiptText,
  HandCoins,
  FileCheck,
  Percent,
  UserRound,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { isAdminRole } from '@/lib/modules';
import { APP_VERSION } from '@/lib/version';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NVION_ICON_URL = 'https://media.base44.com/images/public/6a408d646f21968247407e53/116da3a6e_nvion_logo_transp.png';
const SIDEBAR_STORAGE_KEY = 'nvion_sidebar_collapsed';

export default function Layout({ children, currentPageName }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });
  const { user: currentUser, logout } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const modulosPermitidos = currentUser?.modulos_permitidos;
  const hasModules = modulosPermitidos && modulosPermitidos.length > 0;
  const isAdmin = isAdminRole(currentUser?.role);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const accessLabel = isSuperAdmin
    ? 'SUPERADMIN (acesso a todas)'
    : (currentUser?.empresa_vinculada || 'Empresa não definida');

  const hasModuleAccess = (path) => isAdmin || !hasModules || modulosPermitidos.includes(path);

  const menuGroups = useMemo(() => [
    {
      label: 'Visão Geral',
      items: [
        { name: 'Painel Geral', icon: LayoutDashboard, path: 'Dashboard' },
        { name: 'Relatórios Gerenciais', icon: BarChart3, path: 'Reports' },
      ],
    },
    {
      label: 'Comercial',
      items: [
        { name: 'Prospecção', icon: Target, path: 'Leads' },
        { name: 'Oportunidades', icon: TrendingUp, path: 'Oportunidades' },
        { name: 'Clientes', icon: Users, path: 'Contacts' },
      ],
    },
    {
      label: 'Operação de Consórcio',
      items: [
        { name: 'Vendas de Consórcio', icon: ReceiptText, path: 'VendasConsorcio' },
        { name: 'Comissões', icon: HandCoins, path: 'Comissoes' },
        { name: 'Conciliação', icon: FileCheck, path: 'ConciliacaoAdministradora' },
      ],
    },
    {
      label: 'Cadastros',
      items: [
        { name: 'Administradoras', icon: Building2, path: 'Accounts' },
        { name: 'Produtos de Consórcio', icon: Package, path: 'ProdutoConsorcio' },
        { name: 'Equipes Comerciais', icon: UserCircle, path: 'EquipeComercial' },
        { name: 'Vendedores', icon: UserRound, path: 'Vendedores' },
        { name: 'Regras de Comissão', icon: Percent, path: 'RegrasComissao' },
      ],
    },
    {
      label: 'Administração',
      items: [
        { name: 'Configurações', icon: Settings, path: 'Settings' },
        { name: 'Dados de Teste', icon: Database, path: 'DadosTeste', adminOnly: true },
        { name: 'Gestão de Acessos', icon: ShieldCheck, path: 'GestaoAcessos', adminOnly: true },
      ],
    },
  ], []);

  const visibleMenuGroups = useMemo(() => menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        return hasModuleAccess(item.path);
      }),
    }))
    .filter((group) => group.items.length > 0), [menuGroups, isAdmin, hasModules, modulosPermitidos]);

  const isActive = (itemName) => currentPageName === itemName;

  const SidebarContent = ({ mobile = false }) => {
    const collapsed = !mobile && sidebarCollapsed;

    return (
      <>
        <div className={`h-20 flex items-center border-b border-sidebar-border ${collapsed ? 'justify-center px-3' : 'px-4'}`}>
          <div className={`flex items-center min-w-0 w-full ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div title={accessLabel} className="w-10 h-10 rounded-xl bg-white/5 border border-sidebar-border flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={NVION_ICON_URL} alt="NVION" className="h-7 w-7 object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40 leading-none mb-1">Acesso</p>
                <p title={accessLabel} className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {accessLabel}
                </p>
              </div>
            )}
            {!mobile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                className="text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent flex-shrink-0"
                onClick={() => setSidebarCollapsed((value) => !value)}
              >
                {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>

        <nav className={`flex-1 py-4 flex flex-col overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          <div className="space-y-3">
            {visibleMenuGroups.map((group, groupIndex) => (
              <div key={group.label} className={groupIndex > 0 ? 'pt-2 border-t border-sidebar-border/70' : ''}>
                {!collapsed && (
                  <p className="px-4 pb-1 text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/35">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.path)}
                      title={collapsed ? item.name : undefined}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5'} ${isActive(item.path) ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`}
                    >
                      <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive(item.path) ? 'text-sidebar-primary-foreground' : ''}`} />
                      {!collapsed && <span className="text-sm truncate">{item.name}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className={`text-[10px] text-sidebar-foreground/30 pt-4 pb-1 select-none ${collapsed ? 'text-center' : 'text-center'}`}>
            {collapsed ? `v${APP_VERSION}` : `NVION v${APP_VERSION}`}
          </p>
        </nav>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <div className={`hidden md:flex bg-sidebar flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent />
      </div>
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar flex-col flex">
            <button className="absolute top-5 right-4 text-sidebar-foreground hover:text-white" onClick={() => setMobileSidebarOpen(false)}><X className="w-5 h-5" /></button>
            <SidebarContent mobile />
          </div>
        </div>
      )}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
            <div className="hidden sm:flex flex-1 max-w-md"><div className="relative w-full"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar no sistema..." className="pl-9 bg-gray-50 border-gray-200 h-9 text-sm" /></div></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="text-gray-600 relative"><Bell className="w-[18px] h-[18px]" /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="flex items-center gap-1.5 sm:gap-2 px-2"><Avatar className="w-8 h-8">{currentUser?.profile_picture ? <img src={currentUser.profile_picture} alt="Perfil" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">{currentUser?.display_name ? currentUser.display_name.charAt(0).toUpperCase() : currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase() || 'N'}</div>}</Avatar><span className="text-sm font-medium text-gray-700 hidden lg:inline">{currentUser?.display_name || currentUser?.full_name || 'Usuário'}</span><ChevronDown className="w-4 h-4 text-gray-400" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to={createPageUrl('Profile')}>Meu Perfil</Link></DropdownMenuItem><DropdownMenuItem onClick={logout}>Sair</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
