
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import { AppSettings, InventoryItem, Movement, Page, ServiceOrder, SectorProfile } from './types';
import { fetchInventoryData, fetchMovements, fetchServiceOrders, fetchCentralData } from './services/sheetService';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Consumption from './pages/Consumption';
import AlertPage from './pages/Alerts';
import SettingsPage from './pages/Settings';
import ServiceOrdersPage from './pages/ServiceOrders';
import LoginPage from './pages/Login';
import CentralDashboard from './pages/CentralDashboard';
import CentralProfiles from './pages/CentralProfiles';

const MASTER_PROFILE_ID = 'almox-pecas';

const getDefaultProfiles = (): SectorProfile[] => {
  return [
    {
      id: MASTER_PROFILE_ID,
      name: 'Almoxarifado de Peças',
      accessKey: '10',
      inventoryUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?output=csv',
      inUrl: '',
      outUrl: '',
      osUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgS_Ap0GsTp-p-HEL7MCpRfCqfWrPIydYbODTzMpCpD1DaZASPqw0WHyOYaT-0dQ/pub?output=csv'
    },
    {
      id: 'almox-central',
      name: 'Almoxarifado Central',
      accessKey: '20',
      inventoryUrl: '',
      inUrl: '',
      outUrl: '',
      osUrl: '',
      isCentral: true,
      sources: [
          { 
            label: 'Base Central', 
            url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZWxmLQjifckO4Ln4lNFHRmEqeaPX5BLf8LM5uzfSNkh3_UXtiD_XWyx9EU5e6paFozpK8A42NBGRP/pub?gid=1098843728&single=true&output=csv' 
          }
      ]
    }
  ];
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultProfiles = getDefaultProfiles();
    try {
      const savedSettings = localStorage.getItem('alumasa_config_v1');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        const profiles = Array.isArray(parsed.profiles) && parsed.profiles.length > 0 
          ? parsed.profiles 
          : defaultProfiles;
          
        return { 
          profiles: profiles,
          activeProfileId: parsed.activeProfileId || null,
          refreshRate: parsed.refreshRate || 30
        };
      }
    } catch (e) {
      console.error("Erro ao carregar configurações:", e);
    }
    return { profiles: defaultProfiles, activeProfileId: null, refreshRate: 30 };
  });

  const activeProfile = useMemo(() => 
    (settings.profiles || []).find(p => p.id === settings.activeProfileId) || null
  , [settings.profiles, settings.activeProfileId]);

  const isMasterAccount = activeProfile?.id === MASTER_PROFILE_ID;

  const [data, setData] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [osData, setOsData] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false); 

  useEffect(() => {
    try {
      localStorage.setItem('alumasa_config_v1', JSON.stringify(settings));
    } catch (e) {
      console.error("Erro ao salvar configurações:", e);
    }
  }, [settings]);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);

    try {
      if (activeProfile.isCentral) {
        const sources = (activeProfile.sources || []);
        if (sources.length > 0) {
            const results = await Promise.allSettled(sources.map(s => fetchCentralData(s.url)));
            const consolidated: Movement[] = [];
            results.forEach((res, idx) => {
                if (res.status === 'fulfilled') {
                    consolidated.push(...res.value.map(m => ({...m, perfil: sources[idx].label})));
                }
            });
            setMovements(consolidated);
            setData([]); 
            setOsData([]);
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
        
        // --- LOGICA DE PRECIFICAÇÃO DINÂMICA ---
        const priceMap = new Map<string, number>();
        inventoryItems.forEach(item => {
          if (item.valorUnitario > 0) priceMap.set(item.codigo, item.valorUnitario);
        });
        inMoves.forEach(m => {
          if (m.valorUnitario && m.valorUnitario > 0) priceMap.set(m.codigo, m.valorUnitario);
        });

        const valuedOutMoves = outMoves.map(m => ({
          ...m,
          valorUnitario: m.valorUnitario || priceMap.get(m.codigo) || 0,
          valorTotal: m.valorTotal || (m.quantidade * (priceMap.get(m.codigo) || 0))
        }));

        const allMoves = [...inMoves, ...valuedOutMoves];

        // LÓGICA DE RECONCILIAÇÃO DE ESTOQUE DINÂMICO
        const enrichedData = inventoryItems.map(item => {
          const itemMoves = allMoves.filter(m => m.codigo === item.codigo);
          const totalIn = itemMoves.filter(m => m.tipo === 'entrada').reduce((acc, curr) => acc + curr.quantidade, 0);
          const totalOut = itemMoves.filter(m => m.tipo === 'saida').reduce((acc, curr) => acc + curr.quantidade, 0);
          
          const dynamicQty = item.quantidadeAtual + totalIn - totalOut;
          const unitPrice = priceMap.get(item.codigo) || item.valorUnitario || 0;
          
          return {
            ...item,
            quantidadeAtual: dynamicQty,
            entradas: totalIn,
            saidas: totalOut,
            valorUnitario: unitPrice,
            valorTotal: dynamicQty * unitPrice
          };
        });

        setData(enrichedData);
        setMovements(allMoves);
        setOsData(osList);
      }
    } catch (err) {
      console.error("Erro ao sincronizar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile) loadData();
  }, [activeProfile, loadData]);

  // Estatísticas globais enviadas para o Dashboard
  const dashboardStats = useMemo(() => {
    const totalItems = data.length;
    
    // NOVO CÁLCULO: Reflete estritamente o patrimônio líquido investido (Entradas - Saídas)
    let totalInValue = 0;
    let totalOutValue = 0;
    
    movements.forEach(m => {
      const val = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (m.tipo === 'entrada') {
        totalInValue += val;
      } else if (m.tipo === 'saida') {
        totalOutValue += val;
      }
    });
    
    const totalValue = Math.max(0, totalInValue - totalOutValue);
    
    const totalInCount = movements.filter(m => m.tipo === 'entrada').length;
    const totalOutCount = movements.filter(m => m.tipo === 'saida').length;

    return {
      totalItems,
      totalValue,
      totalIn: totalInCount,
      totalOut: totalOutCount
    };
  }, [data, movements]);

  if (!settings.activeProfileId) {
    return (
      <LoginPage 
        profiles={settings.profiles} 
        onSelectProfile={(id) => setSettings(prev => ({ ...prev, activeProfileId: id }))} 
      />
    );
  }

  const renderPage = () => {
    if (activeProfile?.isCentral && (currentPage === Page.DASHBOARD || currentPage === Page.CENTRAL_DASHBOARD)) {
        return <CentralDashboard data={movements} isLoading={isLoading} />;
    }
    
    switch (currentPage) {
      case Page.DASHBOARD: 
        return <Dashboard data={data} stats={dashboardStats} movements={movements} isLoading={isLoading} />;
      case Page.CENTRAL_DASHBOARD: 
        return <CentralDashboard data={movements} isLoading={isLoading} />;
      case Page.CENTRAL_PERFIL: 
        return <CentralProfiles movements={movements} isLoading={isLoading} />;
      case Page.INVENTORY: 
        return <Inventory data={data} isLoading={isLoading} />;
      case Page.CONSUMPTION: 
        return <Consumption data={data} movements={movements} />;
      case Page.SERVICE_ORDERS: 
        return <ServiceOrdersPage osData={osData} inventoryData={data} isLoading={isLoading} />;
      case Page.ALERTS: 
        return <AlertPage data={data} />;
      case Page.SETTINGS: 
        return <SettingsPage settings={settings} onUpdateSettings={setSettings} isMasterAccount={isMasterAccount} />;
      default: 
        return <Dashboard data={data} stats={dashboardStats} movements={movements} isLoading={isLoading} />;
    }
  };

  return (
    <div className="flex h-screen bg-dark overflow-hidden font-sans text-slate-100 print:block print:h-auto print:overflow-visible">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen} 
        toggleOpen={() => setIsSidebarOpen(!isSidebarOpen)} 
        isCentral={activeProfile?.isCentral}
        isMaster={isMasterAccount}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:h-auto print:overflow-visible">
        <header className="bg-dark-card border-b border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 no-print">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-400">
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-4 lg:ml-0 flex flex-col">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">ALUMASA - GESTÃO INDUSTRIAL</h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeProfile?.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={loadData} 
              className={`p-2 rounded-full transition-all ${isLoading ? 'animate-spin text-primary' : 'text-slate-400'}`}
              title="Sincronizar dados"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setSettings(prev => ({...prev, activeProfileId: null}))} 
              className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-dark print:block print:h-auto print:overflow-visible print:bg-white">
          <div className="max-w-7xl mx-auto print:max-w-none">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
