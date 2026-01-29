
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import { AppSettings, InventoryItem, Movement, Page, SectorProfile, ProductionEntry, ServiceOrder } from './types';
import { fetchInventoryData, fetchMovements, fetchServiceOrders, fetchCentralData, fetchProductionData } from './services/sheetService';
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
import ProductionDashboard from './pages/ProductionDashboard';

const MASTER_PROFILE_ID = 'almox-pecas';
const CENTRAL_PROFILE_ID = 'almox-central';
const PRODUCTION_PROFILE_ID = 'prod-escadas';

// Função robusta para pegar variáveis de ambiente no Vite/Vercel
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  try {
    // Padrão Vite (Vercel)
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
    
    // Fallback process.env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}
  return defaultValue;
};

const getDefaultProfiles = (): SectorProfile[] => {
  return [
    {
      id: MASTER_PROFILE_ID,
      name: 'Almoxarifado de Peças',
      accessKey: '10',
      inventoryUrl: getEnvVar('VITE_INVENTORY_URL', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?output=csv'),
      inUrl: getEnvVar('VITE_IN_URL', ''),
      outUrl: getEnvVar('VITE_OUT_URL', ''),
      osUrl: getEnvVar('VITE_OS_URL', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgS_Ap0GsTp-p-HEL7MCpRfCqfWrPIydYbODTzMpCpD1DaZASPqw0WHyOYaT-0dQ/pub?output=csv')
    },
    {
      id: CENTRAL_PROFILE_ID,
      name: 'Almoxarifado de Perfil',
      accessKey: '20',
      inventoryUrl: '',
      inUrl: '',
      outUrl: '',
      osUrl: '',
      isCentral: true,
      sources: [
          { 
            label: 'Base Perfil', 
            url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZWxmLQjifckO4Ln4lNFHRmEqeaPX5BLf8LM5uzfSNkh3_UXtiD_XWyx9EU5e6paFozpK8A42NBGRP/pub?gid=1098843728&single=true&output=csv' 
          }
      ]
    },
    {
      id: PRODUCTION_PROFILE_ID,
      name: 'Produção - Escadas e Plástico',
      accessKey: '30',
      inventoryUrl: '',
      inUrl: '',
      outUrl: '',
      osUrl: '',
      isProduction: true,
      sources: [
        { 
          label: 'Controle de Produção', 
          url: getEnvVar('VITE_PRODUCTION_ESCADA_URL', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7NPvgMa3WLPZhtlXa908jIz9hLlYfcCGw_XqmYX7BEDN4MFRgznrKWhX4p-nhIg/pub?gid=301715581&single=true&output=csv') 
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
        let savedProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : defaultProfiles;
        
        // Lógica de Sincronização: Garantir que perfis "hardcoded" novos apareçam mesmo se houver cache
        defaultProfiles.forEach(defProf => {
          const exists = savedProfiles.find((p: SectorProfile) => p.id === defProf.id);
          if (!exists) {
            savedProfiles.push(defProf);
          } else {
            // Opcional: Atualiza URLs de variáveis de ambiente se elas mudarem no código
            if (defProf.id === PRODUCTION_PROFILE_ID) {
               const idx = savedProfiles.findIndex((p: SectorProfile) => p.id === defProf.id);
               savedProfiles[idx] = { ...savedProfiles[idx], sources: defProf.sources };
            }
          }
        });

        return { 
          profiles: savedProfiles,
          activeProfileId: parsed.activeProfileId || null,
          refreshRate: parsed.refreshRate || 30
        };
      }
    } catch (e) {}
    return { profiles: defaultProfiles, activeProfileId: null, refreshRate: 30 };
  });

  const activeProfile = useMemo(() => 
    (settings.profiles || []).find(p => p.id === settings.activeProfileId) || null
  , [settings.profiles, settings.activeProfileId]);

  const isMasterAccount = activeProfile?.id === MASTER_PROFILE_ID;

  const [data, setData] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productionData, setProductionData] = useState<ProductionEntry[]>([]);
  const [osData, setOsData] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false); 

  useEffect(() => {
    try {
      localStorage.setItem('alumasa_config_v1', JSON.stringify(settings));
    } catch (e) {}
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
            results.forEach((res) => {
                if (res.status === 'fulfilled') consolidated.push(...res.value);
            });
            setMovements(consolidated);
        }
      } else if (activeProfile.isProduction) {
        const sources = (activeProfile.sources || []);
        if (sources.length > 0) {
            const results = await Promise.allSettled(sources.map(async s => {
              const data = await fetchProductionData(s.url);
              return data.map(entry => ({ ...entry, setor: s.label }));
            }));
            const consolidated: ProductionEntry[] = [];
            results.forEach((res) => {
                if (res.status === 'fulfilled') consolidated.push(...res.value);
            });
            setProductionData(consolidated);
        }
      } else {
        const results = await Promise.allSettled([
          fetchInventoryData(activeProfile.inventoryUrl),
          activeProfile.inUrl ? fetchMovements(activeProfile.inUrl, 'entrada') : Promise.resolve([]),
          activeProfile.outUrl ? fetchMovements(activeProfile.outUrl, 'saida') : Promise.resolve([]),
          activeProfile.osUrl ? fetchServiceOrders(activeProfile.osUrl) : Promise.resolve([])
        ]);
        
        let inventoryItems = results[0].status === 'fulfilled' ? results[0].value : [];
        let inMoves = results[1].status === 'fulfilled' ? results[1].value : [];
        let outMoves = results[2].status === 'fulfilled' ? results[2].value : [];
        const osList = results[3].status === 'fulfilled' ? results[3].value : [];

        if (activeProfile.id === MASTER_PROFILE_ID) {
          const priceMap = new Map<string, number>();
          [...inMoves].sort((a,b) => a.data.getTime() - b.data.getTime()).forEach(m => {
            if (m.codigo && m.valorUnitario && m.valorUnitario > 0) {
              const codeClean = String(m.codigo).trim().toLowerCase();
              priceMap.set(codeClean, m.valorUnitario);
            }
          });

          outMoves = outMoves.map(m => {
            const codeClean = String(m.codigo).trim().toLowerCase();
            const lastKnownPrice = priceMap.get(codeClean);
            if (lastKnownPrice && (m.valorUnitario === 0 || !m.valorUnitario)) {
              return {
                ...m,
                valorUnitario: lastKnownPrice,
                valorTotal: m.quantidade * lastKnownPrice
              };
            }
            return m;
          });

          inventoryItems = inventoryItems.map(item => {
            const codeClean = String(item.codigo).trim().toLowerCase();
            const precoEncontrado = priceMap.get(codeClean);
            if (precoEncontrado !== undefined) {
               return {
                 ...item,
                 valorUnitario: precoEncontrado,
                 valorTotal: item.quantidadeAtual * precoEncontrado
               };
            }
            return {
              ...item,
              valorTotal: item.quantidadeAtual * (item.valorUnitario || 0)
            };
          });

          const outgoingByCode = new Map<string, number>();
          outMoves.forEach(m => {
             const code = String(m.codigo).trim().toLowerCase();
             outgoingByCode.set(code, (outgoingByCode.get(code) || 0) + m.quantidade);
          });
          
          const incomingByCode = new Map<string, number>();
          inMoves.forEach(m => {
             const code = String(m.codigo).trim().toLowerCase();
             incomingByCode.set(code, (incomingByCode.get(code) || 0) + m.quantidade);
          });

          inventoryItems = inventoryItems.map(item => {
             const codeClean = String(item.codigo).trim().toLowerCase();
             return {
              ...item,
              entradas: incomingByCode.get(codeClean) || 0,
              saidas: outgoingByCode.get(codeClean) || 0
             };
          });
        }
        
        setData(inventoryItems);
        setMovements([...inMoves, ...outMoves]);
        setOsData(osList);
      }
    } catch (err) {
      console.error("Erro ao sincronizar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile) {
        loadData();
        if (activeProfile.isProduction) setCurrentPage(Page.PRODUCTION_DASHBOARD);
        else if (activeProfile.isCentral) setCurrentPage(Page.CENTRAL_DASHBOARD);
        else setCurrentPage(Page.DASHBOARD);
    }
  }, [activeProfile, loadData]);

  const dashboardStats = useMemo(() => {
    const totalItems = data.length;
    const totalValue = data.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
    
    let totalIn = 0;
    let totalOut = 0;

    if (movements.length > 0) {
      totalIn = movements.filter(m => m.tipo === 'entrada').length;
      totalOut = movements.filter(m => m.tipo === 'saida').length;
    } else {
      totalIn = data.reduce((sum, item) => sum + (item.entradas || 0), 0);
      totalOut = data.reduce((sum, item) => sum + (item.saidas || 0), 0);
    }

    return {
      totalItems,
      totalValue,
      totalIn,
      totalOut
    };
  }, [data, movements]);

  if (!settings.activeProfileId) {
    return <LoginPage profiles={settings.profiles} onSelectProfile={(id) => setSettings(prev => ({ ...prev, activeProfileId: id }))} />;
  }

  const renderPage = () => {
    if (activeProfile?.isProduction) {
        const isDetails = currentPage === Page.PRODUCTION_DETAILS;
        return (
          <ProductionDashboard 
            data={productionData} 
            isLoading={isLoading} 
            initialTab={isDetails ? 'table' : 'stats'}
          />
        );
    }
    
    if (activeProfile?.isCentral) {
      if (currentPage === Page.CENTRAL_PERFIL) return <CentralProfiles movements={movements} isLoading={isLoading} />;
      return <CentralDashboard data={movements} isLoading={isLoading} />;
    }
    
    switch (currentPage) {
      case Page.INVENTORY: return <Inventory data={data} isLoading={isLoading} />;
      case Page.CONSUMPTION: return <Consumption data={data} movements={movements} />;
      case Page.SERVICE_ORDERS: return <ServiceOrdersPage osData={osData} inventoryData={data} isLoading={isLoading} />;
      case Page.ALERTS: return <AlertPage data={data} />;
      case Page.SETTINGS: return <SettingsPage settings={settings} onUpdateSettings={setSettings} isMasterAccount={isMasterAccount} />;
      default: return <Dashboard data={data} stats={dashboardStats} movements={movements} isLoading={isLoading} />;
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
        isProduction={activeProfile?.isProduction}
        isMaster={isMasterAccount}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:h-auto print:overflow-visible">
        <header className="bg-dark-card border-b border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 no-print">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-400"><Menu className="h-6 w-6" /></button>
            <div className="ml-4 lg:ml-0 flex flex-col">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">ALUMASA - GESTÃO INDUSTRIAL</h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeProfile?.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={loadData} className={`p-2 rounded-full transition-all ${isLoading ? 'animate-spin text-primary' : 'text-slate-400'}`}><RefreshCw className="h-4 w-4" /></button>
            <button onClick={() => setSettings(prev => ({...prev, activeProfileId: null}))} className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"><LogOut className="w-3.5 h-3.5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-dark print:block print:h-auto print:overflow-visible print:bg-white">
          <div className="max-w-7xl mx-auto print:max-w-none">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
};

export default App;
