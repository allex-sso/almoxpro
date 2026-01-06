import React, { useState, useEffect, useMemo } from 'react';
import { Menu, RefreshCw, WifiOff, LogOut, AlertCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { AppSettings, InventoryItem, Movement, Page, ServiceOrder, SectorProfile, CentralSource } from './types';
import { fetchInventoryData, fetchMovements, fetchServiceOrders, fetchCentralData } from './services/sheetService';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Consumption from './pages/Consumption';
import Alerts from './pages/Alerts';
import SettingsPage from './pages/Settings';
import ServiceOrdersPage from './pages/ServiceOrders';
import LoginPage from './pages/Login';
import CentralDashboard from './pages/CentralDashboard';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  
  const MASTER_PROFILE_ID = 'almox-pecas';

  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultProfiles: SectorProfile[] = [
      {
        id: MASTER_PROFILE_ID,
        name: 'Almoxarifado de Peças',
        accessKey: '1',
        inventoryUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?output=csv',
        inUrl: '',
        outUrl: '',
        osUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgS_Ap0GsTp-p-HEL7MCpRfCqfWrPIydYbODTzMpCpD1DaZASPqw0WHyOYaT-0dQ/pub?output=csv'
      },
      {
        id: 'almox-central',
        name: 'Almoxarifado Central',
        accessKey: '1',
        inventoryUrl: '',
        inUrl: '',
        outUrl: '',
        osUrl: '',
        isCentral: true,
        sources: [
            { label: 'Dezembro/2024', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZWxmLQjifckO4Ln4lNFHRmEqeaPX5BLf8LM5uzfSNkh3_UXtiD_XWyx9EU5e6paFozpK8A42NBGRP/pub?gid=250304480&output=csv' }
        ]
      }
    ];

    const savedSettings = localStorage.getItem('almox_settings_v4');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return { 
          profiles: parsed.profiles || defaultProfiles,
          activeProfileId: parsed.activeProfileId || null,
          refreshRate: parsed.refreshRate || 30
        };
      } catch (e) { console.error(e); }
    }
    return { profiles: defaultProfiles, activeProfileId: null, refreshRate: 30 };
  });

  const activeProfile = useMemo(() => 
    settings.profiles.find(p => p.id === settings.activeProfileId) || null
  , [settings.profiles, settings.activeProfileId]);

  const isMasterAccount = activeProfile?.id === MASTER_PROFILE_ID;

  const [data, setData] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [osData, setOsData] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    localStorage.setItem('almox_settings_v4', JSON.stringify(settings));
  }, [settings]);

  const loadData = async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    setSyncError(false);

    try {
      if (activeProfile.isCentral) {
        const sources = activeProfile.sources || [];
        if (sources.length > 0) {
            // Carrega todas as fontes simultaneamente e consolida
            const results = await Promise.allSettled(
                sources.map(source => fetchCentralData(source.url))
            );
            
            const consolidatedMovements: Movement[] = [];
            results.forEach(res => {
                if (res.status === 'fulfilled') {
                    consolidatedMovements.push(...res.value);
                } else {
                    console.error("Erro ao carregar uma das fontes do Central:", res.reason);
                }
            });

            setMovements(consolidatedMovements);
            setData([]);
            setOsData([]);
            setLastSync(new Date().toLocaleTimeString());
        } else {
            setMovements([]);
            setLastSync(new Date().toLocaleTimeString());
        }
      } else {
        const results = await Promise.allSettled([
          fetchInventoryData(activeProfile.inventoryUrl),
          activeProfile.inUrl ? fetchMovements(activeProfile.inUrl, 'entrada') : Promise.resolve([]),
          activeProfile.outUrl ? fetchMovements(activeProfile.outUrl, 'saida') : Promise.resolve([]),
          activeProfile.osUrl ? fetchServiceOrders(activeProfile.osUrl) : Promise.resolve([])
        ]);
        
        const inventoryItems = results[0].status === 'fulfilled' ? (results[0].value as InventoryItem[]) : [];
        const inMoves = results[1].status === 'fulfilled' ? (results[1].value as Movement[]) : [];
        const outMoves = results[2].status === 'fulfilled' ? (results[2].value as Movement[]) : [];
        const osList = results[3].status === 'fulfilled' ? (results[3].value as ServiceOrder[]) : [];
        
        if (results[0].status === 'rejected' || (inventoryItems.length === 0 && activeProfile.inventoryUrl)) {
            setSyncError(true);
        }

        const priceMap = new Map<string, number>();
        inMoves.forEach(m => {
          const code = String(m.codigo).trim().toLowerCase();
          if (m.valorUnitario && m.valorUnitario > 0) {
            priceMap.set(code, m.valorUnitario);
          }
        });

        inventoryItems.forEach(item => {
          const code = String(item.codigo).trim().toLowerCase();
          if (!priceMap.has(code) && item.valorUnitario > 0) {
            priceMap.set(code, item.valorUnitario);
          }
        });

        const enrichedOutMoves = outMoves.map(m => {
          const code = String(m.codigo).trim().toLowerCase();
          const unitPrice = priceMap.get(code) || m.valorUnitario || 0;
          return {
              ...m,
              valorUnitario: unitPrice,
              valorTotal: m.quantidade * unitPrice
          };
        });

        const allMoves = [...inMoves, ...enrichedOutMoves];

        const consolidatedItems = inventoryItems.map(item => {
            const itemCode = String(item.codigo).trim().toLowerCase();
            const currentPrice = priceMap.get(itemCode) || item.valorUnitario || 0;
            const physicalQuantity = item.quantidadeAtual || 0;
            
            const itemIn = inMoves
                .filter(m => String(m.codigo).trim().toLowerCase() === itemCode)
                .reduce((acc, m) => acc + m.quantidade, 0);
            
            const itemOut = enrichedOutMoves
                .filter(m => String(m.codigo).trim().toLowerCase() === itemCode)
                .reduce((acc, m) => acc + m.quantidade, 0);
            
            return {
                ...item,
                valorUnitario: currentPrice,
                valorTotal: physicalQuantity * currentPrice, 
                entradas: itemIn,
                saidas: itemOut
            };
        });

        setData(consolidatedItems);
        setMovements(allMoves);
        setOsData(osList);
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Erro fatal ao sincronizar:", err);
      setSyncError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeProfile) {
      loadData();
      if (activeProfile.isCentral && currentPage === Page.DASHBOARD) {
        setCurrentPage(Page.CENTRAL_DASHBOARD);
      } else if (!activeProfile.isCentral && currentPage === Page.CENTRAL_DASHBOARD) {
        setCurrentPage(Page.DASHBOARD);
      }
    }
  }, [settings.activeProfileId]);

  const handleLogout = () => {
    setSettings(s => ({ ...s, activeProfileId: null }));
    setCurrentPage(Page.DASHBOARD);
  };

  if (!settings.activeProfileId) {
    return <LoginPage profiles={settings.profiles} onSelectProfile={(id) => setSettings(s => ({ ...s, activeProfileId: id }))} />;
  }

  const renderPage = () => {
    if (currentPage === Page.SETTINGS && !isMasterAccount) {
      return activeProfile?.isCentral 
        ? <CentralDashboard data={movements} isLoading={isLoading} /> 
        : <Dashboard data={data} stats={{totalItems: data.length, totalValue: 0, totalIn: 0, totalOut: 0}} movements={movements} isLoading={isLoading} />;
    }

    if (activeProfile?.isCentral && (currentPage === Page.DASHBOARD || currentPage === Page.CENTRAL_DASHBOARD)) {
        return <CentralDashboard data={movements} isLoading={isLoading} />;
    }
    
    switch (currentPage) {
      case Page.DASHBOARD: return <Dashboard data={data} stats={{totalItems: data.length, totalValue: 0, totalIn: 0, totalOut: 0}} movements={movements} isLoading={isLoading} />;
      case Page.CENTRAL_DASHBOARD: return <CentralDashboard data={movements} isLoading={isLoading} />;
      case Page.INVENTORY: return <Inventory data={data} isLoading={isLoading} />;
      case Page.CONSUMPTION: return <Consumption data={data} movements={movements} />;
      case Page.SERVICE_ORDERS: return <ServiceOrdersPage osData={osData} inventoryData={data} isLoading={isLoading} />;
      case Page.ALERTS: return <Alerts data={data} />;
      case Page.SETTINGS: return <SettingsPage settings={settings} onUpdateSettings={setSettings} isMasterAccount={isMasterAccount} />;
      default: return <Dashboard data={data} stats={{totalItems: 0, totalValue: 0, totalIn: 0, totalOut: 0}} movements={movements} isLoading={isLoading} />;
    }
  };

  return (
    <div className="flex h-screen bg-dark overflow-hidden font-sans text-slate-100">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen} 
        toggleOpen={() => setIsSidebarOpen(!isSidebarOpen)} 
        isCentral={activeProfile?.isCentral}
        isMaster={isMasterAccount}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-dark-card border-b border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 no-print">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-400"><Menu className="h-6 w-6" /></button>
            <div className="ml-4 lg:ml-0 flex flex-col">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                ALUMASA - GESTÃO DE ATIVOS
                {syncError && <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />}
              </h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeProfile?.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {lastSync && (
              <span className="hidden md:block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Última Carga: {lastSync}
              </span>
            )}
            <button 
              onClick={() => loadData()} 
              disabled={isLoading}
              className={`p-2 rounded-full hover:bg-slate-800 transition-all ${isLoading ? 'animate-spin text-primary' : 'text-slate-400'}`}
              title="Sincronizar dados agora"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest">
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-dark">
          {syncError && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-4">
              <div className="bg-red-900 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-red-200 uppercase tracking-widest">Falha de Comunicação com as Planilhas</p>
                <p className="text-[10px] text-red-400 font-bold uppercase mt-1">Verifique se as planilhas estão "Publicadas na Web" como CSV. Se persistir, verifique os nomes das colunas ou se os links de Entrada/Saída estão configurados.</p>
              </div>
              <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-red-500/20 active:scale-95 transition-all">Reconectar</button>
            </div>
          )}
          <div className="max-w-7xl mx-auto">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
};

export default App;