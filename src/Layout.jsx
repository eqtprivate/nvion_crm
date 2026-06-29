import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Percent,
  UserRound,
  Database
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
} from "@/components/ui/dropdown-menu";

const NVION_ICON_URL = 'https://media.base44.com/images/public/6a408d646f21968247407e53/116da3a6e_nvion_logo_transp.png';

export default function Layout({ children, currentPageName }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user: currentUser, logout } = useAuth();
  const location = useLocation();

  const allMenuItems = [
    { name: 'Painel Geral', icon: LayoutDashboard, path: 'Dashboard' },
    { name: 'Prospecção', icon: Target, path: 'Leads' },
    { name: 'Oportunidades', icon: TrendingUp, path: 'Oportunidades' },
    { name: 'Clientes', icon: Users, path: 'Contacts' },
    { name: 'Administradoras', icon: Building2, path: 'Accounts' },
    { name: 'Produtos de Consórcio', icon: Package, path: 'ProdutoConsorcio' },
    { name: 'Equipes Comerciais', icon: UserCircle, path: 'EquipeComercial' },
    { name: 'Vendedores', icon: UserRound, path: 'Vendedores' },
    { name: 'Vendas de Consórcio', icon: ReceiptText, path: 'VendasConsorcio' },
    { name: 'Regras de Comissão', icon: Percent, path: 'RegrasComissao' },
    { name: 'Relatórios Gerenciais', icon: BarChart3, path: 'Reports' }
  ];

  const allBottomMenuItems = [
    { name: 'Configurações', icon: Settings, path: 'Settings' },
    { name: 'Dados de Teste', icon: Database, path: 'DadosTeste' },
    { name: 'Gestão de Acessos', icon: ShieldCheck, path: 'GestaoAcessos' }
  ];

  const modulosPermitidos = currentUser?.modulos_permitidos;
  const hasModules = modulosPermitidos && modulosPermitidos.length > 0;
  const isAdmin = isAdminRole(currentUser?.role);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const accessLabel = isSuperAdmin
    ? 'SUPERADMIN (acesso a todas)'
    : (currentUser?.empresa_vinculada || 'Empresa não definida');

  const menuItems = allMenuItems.filter((item) =>
    isSuperAdmin || !hasModules || modulosPermitidos.includes(item.path)
  );

  const bottomMenuItems = allBottomMenuItems.filter((item) => {
    if (item.path === 'GestaoAcessos' || item.path === 'DadosTeste') {
      if (!isAdmin) return false;
      return isSuperAdmin || !hasModules || modulosPermitidos.includes(item.path);
    }
    return isSuperAdmin || !hasModules || modulosPermitidos.includes(item.path);
  });

  const isActive = (itemName) => currentPageName === itemName;

  const SidebarContent = () => (
    <>
      <div className="h-20 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0 w-full">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-sidebar-border flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={NVION_ICON_URL} alt="NVION" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40 leading-none mb-1">Acesso</p>
            <p title={accessLabel} className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
              {accessLabel}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 flex flex-col overflow-y-auto">
        <div className="space-y-0.5">
          {menuItems.map((item) => (
            <Link key={item.name} to={createPageUrl(item.path)} onClick={() => setMobileSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive(item.path) ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`}>
              <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive(item.path) ? 'text-sidebar-primary-foreground' : ''}`} />
              <span className="text-sm">{item.name}</span>
            </Link>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-sidebar-border space-y-0.5">
          {bottomMenuItems.map((item) => (
            <Link key={item.name} to={createPageUrl(item.path)} onClick={() => setMobileSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive(item.path) ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`}>
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="text-sm">{item.name}</span>
            </Link>
          ))}
          <p className="text-[10px] text-sidebar-foreground/30 text-center pt-3 pb-1 select-none">NVION v{APP_VERSION}</p>
        </div>
      </nav>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden md:flex w-64 bg-sidebar flex-col fixed inset-y-0 left-0 z-30"><SidebarContent /></div>
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar flex-col flex">
            <button className="absolute top-5 right-4 text-sidebar-foreground hover:text-white" onClick={() => setMobileSidebarOpen(false)}><X className="w-5 h-5" /></button>
            <SidebarContent />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
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
