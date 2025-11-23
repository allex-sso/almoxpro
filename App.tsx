
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
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false); // Carregamento inicial/manual (tela cheia)
  const [isSyncing, setIsSyncing] = useState(false); // Sincronização em background (discreto)

  // Configuração com Persistência Robusta e Suporte a Variáveis de Ambiente
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Tenta ler variáveis de ambiente (Vercel) ou usa strings vazias
    const envInventory = (import.meta as any).env?.VITE_INVENTORY_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?output=csv';
    const envIn = (import.meta as any).env?.VITE_IN_URL || '';
    const envOut = (import.meta as any).env?.VITE_OUT_URL || '';

    const defaultSettings: AppSettings = {
      inventoryUrl: envInventory,
      inUrl: envIn, 
      outUrl: envOut, 
      refreshRate: 30, 
      darkMode: false,
    };

    const savedSettings = localStorage.getItem('almox_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        
        // Lógica inteligente: 
        // Se o usuário nunca salvou um link específico, mas existe uma variável de ambiente, usa a variável.
        // Se o usuário salvou algo, respeita o salvo (override).
        return { 
          ...defaultSettings, 
          ...parsed,
          inventoryUrl: parsed.inventoryUrl || defaultSettings.inventoryUrl,
          inUrl: parsed.inUrl || defaultSettings.inUrl,
          outUrl: parsed.outUrl || defaultSettings.outUrl,
        };
      } catch (e) {
        console.error("Erro ao ler configurações salvas", e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('almox_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Helper para limpar código e garantir match (remove espaços, etc)
  const cleanCode = (code: string) => code.trim().toLowerCase().replace(/\s/g, '');

  // --- DATA LOADING & MERGING ---
  // isBackground = true significa que é uma atualização automática (não mostra loading screen)
  const loadData = async (isBackground = false) => {
    if (isBackground) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [inventoryItems, inMoves, outMoves] = await Promise.all([
        fetchInventoryData(settings.inventoryUrl),
        settings.inUrl ? fetchMovements(settings.inUrl, 'entrada') : Promise.resolve([]),
        settings.outUrl ? fetchMovements(settings.outUrl, 'saida') : Promise.resolve([])
      ]);

      const allMoves = [...inMoves, ...outMoves].sort((a, b) => a.data.getTime() - b.data.getTime());
      setMovements(allMoves);

      // Processamento dos itens
      const enrichedItems = inventoryItems.map(item => {
        const itemCodeClean = cleanCode(item.codigo);
        
        // Filtra movimentos correspondentes
        const itemMoves = allMoves.filter(m => cleanCode(m.codigo) === itemCodeClean);
        
        // Histórico de Entradas
        const entriesDescending = inMoves
            .filter(m => cleanCode(m.codigo) === itemCodeClean)
            .sort((a, b) => b.data.getTime() - a.data.getTime()); // Mais recente primeiro

        // SMART STOCK: Cálculo para compensar LAG do Google Sheets (Opcional, mas mantido para robustez)
        const histIn = itemMoves.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.quantidade, 0);
        const histOut = itemMoves.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.quantidade, 0);
        
        // 1. Lógica de Preço: Pega o valor da última entrada que tenha preço > 0
        // Isso ignora entradas de ajuste ou sem valor cadastrado
        const validEntry = entriesDescending.find(e => e.valorUnitario && e.valorUnitario > 0);
        
        // Fallback para preço: Se não tiver Unitário, tenta (Total / Qtd) se existir na entrada
        let unitPrice = 0;
        if (validEntry) {
            unitPrice = validEntry.valorUnitario;
        } else {
            // Tenta achar uma entrada que tenha Total e Qtd
            const entryWithTotal = entriesDescending.find(e => e.valorTotal && e.valorTotal > 0 && e.quantidade > 0);
            if (entryWithTotal) {
                unitPrice = entryWithTotal.valorTotal / entryWithTotal.quantidade;
            }
        }

        // 2. Estoque Atual: Confia na planilha principal
        const stockQty = item.quantidadeAtual;

        // 3. Valor Total: Qtd * Preço Unitário
        const totalValue = stockQty * (unitPrice || 0);

        // 4. Fornecedor: Se não tiver na principal, pega da última entrada
        const supplier = item.fornecedor || (entriesDescending[0]?.fornecedor || '');

        return {
          ...item,
          quantidadeAtual: stockQty,
          fornecedor: supplier,
          valorUnitario: unitPrice || 0,
          valorTotal: totalValue,
          entradas: histIn, // Para estatísticas de fluxo
          saidas: histOut,  // Para estatísticas de fluxo
          ultimaMovimentacao: itemMoves[itemMoves.length - 1]?.data
        };
      });

      setData(enrichedItems);
      setLastUpdated(new Date());

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Carregamento inicial (mostra loading screen)
    loadData(false);

    // Configura atualização automática (background, silenciosa)
    const interval = setInterval(() => {
      loadData(true);
    }, settings.refreshRate * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.inventoryUrl, settings.inUrl, settings.outUrl, settings.refreshRate]);

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
        return <Dashboard data={data} stats={stats} movements={movements} isLoading={isLoading} />;
      case Page.INVENTORY:
        return <Inventory data={data} isLoading={isLoading} />;
      case Page.CONSUMPTION:
        return <Consumption data={data} />;
      case Page.ALERTS:
        return <Alerts data={data} />;
      case Page.SETTINGS:
        return <SettingsPage settings={settings} onUpdateSettings={setSettings} />;
      default:
        return <Dashboard data={data} stats={stats} movements={movements} isLoading={isLoading} />;
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
               <div className="flex items-center gap-2">
                 {isSyncing && <span className="flex w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                 <span className="text-xs text-slate-500 dark:text-slate-400">
                   {isSyncing ? 'Sincronizando...' : 'Última atualização'}
                 </span>
               </div>
               <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                 {lastUpdated.toLocaleTimeString()}
               </span>
            </div>
            <button 
              onClick={() => loadData(false)} // Clique manual ainda mostra loading para feedback visual
              className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isLoading || isSyncing ? 'animate-spin' : ''}`}
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
