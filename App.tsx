
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
  
  const [data, setData] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // isLoading: Mostra SKELETON (Tela cheia de carregamento)
  // isSyncing: Mostra apenas bolinha discreta no topo
  const [isLoading, setIsLoading] = useState(false); 
  const [isSyncing, setIsSyncing] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
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
        // MERGE ROBUSTO: Garante que campos novos (inUrl/outUrl) não fiquem undefined
        // se o usuário tiver uma config antiga salva no localStorage.
        return { 
          inventoryUrl: parsed.inventoryUrl ?? defaultSettings.inventoryUrl,
          inUrl: parsed.inUrl ?? defaultSettings.inUrl,
          outUrl: parsed.outUrl ?? defaultSettings.outUrl,
          refreshRate: parsed.refreshRate ?? defaultSettings.refreshRate,
          darkMode: parsed.darkMode ?? defaultSettings.darkMode
        };
      } catch (e) {
        console.error("Erro ao ler configurações", e);
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

  const cleanCode = (code: string) => code.trim().toLowerCase().replace(/\s/g, '');

  const loadData = async (isBackground = false) => {
    // Se for background (auto-refresh), NÃO ativa isLoading para não piscar a tela com skeleton.
    // Apenas ativa isSyncing para mostrar feedback discreto no header.
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

      const enrichedItems = inventoryItems.map(item => {
        const itemCodeClean = cleanCode(item.codigo);
        const itemMoves = allMoves.filter(m => cleanCode(m.codigo) === itemCodeClean);
        
        // Ordena entradas do mais recente para o mais antigo para pegar o preço atual
        const entriesDescending = inMoves
            .filter(m => cleanCode(m.codigo) === itemCodeClean)
            .sort((a, b) => b.data.getTime() - a.data.getTime());

        const histIn = itemMoves.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.quantidade, 0);
        const histOut = itemMoves.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.quantidade, 0);
        
        // --- LÓGICA DE OURO DE PREÇO (RESTAURADA) ---
        // 1. Tenta pegar o 'Valor Unitário' explícito da última entrada válida
        let validEntry = entriesDescending.find(e => e.valorUnitario && e.valorUnitario > 0);
        
        let unitPrice = 0;
        if (validEntry) {
            unitPrice = validEntry.valorUnitario ?? 0;
        } else {
            // 2. FALLBACK: Se não achou unitário, calcula (Total / Qtd)
            // Isso salva itens como o 530 que tem Total mas não Unitário na planilha
            validEntry = entriesDescending.find(e => e.valorTotal && e.valorTotal > 0 && e.quantidade > 0);
            if (validEntry && validEntry.valorTotal) {
                unitPrice = validEntry.valorTotal / validEntry.quantidade;
            }
        }

        // Trava de segurança: Se o preço calculado for absurdo (ex: > 50k), ignora para não quebrar gráfico
        if (unitPrice > 50000) unitPrice = 0;

        const stockQty = item.quantidadeAtual;
        const totalValue = stockQty * unitPrice;
        
        const supplier = item.fornecedor || (entriesDescending[0]?.fornecedor || '');

        return {
          ...item,
          quantidadeAtual: stockQty,
          fornecedor: supplier,
          valorUnitario: unitPrice,
          valorTotal: totalValue,
          entradas: histIn,
          saidas: histOut,
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
    loadData(false);
    const interval = setInterval(() => loadData(true), settings.refreshRate * 1000);
    return () => clearInterval(interval);
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
      case Page.DASHBOARD: return <Dashboard data={data} stats={stats} movements={movements} isLoading={isLoading} />;
      case Page.INVENTORY: return <Inventory data={data} isLoading={isLoading} />;
      case Page.CONSUMPTION: return <Consumption data={data} movements={movements} />;
      case Page.ALERTS: return <Alerts data={data} />;
      case Page.SETTINGS: return <SettingsPage settings={settings} onUpdateSettings={setSettings} />;
      default: return <Dashboard data={data} stats={stats} movements={movements} isLoading={isLoading} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark overflow-hidden font-sans">
      <div className="app-sidebar">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} isOpen={isSidebarOpen} toggleOpen={() => setIsSidebarOpen(!isSidebarOpen)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="app-header bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 no-print">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500">
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="ml-4 lg:ml-0 text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
              Controle do Almoxarifado
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
            <button onClick={() => loadData(false)} className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isLoading || isSyncing ? 'animate-spin' : ''}`}>
              <RefreshCw className="h-5 w-5" />
            </button>
            <button onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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
