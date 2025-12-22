
import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Moon, Sun, RefreshCw, WifiOff } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { AppSettings, InventoryItem, Movement, Page, ServiceOrder } from './types';
import { fetchInventoryData, fetchMovements, fetchServiceOrders } from './services/sheetService';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Consumption from './pages/Consumption';
import Alerts from './pages/Alerts';
import SettingsPage from './pages/Settings';
import ServiceOrdersPage from './pages/ServiceOrders';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Estados de dados com inicialização via Cache para evitar "gráficos zerados"
  const [data, setData] = useState<InventoryItem[]>(() => {
    const cached = localStorage.getItem('alumasa_cache_inventory');
    return cached ? JSON.parse(cached) : [];
  });
  const [movements, setMovements] = useState<Movement[]>(() => {
    const cached = localStorage.getItem('alumasa_cache_movements');
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.map((m: any) => ({ ...m, data: new Date(m.data) }));
    }
    return [];
  });
  const [osData, setOsData] = useState<ServiceOrder[]>(() => {
    const cached = localStorage.getItem('alumasa_cache_os');
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.map((os: any) => ({ 
        ...os, 
        dataAbertura: new Date(os.dataAbertura),
        dataInicio: os.dataInicio ? new Date(os.dataInicio) : undefined,
        dataFim: os.dataFim ? new Date(os.dataFim) : undefined
      }));
    }
    return [];
  });

  const [lastUpdated, setLastUpdated] = useState<Date>(() => {
    const saved = localStorage.getItem('alumasa_cache_time');
    return saved ? new Date(saved) : new Date();
  });
  
  const [isLoading, setIsLoading] = useState(false); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const getEnv = (key: string): string | undefined => {
      try {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
          return import.meta.env[key];
        }
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
          return (process.env as any)[key];
        }
      } catch (e) {}
      return undefined;
    };

    const defaultSettings: AppSettings = {
      inventoryUrl: getEnv('VITE_INVENTORY_URL') || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?output=csv',
      inUrl: getEnv('VITE_IN_URL') || '', 
      outUrl: getEnv('VITE_OUT_URL') || '', 
      osUrl: getEnv('VITE_OS_URL') || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgS_Ap0GsTp-p-HEL7MCpRfCqfWrPIydYbODTzMpCpD1DaZASPqw0WHyOYaT-0dQ/pub?output=csv',
      refreshRate: 30, 
      darkMode: false,
    };

    const savedSettings = localStorage.getItem('almox_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return { ...defaultSettings, ...parsed };
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
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.darkMode]);

  const cleanCode = (code: string) => code ? code.trim().toLowerCase().replace(/\s/g, '') : "";

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsSyncing(true);
    else setIsLoading(true);
    setSyncError(false);

    try {
      const [inventoryItems, inMoves, outMoves, osList] = await Promise.all([
        fetchInventoryData(settings.inventoryUrl),
        settings.inUrl ? fetchMovements(settings.inUrl, 'entrada') : Promise.resolve([]),
        settings.outUrl ? fetchMovements(settings.outUrl, 'saida') : Promise.resolve([]),
        settings.osUrl ? fetchServiceOrders(settings.osUrl) : Promise.resolve([])
      ]);

      // Validação Crítica: Se os dados principais vierem vazios mas o cache tem dados, não sobrescreve
      if (inventoryItems.length === 0 && data.length > 0) {
        throw new Error("Resposta vazia da planilha. Mantendo dados do cache.");
      }

      const allMoves = [...inMoves, ...outMoves].sort((a, b) => a.data.getTime() - b.data.getTime());
      
      const enrichedItems = inventoryItems.map(item => {
        const itemCodeClean = cleanCode(item.codigo);
        const itemMoves = allMoves.filter(m => cleanCode(m.codigo) === itemCodeClean);
        const entries = inMoves.filter(m => cleanCode(m.codigo) === itemCodeClean).sort((a, b) => b.data.getTime() - a.data.getTime());
        
        let unitPrice = 0;
        const validEntry = entries.find(e => (e.valorUnitario || 0) > 0);
        if (validEntry) unitPrice = validEntry.valorUnitario || 0;

        return {
          ...item,
          valorUnitario: unitPrice,
          valorTotal: item.quantidadeAtual * unitPrice,
          entradas: itemMoves.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.quantidade, 0),
          saidas: itemMoves.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.quantidade, 0),
          ultimaMovimentacao: itemMoves[itemMoves.length - 1]?.data
        };
      });

      // Atualiza Estados
      setData(enrichedItems);
      setMovements(allMoves);
      setOsData(osList);
      setLastUpdated(new Date());

      // Salva no Cache para a próxima abertura do app
      localStorage.setItem('alumasa_cache_inventory', JSON.stringify(enrichedItems));
      localStorage.setItem('alumasa_cache_movements', JSON.stringify(allMoves));
      localStorage.setItem('alumasa_cache_os', JSON.stringify(osList));
      localStorage.setItem('alumasa_cache_time', new Date().toISOString());

    } catch (err) {
      console.error("Falha na sincronização:", err);
      setSyncError(true);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Carrega dados. Se o cache existir, ele já está na tela, o loadData só vai atualizar.
    loadData(data.length > 0); 
    const interval = setInterval(() => loadData(true), settings.refreshRate * 1000);
    return () => clearInterval(interval);
  }, [settings.inventoryUrl, settings.inUrl, settings.outUrl, settings.osUrl, settings.refreshRate]);

  const stats = useMemo(() => {
    return {
      totalItems: data.length,
      totalValue: data.reduce((acc, item) => acc + item.valorTotal, 0),
      totalIn: data.reduce((acc, item) => acc + item.entradas, 0),
      totalOut: data.reduce((acc, item) => acc + item.saidas, 0),
    };
  }, [data]);

  const isDataStale = useMemo(() => {
    const now = new Date();
    const diff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    return diff > 5; // Considerar defasado após 5 minutos
  }, [lastUpdated]);

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return <Dashboard data={data} stats={stats} movements={movements} isLoading={isLoading && data.length === 0} />;
      case Page.INVENTORY: return <Inventory data={data} isLoading={isLoading && data.length === 0} />;
      case Page.CONSUMPTION: return <Consumption data={data} movements={movements} />;
      case Page.SERVICE_ORDERS: return <ServiceOrdersPage data={osData} isLoading={isLoading && osData.length === 0} />;
      case Page.ALERTS: return <Alerts data={data} />;
      case Page.SETTINGS: return <SettingsPage settings={settings} onUpdateSettings={setSettings} />;
      default: return <Dashboard data={data} stats={stats} movements={movements} isLoading={isLoading && data.length === 0} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} isOpen={isSidebarOpen} toggleOpen={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 no-print">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-400">
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="ml-4 lg:ml-0 text-lg font-bold uppercase tracking-wide flex items-center gap-3">
              Alumasa - Gestão de Ativos
              {syncError && <WifiOff className="w-4 h-4 text-red-500 animate-pulse" title="Erro de Sincronização" />}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
               <span className={`text-[10px] font-bold uppercase tracking-widest ${isDataStale ? 'text-amber-500' : 'text-slate-400'}`}>
                 {isSyncing ? 'Sincronizando...' : `Última carga: ${lastUpdated.toLocaleTimeString()}`}
               </span>
               {isDataStale && !isSyncing && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Tentando atualizar automaticamente...</span>}
            </div>
            
            <button 
              onClick={() => loadData(false)} 
              title="Sincronizar Manualmente"
              className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${isLoading || isSyncing ? 'animate-spin text-primary' : 'text-slate-400'}`}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            
            <button onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
              {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-dark">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
