
import React from 'react';
import { LayoutDashboard, Package, TrendingDown, ClipboardList, AlertTriangle, Settings, Layers, Factory, List } from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  toggleOpen: () => void;
  isCentral?: boolean;
  isProduction?: boolean;
  isMaster?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, toggleOpen, isCentral, isProduction, isMaster }) => {
  const menuItems = [];
  
  if (isCentral) {
    menuItems.push({ id: Page.CENTRAL_DASHBOARD, label: 'Indicadores de Perfil', icon: LayoutDashboard });
    menuItems.push({ id: Page.CENTRAL_PERFIL, label: 'Perfis', icon: Layers });
  } else if (isProduction) {
    menuItems.push({ id: Page.PRODUCTION_DASHBOARD, label: 'Painel de Produção', icon: Factory });
    menuItems.push({ id: Page.PRODUCTION_DETAILS, label: 'Detalhamento Diário', icon: List });
  } else {
    menuItems.push({ id: Page.DASHBOARD, label: 'Visão Geral', icon: LayoutDashboard });
    menuItems.push({ id: Page.INVENTORY, label: 'Inventário', icon: Package });
    menuItems.push({ id: Page.CONSUMPTION, label: 'Consumo', icon: TrendingDown });
    menuItems.push({ id: Page.SERVICE_ORDERS, label: 'Ordem de Serviço', icon: ClipboardList });
    menuItems.push({ id: Page.ALERTS, label: 'Alertas', icon: AlertTriangle });
  }

  if (isMaster) {
    menuItems.push({ id: Page.SETTINGS, label: 'Configurações', icon: Settings });
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={toggleOpen} />
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} no-print`}>
        <div className="h-full flex flex-col">
          <div className="py-6 px-6 border-b border-gray-200 dark:border-gray-700 flex justify-center items-center font-black text-xl tracking-tighter uppercase">ALUMASA</div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { onNavigate(item.id); if (window.innerWidth < 1024) toggleOpen(); }} 
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
