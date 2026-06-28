/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 */
import Accounts from './pages/Accounts';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import EquipeComercial from './pages/EquipeComercial';
import Leads from './pages/Leads';
import Oportunidades from './pages/Oportunidades';
import ProdutoConsorcio from './pages/ProdutoConsorcio';
import RegrasComissao from './pages/RegrasComissao';
import VendasConsorcio from './pages/VendasConsorcio';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import GestaoAcessos from './pages/GestaoAcessos';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Accounts": Accounts,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "EquipeComercial": EquipeComercial,
    "Leads": Leads,
    "Oportunidades": Oportunidades,
    "ProdutoConsorcio": ProdutoConsorcio,
    "RegrasComissao": RegrasComissao,
    "VendasConsorcio": VendasConsorcio,
    "Profile": Profile,
    "Reports": Reports,
    "Settings": Settings,
    "GestaoAcessos": GestaoAcessos,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};