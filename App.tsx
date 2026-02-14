
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import { AppSettings, InventoryItem, Movement, Page, SectorProfile, ProductionEntry, ServiceOrder, PreventiveEntry, AddressItem, DashboardStats } from './types';
import { fetchInventoryData, fetchMovements, fetchServiceOrders, fetchCentralData, fetchProductionData, fetchPreventiveData, fetchAddressData } from './services/sheetService';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Consumption from './pages/Consumption';
import AlertPage from './pages/Alerts';
import SettingsPage from './pages/Settings';
import ServiceOrdersPage from './pages/ServiceOrders';
import PreventivePage from './pages/Preventives';
import LoginPage from './pages/Login';
import CentralDashboard from './pages/CentralDashboard';
import CentralProfiles from './pages/CentralProfiles';
import ProductionDashboard from './pages/ProductionDashboard';
import ProductionTypology from './pages/ProductionTypology';
import WarehouseAddresses from './pages/WarehouseAddresses';
import WarehousePerformance from './pages/WarehousePerformance';

const MASTER_PROFILE_ID = 'almox-pecas';
const CENTRAL_PROFILE_ID = 'almox-central';
const PRODUCTION_PROFILE_ID = 'prod-escadas';
const MAINTENANCE_PROFILE_ID = 'manutencao';
const WAREHOUSE_PROFILE_ID = 'almox-geral';

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  try {
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
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
      inUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?gid=1698687683&single=true&output=csv',
      outUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBMwcgSD7Z6_n69F64Z16Ys4RWWohvf7xniWm1AoohkdYrg9cVXkUXJ2pogwaUCA/pub?gid=1950267668&single=true&output=csv',
      osUrl: '',
      preventiveUrl: ''
    },
    {
      id: WAREHOUSE_PROFILE_ID,
      name: 'Almoxarifado Geral',
      accessKey: '50',
      isWarehouse: true,
      inventoryUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJgoRrtI17w2H_SsE28OaPpIQBoED9ZcmRf4sTZo8KNtWb7yvDa-mrS8wpOnrnoAoSh_T9J_-yIRT1/pub?gid=2095331650&single=true&output=csv',
      inUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJgoRrtI17w2H_SsE28OaPpIQBoED9ZcmRf4sTZo8KNtWb7yvDa-mrS8wpOnrnoAoSh_T9J_-yIRT1/pub?gid=1698687683&single=true&output=csv',
      outUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJgoRrtI17w2H_SsE28OaPpIQBoED9ZcmRf4sTZo8KNtWb7yvDa-mrS8wpOnrnoAoSh_T9J_-yIRT1/pub?gid=1950267668&single=true&output=csv',
      moveUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJgoRrtI17w2H_SsE28OaPpIQBoED9ZcmRf4sTZo8KNtWb7yvDa-mrS8wpOnrnoAoSh_T9J_-yIRT1/pub?gid=36636399&single=true&output=csv',
      addressUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJgoRrtI17w2H_SsE28OaPpIQBoED9ZcmRf4sTZo8KNtWb7yvDa-mrS8wpOnrnoAoSh_T9J_-yIRT1/pub?gid=1491159035&single=true&output=csv',
      osUrl: ''
    },
    {
      id: MAINTENANCE_PROFILE_ID,
      name: 'Manutenção',
      accessKey: '40',
      inventoryUrl: '',
      inUrl: '',
      outUrl: '',
      osUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgS_Ap0GsTp-p-HEL7MCpRfCqfWrPIydYbODTzMpCpD1DaZASPqw0WHyOYaT-0dQ/pub?gid=1950267668&single=true&output=csv',
      preventiveUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQrLFeuc92GdbLzpbODvpcRh60tqFoc0-t9Tf175oDyNuI7cKrNZBbDVDVZbW41DgC2OCMxAsjmDO70/pub?gid=194213390&single=true&output=csv',
      isMaintenance: true
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
      name: 'Produção - Escadas',
      accessKey: '30',
      inventoryUrl: '',
      inUrl: '',
      outUrl: '',
      osUrl: '',
      isProduction: true,
      sources: [
        { 
          label: 'Ranking Equipes', 
          url: getEnvVar('VITE_PROD_RANKING_URL', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7NPvgMa3WLPZhtlXa908jIz9hLlYfcCGw_XqmYX7BEDN4MFRgznrKWhX4p-nhIg/pub?gid=301715581&single=true&output=csv') 
        },
        {
          label: 'Engenharia de Processos',
          url: getEnvVar('VITE_PROD_ENGENHARIA_URL', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSucvGIz4K57zAeWyXCOTgsKDGtVCLk7LLruUXxyaa8Zdx3NeyjXCPpMR_5fqNme2LQLXLHG4-YWqvz/pub?gid=1991174007&single=true&output=csv')
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
        
        defaultProfiles.forEach(defProf => {
          const exists = savedProfiles.find((p: SectorProfile) => p.id === defProf.id);
          if (!exists) {
            savedProfiles.push(defProf);
          } else {
             const idx = savedProfiles.findIndex((p: SectorProfile) => p.id === defProf.id);
             if (defProf.id === WAREHOUSE_PROFILE_ID || defProf.id === MASTER_PROFILE_ID || defProf.id === MAINTENANCE_PROFILE_ID) {
                savedProfiles[idx] = { ...savedProfiles[idx], ...defProf };
             } else {
                savedProfiles[idx] = { ...defProf, ...savedProfiles[idx], isWarehouse: defProf.isWarehouse };
             }
          }
        });

        return { 
          profiles: savedProfiles,
          activeProfileId: parsed.activeProfileId || null,
          refreshRate: parsed.refreshRate || 0 
        };
      }
    } catch (e) {}
    return { profiles: defaultProfiles, activeProfileId: null, refreshRate: 0 };
  });

  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [osData, setOsData] = useState<ServiceOrder[]>([]);
  const [productionData, setProductionData] = useState<ProductionEntry[]>([]);
  const [preventiveData, setPreventiveData] = useState<PreventiveEntry[]>([]);
  const [addressData, setAddressData] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(false);

  const activeProfile = useMemo(() => 
    settings.profiles.find(p => p.id === settings.activeProfileId), 
    [settings]
  );

  const fetchData = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const results = await Promise.all([
        activeProfile.inventoryUrl ? fetchInventoryData(activeProfile.inventoryUrl) : Promise.resolve([]),
        activeProfile.inUrl ? fetchMovements(activeProfile.inUrl, 'entrada') : Promise.resolve([]),
        activeProfile.outUrl ? fetchMovements(activeProfile.outUrl, 'saida') : Promise.resolve([]),
        activeProfile.moveUrl ? fetchMovements(activeProfile.moveUrl, 'transferencia') : Promise.resolve([]),
        activeProfile.osUrl ? fetchServiceOrders(activeProfile.osUrl) : Promise.resolve([]),
        activeProfile.preventiveUrl ? fetchPreventiveData(activeProfile.preventiveUrl) : Promise.resolve([]),
        activeProfile.addressUrl ? fetchAddressData(activeProfile.addressUrl) : Promise.resolve([]),
        activeProfile.isProduction ? Promise.all((activeProfile.sources || []).map(s => fetchProductionData(s.url))).then(res => res.flat()) : Promise.resolve([]),
        activeProfile.isCentral ? Promise.all((activeProfile.sources || []).map(s => fetchCentralData(s.url))).then(res => res.flat()) : Promise.resolve([]),
      ]);

      setInventoryData(results[0]);
      const allMovs = [...results[1], ...results[2], ...results[3], ...(activeProfile.isCentral ? (results[8] as Movement[]) : [])];
      setMovements(allMovs);
      setOsData(results[4]);
      setPreventiveData(results[5]);
      setAddressData(results[6]);
      setProductionData(results[7] as ProductionEntry[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // LÓGICA DE PROCESSAMENTO DE ENDEREÇAMENTO DINÂMICO (SUPORTE A MÚLTIPLOS LOCAIS E TRANSFERÊNCIAS)
  const processedInventory = useMemo(() => {
    if (!activeProfile?.isWarehouse) return inventoryData;

    return inventoryData.map(item => {
      const SKU = String(item.codigo).trim();
      
      // Coleta todas as ações de entrada e transferência ordenadas por data
      const skuActions = movements
        .filter(m => String(m.codigo).trim() === SKU && (m.tipo === 'entrada' || m.tipo === 'transferencia'))
        .sort((a, b) => a.data.getTime() - b.data.getTime());

      // Rastreador de endereços ativos para o SKU
      const currentAddresses = new Set<string>();
      
      // Se houver endereçamento prévio no cadastro (Estoque Atual / Coluna Endereço), iniciamos com ele
      if (item.localizacao && item.localizacao.trim() !== '' && item.localizacao !== '-') {
         const parts = item.localizacao.split(/[,|/]/);
         parts.forEach(p => {
             const addr = p.trim();
             if (addr) currentAddresses.add(addr);
         });
      }

      skuActions.forEach(action => {
        if (action.tipo === 'entrada') {
          // Na entrada, o novo endereço (coordenada) é adicionado aos locais onde o item reside
          if (action.localizacaoDestino) {
            currentAddresses.add(action.localizacaoDestino.trim());
          }
        } else if (action.tipo === 'transferencia') {
          // Na transferência, o item SAI de um endereço específico e ENTRA em outro
          if (action.localizacaoOrigem) {
            currentAddresses.delete(action.localizacaoOrigem.trim());
          }
          if (action.localizacaoDestino) {
            currentAddresses.add(action.localizacaoDestino.trim());
          }
        }
      });

      const addressList = Array.from(currentAddresses).filter(Boolean);
      const displayAddress = addressList.length > 0 
        ? addressList.join(', ') 
        : (item.localizacao || '-');

      return {
        ...item,
        localizacao: displayAddress
      };
    });
  }, [inventoryData, movements, activeProfile]);

  const handleSelectProfile = (profileId: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, activeProfileId: profileId };
      localStorage.setItem('alumasa_config_v1', JSON.stringify(newSettings));
      return newSettings;
    });
    setCurrentPage(Page.DASHBOARD);
  };

  const handleLogout = () => {
    setSettings(prev => ({ ...prev, activeProfileId: null }));
    localStorage.removeItem('alumasa_config_v1');
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('alumasa_config_v1', JSON.stringify(newSettings));
  };

  const stats: DashboardStats = useMemo(() => {
    const itemPricing: Record<string, number> = {};
    const itemBalances: Record<string, number> = {};
    
    movements.forEach(m => {
        const code = m.codigo;
        if (!code || code === 'N/D') return;

        if (m.tipo === 'entrada') {
            itemBalances[code] = (itemBalances[code] || 0) + m.quantidade;
            if (m.valorUnitario && m.valorUnitario > 0) {
                itemPricing[code] = m.valorUnitario;
            }
        } else if (m.tipo === 'saida') {
            itemBalances[code] = (itemBalances[code] || 0) - m.quantidade;
        }
    });

    let totalValue = 0;
    Object.keys(itemBalances).forEach(code => {
        const balance = itemBalances[code];
        const price = itemPricing[code] || 0;
        if (balance > 0 && price > 0) {
            totalValue += (balance * price);
        }
    });

    if (totalValue === 0) {
        totalValue = inventoryData.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
    }

    return {
      totalItems: inventoryData.length,
      totalValue: totalValue,
      totalIn: movements.filter(m => m.tipo === 'entrada').length,
      totalOut: movements.filter(m => m.tipo === 'saida').length,
    };
  }, [movements, inventoryData]);

  if (!settings.activeProfileId) {
    return <LoginPage profiles={settings.profiles} onSelectProfile={handleSelectProfile} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard data={processedInventory} stats={stats} movements={movements} isLoading={loading} isWarehouse={activeProfile?.isWarehouse} />;
      case Page.INVENTORY:
        return <Inventory data={processedInventory} isLoading={loading} isWarehouse={activeProfile?.isWarehouse} />;
      case Page.CONSUMPTION:
        return <Consumption data={processedInventory} movements={movements} isWarehouse={activeProfile?.isWarehouse} />;
      case Page.ALERTS:
        return <AlertPage data={processedInventory} movements={movements} />;
      case Page.SERVICE_ORDERS:
        return <ServiceOrdersPage osData={osData} inventoryData={processedInventory} isLoading={loading} />;
      case Page.PREVENTIVES:
        return <PreventivePage data={preventiveData} isLoading={loading} />;
      case Page.CENTRAL_DASHBOARD:
        return <CentralDashboard data={movements} isLoading={loading} />;
      case Page.CENTRAL_PERFIL:
        return <CentralProfiles movements={movements} isLoading={loading} />;
      case Page.PRODUCTION_DASHBOARD:
        return <ProductionDashboard data={productionData} isLoading={loading} />;
      case Page.PRODUCTION_DETAILS:
        return <ProductionDashboard data={productionData} isLoading={loading} initialTab="table" />;
      case Page.PRODUCTION_TYPOLOGY:
        return <ProductionTypology data={productionData} isLoading={loading} />;
      case Page.WAREHOUSE_ADDRESSES:
        return <WarehouseAddresses addresses={addressData} isLoading={loading} />;
      case Page.WAREHOUSE_PERFORMANCE:
        return <WarehousePerformance data={processedInventory} movements={movements} isLoading={loading} />;
      case Page.SETTINGS:
        return <SettingsPage settings={settings} onUpdateSettings={handleUpdateSettings} isMasterAccount={activeProfile?.id === MASTER_PROFILE_ID} />;
      default:
        return <Dashboard data={processedInventory} stats={stats} movements={movements} isLoading={loading} isWarehouse={activeProfile?.isWarehouse} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen} 
        toggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        isCentral={activeProfile?.isCentral}
        isProduction={activeProfile?.isProduction}
        isMaintenance={activeProfile?.isMaintenance}
        isWarehouse={activeProfile?.isWarehouse}
        isMaster={activeProfile?.id === MASTER_PROFILE_ID}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8 no-print">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-400">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{activeProfile?.name}</h2>
            {loading && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData} 
              disabled={loading}
              className={`p-2.5 rounded-xl transition-all border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 ${loading ? 'animate-pulse' : ''}`}
              title="Atualizar Dados Manualmente"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors font-bold text-xs border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">SAIR</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
