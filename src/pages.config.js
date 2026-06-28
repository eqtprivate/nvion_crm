import Accounts from './pages/Accounts';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import DadosTeste from './pages/DadosTeste';
import EquipeComercial from './pages/EquipeComercial';
import Leads from './pages/Leads';
import Oportunidades from './pages/Oportunidades';
import ProdutoConsorcio from './pages/ProdutoConsorcio';
import RegrasComissao from './pages/RegrasComissao';
import VendasConsorcio from './pages/VendasConsorcio';
import Vendedores from './pages/Vendedores';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import GestaoAcessos from './pages/GestaoAcessos';
import __Layout from './Layout.jsx';

export const PAGES = {
  Accounts,
  Contacts,
  Dashboard,
  DadosTeste,
  EquipeComercial,
  Leads,
  Oportunidades,
  ProdutoConsorcio,
  RegrasComissao,
  VendasConsorcio,
  Vendedores,
  Profile,
  Reports,
  Settings,
  GestaoAcessos,
};

export const pagesConfig = {
  mainPage: 'Dashboard',
  Pages: PAGES,
  Layout: __Layout,
};