import Accounts from './pages/Accounts';
import Campanhas from './pages/Campanhas';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import DadosTeste from './pages/DadosTeste';
import EquipeComercial from './pages/EquipeComercial';
import Leads from './pages/Leads';
import Oportunidades from './pages/Oportunidades';
import ProdutoConsorcio from './pages/ProdutoConsorcio';
import RegrasComissao from './pages/RegrasComissao';
import VendasConsorcio from './pages/VendasConsorcio';
import Comissoes from './pages/Comissoes';
import ConciliacaoAdministradora from './pages/ConciliacaoAdministradora';
import Recebiveis from './pages/Recebiveis';
import PainelRecebiveis from './pages/PainelRecebiveis';
import BoasVindas from './pages/BoasVindas';
import RedefinirSenha from './pages/RedefinirSenha';
import Vendedores from './pages/Vendedores';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import GestaoAcessos from './pages/GestaoAcessos';
import GestaoPlanos from './pages/GestaoPlanos';
import GestaoEmpresas from './pages/GestaoEmpresas';
import GestaoEmailTemplates from './pages/GestaoEmailTemplates';
import GestaoLogs from './pages/GestaoLogs';
import __Layout from './Layout.jsx';

export const PAGES = {
  Accounts,
  Campanhas,
  Contacts,
  Dashboard,
  DadosTeste,
  EquipeComercial,
  Leads,
  Oportunidades,
  ProdutoConsorcio,
  RegrasComissao,
  VendasConsorcio,
  Comissoes,
  ConciliacaoAdministradora,
  Recebiveis,
  PainelRecebiveis,
  BoasVindas,
  RedefinirSenha,
  Vendedores,
  Profile,
  Reports,
  Settings,
  GestaoAcessos,
  GestaoPlanos,
  GestaoEmpresas,
  GestaoEmailTemplates,
  GestaoLogs,
};

export const pagesConfig = {
  mainPage: 'Dashboard',
  Pages: PAGES,
  Layout: __Layout,
};
