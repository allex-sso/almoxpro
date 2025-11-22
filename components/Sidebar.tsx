import React from 'react';
import { LayoutDashboard, Package, TrendingDown, AlertTriangle, Settings, Box } from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  toggleOpen: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, toggleOpen }) => {
  const menuItems = [
    { id: Page.DASHBOARD, label: 'Visão Geral', icon: LayoutDashboard },
    { id: Page.INVENTORY, label: 'Inventário', icon: Package },
    { id: Page.CONSUMPTION, label: 'Consumo', icon: TrendingDown },
    { id: Page.ALERTS, label: 'Alertas', icon: AlertTriangle },
    { id: Page.SETTINGS, label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleOpen}
      />

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} no-print`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
            <Box className="w-8 h-8 text-primary mr-3" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">AlmoxPro</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (window.innerWidth < 1024) toggleOpen();
                  }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary dark:text-blue-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status da Conexão</p>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">Online (Sync Auto)</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;