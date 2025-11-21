import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Moon, Sun, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { AppSettings, InventoryItem, Movement, Page } from './types';
import { fetchInventoryData, fetchMovements } from './services/sheetService';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Consumption from './pages/Consumption';
import Alerts from './pages/Alerts';
import SettingsPage from './pages/Settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data States
  const [data, setData] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Configuração com Persistência no LocalStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('almox_settings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (e) {
        console.error("Erro ao ler configurações salvas", e);
      }
    }
    // Valores Padrão se não houver nada salvo
    return {
      inventoryUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?output=csv',
      inUrl: '', 
      outUrl: '', 
      refreshRate: 30, 
      darkMode: false,
    };
  });

  // Salva configurações sempre que mudarem
  useEffect(() => {
    localStorage.setItem('almox_settings', JSON.stringify(settings));
  }, [settings]);

  // Theme
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // --- DATA LOADING & MERGING ---
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Busca dados brutos em paralelo
      const [inventoryItems, inMoves, outMoves] = await Promise.all([
        fetchInventoryData(settings.inventoryUrl),
        settings.inUrl ? fetchMovements(settings.inUrl, 'entrada') : Promise.resolve([]),
        settings.outUrl ? fetchMovements(settings.outUrl, 'saida') : Promise.resolve([])
      ]);

      const allMoves = [...inMoves, ...outMoves].sort((a, b) => a.data.getTime() - b.data.getTime());
      setMovements(allMoves);

      // 2. Cruzamento de Dados (Merge)
      // Precisamos injetar o Fornecedor (das Entradas) e calcular totais (das movimentações)
      const enrichedItems = inventoryItems.map(item => {
        // Filtra movimentos deste item
        const itemMoves = allMoves.filter(m => m.codigo === item.codigo);
        
        // Calcula totais REAIS baseados no histórico (Abas Entrada/Saída) para estatísticas
        const totalInHistory = itemMoves.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.quantidade, 0);
        const totalOutHistory = itemMoves.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.quantidade, 0);

        // Valores que constam na planilha principal (Snapshot)
        const sheetStock = item.quantidadeAtual;
        const sheetIn = item.entradas; 
        const sheetOut = item.saidas;

        // Tenta encontrar fornecedor na última entrada registrada
        const lastEntry = [...inMoves]
          .filter(m => m.codigo === item.codigo && m.fornecedor)
          .sort((a, b) => b.data.getTime() - a.data.getTime())[0];

        // Encontra data da última movimentação qualquer
        const lastMove = itemMoves[itemMoves.length - 1];

        return {
          ...item,
          // IMPORTANTE: Retornando exatamente o valor da planilha principal para Estoque Atual
          // Removemos a lógica de cálculo compensatório para evitar confusão.
          quantidadeAtual: sheetStock,
          
          // Se não tiver na planilha principal, usa do histórico
          fornecedor: item.fornecedor || lastEntry?.fornecedor || '', 
          
          // Para estatísticas de fluxo, priorizamos o histórico real se existir, senão usa a planilha
          entradas: totalInHistory > 0 ? totalInHistory : sheetIn,
          saidas: totalOutHistory > 0 ? totalOutHistory : sheetOut,
          
          // Atualiza valor total baseado no estoque da planilha
          valorTotal: sheetStock * item.valorUnitario,

          // Mesma lógica para data: usa a última calculada ou a que veio da planilha
          ultimaMovimentacao: lastMove?.data || item.ultimaMovimentacao
        };
      });

      setData(enrichedItems);
      setLastUpdated(new Date());

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, settings.refreshRate * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.inventoryUrl, settings.inUrl, settings.outUrl, settings.refreshRate]);

  // Stats
  const stats = useMemo(() => {
    return {
      totalItems: data.length,
      totalValue: data.reduce((acc, item) => acc + item.valorTotal, 0),
      totalIn: data.reduce((acc, item) => acc + item.entradas, 0),
      totalOut: data.reduce((acc, item) => acc + item.saidas, 0),
    };
  }, [data]);

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard data={data} stats={stats} movements={movements} />;
      case Page.INVENTORY:
        return <Inventory data={data} />;
      case Page.CONSUMPTION:
        return <Consumption data={data} />;
      case Page.ALERTS:
        return <Alerts data={data} />;
      case Page.SETTINGS:
        return <SettingsPage settings={settings} onUpdateSettings={setSettings} />;
      default:
        return <Dashboard data={data} stats={stats} movements={movements} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark overflow-hidden font-sans">
      <div className="app-sidebar">
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={setCurrentPage} 
          isOpen={isSidebarOpen}
          toggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="app-header bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 no-print">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="ml-4 lg:ml-0 text-lg font-semibold text-slate-800 dark:text-white truncate">
              {currentPage === Page.DASHBOARD && 'Visão Geral'}
              {currentPage === Page.INVENTORY && 'Inventário Geral'}
              {currentPage === Page.CONSUMPTION && 'Análise de Consumo'}
              {currentPage === Page.ALERTS && 'Alertas de Estoque'}
              {currentPage === Page.SETTINGS && 'Configurações'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
               <span className="text-xs text-slate-500 dark:text-slate-400">Última atualização</span>
               <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                 {lastUpdated.toLocaleTimeString()}
               </span>
            </div>
            <button 
              onClick={loadData} 
              className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isLoading ? 'animate-spin' : ''}`}
              title="Forçar atualização"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main className="app-content-wrapper flex-1 overflow-y-auto bg-gray-50 dark:bg-dark p-4 sm:p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;