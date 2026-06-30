import Accounts from './pages/Accounts';
import Comissoes from './pages/Comissoes';
import ConciliacaoAdministradora from './pages/ConciliacaoAdministradora';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import DadosTeste from './pages/DadosTeste';
import EquipeComercial from './pages/EquipeComercial';
import Leads from './pages/Leads';
import Oportunidades from './pages/Oportunidades';
import ProdutoConsorcio from './pages/ProdutoConsorcio';
import Recebiveis from './pages/Recebiveis';
import RegrasComissao from './pages/RegrasComissao';
import VendasConsorcio from './pages/VendasConsorcio';
import Vendedores from './pages/Vendedores';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import GestaoAcessos from './pages/GestaoAcessos';
import GestaoEmpresas from './pages/GestaoEmpresas';
import __Layout from './Layout.jsx';

export const PAGES = {
  Accounts,
  Comissoes,
  ConciliacaoAdministradora,
  Contacts,
  Dashboard,
  DadosTeste,
  EquipeComercial,
  Leads,
  Oportunidades,
  ProdutoConsorcio,
  Recebiveis,
  RegrasComissao,
  VendasConsorcio,
  Vendedores,
  Profile,
  Reports,
  Settings,
  GestaoAcessos,
  GestaoEmpresas,
};

export const pagesConfig = {
  mainPage: 'Dashboard',
  Pages: PAGES,
  Layout: __Layout,
};
