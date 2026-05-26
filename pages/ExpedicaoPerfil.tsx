
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ExpedicaoPedido 
} from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import { 
  TrendingUp, Package, DollarSign, Clock, Users, Activity, 
  CheckCircle2, AlertCircle, Clock3, Download, Filter, Printer, X,
  Truck, BarChart3, LayoutDashboard, PieChart as PieChartIcon, Target,
  Search, ChevronLeft, ChevronRight, Hash, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpedicaoPerfilProps {
  data: ExpedicaoPedido[];
  isLoading: boolean;
  initialTab?: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTHLY_TARGETS: Record<string, { total: number, natural: number, pintado: number }> = {
  "Janeiro": { total: 43473, natural: 13042, pintado: 30431 },
  "Fevereiro": { total: 38776, natural: 8918, pintado: 29857 },
  "Março": { total: 34077, natural: 4089, pintado: 29987 },
  "Abril": { total: 34552, natural: 4837, pintado: 29715 },
  "Maio": { total: 39261, natural: 9030, pintado: 30231 },
  "Junho": { total: 41103, natural: 9454, pintado: 31650 },
  "Julho": { total: 45130, natural: 14893, pintado: 30237 },
  "Agosto": { total: 34607, natural: 4499, pintado: 30108 },
  "Setembro": { total: 38274, natural: 8420, pintado: 29853 },
  "Outubro": { total: 44133, natural: 14123, pintado: 30011 },
  "Novembro": { total: 38286, natural: 8423, pintado: 29863 },
  "Dezembro": { total: 28328, natural: 6515, pintado: 21812 },
};

const ExpedicaoPerfil: React.FC<ExpedicaoPerfilProps> = ({ data, isLoading, initialTab = 0 }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear, selectedMonth, activeTab]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    const yearSlug = selectedYear.toLowerCase().replace(' ', '_');
    const monthSlug = selectedMonth.toLowerCase().replace(' ', '_');
    document.title = `relatorio_expedicao_${yearSlug}_${monthSlug}_alumasa`;
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  const CUTOFF_DATE = useMemo(() => new Date(2026, 4, 1), []);

  const years = useMemo(() => {
    const y = new Set<string>();
    data.forEach(m => {
      const date = m.dataFaturamento || m.dataEmbarque || m.dataSolicitacao || m.dataEntrega || m.dataLiberacao;
      if (date && date >= CUTOFF_DATE) y.add(date.getFullYear().toString());
    });
    return ['Todos', ...Array.from(y).sort().reverse()];
  }, [data, CUTOFF_DATE]);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.filter(m => {
      // Robust year/month matching
      const date = m.dataFaturamento || m.dataEmbarque || m.dataSolicitacao || m.dataEntrega || m.dataLiberacao;
      
      // Cutoff filter: only data from 01/05/2026 onwards
      if (!date || date < CUTOFF_DATE) return false;

      // If "Todos" is selected for both, return everything immediately
      if (selectedYear === 'Todos' && selectedMonth === 'Todos') return true;
      
      const itemYear = date.getFullYear().toString();
      const itemMonth = months[date.getMonth()];
      
      const yearMatch = selectedYear === 'Todos' || itemYear === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || itemMonth === selectedMonth;
      
      return yearMatch && monthMatch;
    });
  }, [data, selectedYear, selectedMonth, CUTOFF_DATE]);

  // Helper formatting functions
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const formatNumber = (val: number) => 
    new Intl.NumberFormat('pt-BR').format(val);

  const formatWeight = (val: number) => 
    `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val)} kg`;

  // Calculated Metrics
  const metrics = useMemo(() => {
    const totalOrders = filteredData.length;

    // Filter specifically for items whose dataEntrega (Column E / DATA DE ENTREGA) matches the year and month filters
    const deliveryFilteredData = data.filter(m => {
      const date = m.dataEntrega;
      
      // Cutoff filter: only data from 01/05/2026 onwards
      if (!date || date < CUTOFF_DATE) return false;

      // If "Todos" is selected for both, return everything immediately
      if (selectedYear === 'Todos' && selectedMonth === 'Todos') return true;
      
      const itemYear = date.getFullYear().toString();
      const itemMonth = months[date.getMonth()];
      
      const yearMatch = selectedYear === 'Todos' || itemYear === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || itemMonth === selectedMonth;
      
      return yearMatch && monthMatch;
    });

    // Filter specifically for items whose dataFaturamento (Column J / FATURAMENTO) matches the year and month filters
    const financialFilteredData = data.filter(m => {
      const date = m.dataFaturamento;
      
      // Cutoff filter: only data from 01/05/2026 onwards
      if (!date || date < CUTOFF_DATE) return false;

      // If "Todos" is selected for both, return everything immediately
      if (selectedYear === 'Todos' && selectedMonth === 'Todos') return true;
      
      const itemYear = date.getFullYear().toString();
      const itemMonth = months[date.getMonth()];
      
      const yearMatch = selectedYear === 'Todos' || itemYear === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || itemMonth === selectedMonth;
      
      return yearMatch && monthMatch;
    });

    // O Valor Faturado (totalRevenue) engloba o valor de todos os pedidos na coluna F (Valor do Pedido) usando a coluna E (Data de Entrega) como referência de data
    const totalRevenue = deliveryFilteredData.reduce((acc, curr) => acc + curr.valor, 0);
    const totalWeight = filteredData.reduce((acc, curr) => acc + curr.peso, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgWeight = totalOrders > 0 ? totalWeight / totalOrders : 0;

    // Status processing
    const statusCounts: Record<string, number> = {};
    const statusWeights: Record<string, number> = {};
    const statusValues: Record<string, number> = {};
    
    filteredData.forEach(item => {
      const st = item.status || 'OUTROS';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      statusWeights[st] = (statusWeights[st] || 0) + item.peso;
    });

    deliveryFilteredData.forEach(item => {
      const st = item.status || 'OUTROS';
      statusValues[st] = (statusValues[st] || 0) + item.valor;
    });

    const statusChartData = Object.keys(statusCounts).map(name => ({
      name,
      value: statusCounts[name]
    }));

    const statusWeightChartData = Object.keys(statusWeights).map(name => ({
      name,
      value: statusWeights[name]
    }));

    const statusValueChartData = Object.keys(statusValues).map(name => ({
      name,
      value: statusValues[name]
    }));

    // Lead Time calculations
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let totalLeadTime = 0;
    let leadTimeCount = 0;
    const leadTimeByIso: Record<string, { total: number, count: number }> = {};
    const dailyVolumeByIso: Record<string, number> = {};

    filteredData.forEach(item => {
      const mainDate = item.dataFaturamento || item.dataEmbarque || item.dataSolicitacao || item.dataEntrega || item.dataLiberacao;
      const isoDate = mainDate ? mainDate.toISOString().split('T')[0] : 'N/D';
      
      if (isoDate === 'N/D' || isoDate <= todayStr) {
        dailyVolumeByIso[isoDate] = (dailyVolumeByIso[isoDate] || 0) + 1;
      }

      if (item.dataEmbarque && item.dataSolicitacao) {
        const diff = (item.dataEmbarque.getTime() - item.dataSolicitacao.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          const embarqueIso = item.dataEmbarque.toISOString().split('T')[0];
          if (embarqueIso <= todayStr) {
            totalLeadTime += diff;
            leadTimeCount++;
            
            if (!leadTimeByIso[embarqueIso]) leadTimeByIso[embarqueIso] = { total: 0, count: 0 };
            leadTimeByIso[embarqueIso].total += diff;
            leadTimeByIso[embarqueIso].count += 1;
          }
        }
      }
    });

    const avgLeadTime = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0;
    
    const leadEvolutionChartData = Object.keys(leadTimeByIso).sort().map(iso => {
      const [y, m, d] = iso.split('-');
      return {
        date: `${d}/${m}`,
        avg: leadTimeByIso[iso].total / leadTimeByIso[iso].count
      };
    });

    const volumeEvolutionChartData = Object.keys(dailyVolumeByIso)
      .sort((a, b) => {
        if (a === 'N/D') return 1;
        if (b === 'N/D') return -1;
        return a.localeCompare(b);
      })
      .map(iso => {
        if (iso === 'N/D') return { date: 'N/D', count: dailyVolumeByIso[iso] };
        const [y, m, d] = iso.split('-');
        return {
          date: `${d}/${m}`,
          count: dailyVolumeByIso[iso]
        };
      });

    // Backlog calculated metrics
    const releasedOrders = filteredData.filter(item => item.status === 'LIBERADO').length;
    const releasedPercent = totalOrders > 0 ? (releasedOrders / totalOrders) * 100 : 0;
    const waitingCollection = filteredData.filter(item => item.status === 'AGUARDANDO COLETA').length;
    const cancelledCount = filteredData.filter(item => {
      const st = item.status?.trim().toUpperCase();
      return st === 'CANCELADO' || st === 'SALDO CANCELADO';
    }).length;
    const backlogCount = filteredData.filter(item => {
      const st = item.status?.trim().toUpperCase();
      return st !== 'LIBERADO' && st !== 'FATURADO TOTAL' && st !== 'CANCELADO' && st !== 'SALDO CANCELADO';
    }).length;
    // O Faturamento Parcial (totalPartialFaturamento) engloba a soma dos saldos de faturamento parcial da coluna G (Faturado Parcial) se o status estiver como "Faturado Parcial" (ou "Faturamento Parcial") usando apenasColuna J como data referência
    const totalPartialFaturamento = financialFilteredData
      .filter(item => {
        const st = item.status?.trim().toUpperCase();
        return st === 'FATURADO PARCIAL' || st === 'FATURAMENTO PARCIAL';
      })
      .reduce((acc, curr) => acc + (curr.saldoRestante || 0), 0);

    // Backlog Financeiro: Valor Total - Faturamento Parcial (as requested: totalRevenue - totalPartialFaturamento)
    const financialBacklog = totalRevenue - totalPartialFaturamento;

    // Backlog Financeiro de não liberados: specifically for the backlog row on general report (does not include released/LIBERADO)
    const unreleasedFinancialBacklog = filteredData
      .filter(item => {
        const st = item.status?.trim().toUpperCase();
        return st !== 'LIBERADO' && st !== 'FATURADO TOTAL' && st !== 'CANCELADO' && st !== 'SALDO CANCELADO';
      })
      .reduce((acc, curr) => {
        const st = curr.status?.trim().toUpperCase();
        const isPartial = st === 'FATURADO PARCIAL' || st === 'FATURAMENTO PARCIAL' || st === 'SALDO RESTANTE';
        const remaining = isPartial ? curr.valor - (curr.saldoRestante || 0) : curr.valor;
        return acc + (remaining > 0 ? remaining : 0);
      }, 0);

    // Group by Client
    const clientStats: Record<string, { orders: number, value: number, weight: number, leadTimeSum: number, leadTimeCount: number }> = {};
    filteredData.forEach(item => {
      if (!clientStats[item.cliente]) {
        clientStats[item.cliente] = { orders: 0, value: 0, weight: 0, leadTimeSum: 0, leadTimeCount: 0 };
      }
      clientStats[item.cliente].orders += 1;
      clientStats[item.cliente].weight += item.peso;
      
      if (item.dataEmbarque && item.dataSolicitacao) {
        const diff = (item.dataEmbarque.getTime() - item.dataSolicitacao.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          clientStats[item.cliente].leadTimeSum += diff;
          clientStats[item.cliente].leadTimeCount += 1;
        }
      }
    });

    // Populate financial values strictly based on dataset matching column E (Data de Entrega)
    deliveryFilteredData.forEach(item => {
      if (!clientStats[item.cliente]) {
        clientStats[item.cliente] = { orders: 0, value: 0, weight: 0, leadTimeSum: 0, leadTimeCount: 0 };
      }
      clientStats[item.cliente].value += item.valor;
    });

    const topClientsByWeight = Object.keys(clientStats)
      .map(name => ({ name, value: clientStats[name].weight }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topClientsByValue = Object.keys(clientStats)
      .map(name => ({ name, value: clientStats[name].value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topClientsByOrders = Object.keys(clientStats)
      .map(name => ({ name, value: clientStats[name].orders }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const avgTicketByClient = Object.keys(clientStats)
      .map(name => ({ name, value: clientStats[name].value / clientStats[name].orders }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const avgLeadTimeByClient = Object.keys(clientStats)
      .filter(name => clientStats[name].leadTimeCount > 0)
      .map(name => ({ name, value: clientStats[name].leadTimeSum / clientStats[name].leadTimeCount }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Group by Color
    const weightByColor: Record<string, number> = {};
    filteredData.forEach(item => {
      weightByColor[item.cor] = (weightByColor[item.cor] || 0) + item.peso;
    });

    const weightByColorChartData = Object.keys(weightByColor).map(name => ({
      name,
      value: weightByColor[name]
    })).sort((a, b) => b.value - a.value);

    // Top 5 heaviest orders
    const top5Heaviest = [...filteredData]
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 5)
      .map(item => ({
        name: `Pedido ${item.pedido}`,
        value: item.peso,
        cliente: item.cliente
      }));

    // Late orders
    const lateOrders = filteredData.filter(item => 
      item.dataEntrega && item.dataEntrega < today && item.status !== 'LIBERADO'
    ).length;

    // Targets Progress
    const weightNatural = filteredData.filter(item => item.cor.toUpperCase().includes('NATURAL')).reduce((acc, curr) => acc + curr.peso, 0);
    const weightPintado = filteredData.filter(item => item.cor.toUpperCase().includes('PINTADO')).reduce((acc, curr) => acc + curr.peso, 0);
    const weightTargetTotalSum = weightNatural + weightPintado;
    
    // If a month is selected, use that month's target. If "Todos" is selected, sum all month targets for the year.
    const target = selectedMonth !== 'Todos' 
      ? MONTHLY_TARGETS[selectedMonth] 
      : Object.values(MONTHLY_TARGETS).reduce((acc, curr) => ({
          total: acc.total + curr.total,
          natural: acc.natural + curr.natural,
          pintado: acc.pintado + curr.pintado
        }), { total: 0, natural: 0, pintado: 0 });
    
    return {
      totalOrders, totalRevenue, totalWeight, avgTicket, avgWeight,
      statusChartData, statusWeightChartData, statusValueChartData,
      avgLeadTime, leadEvolutionChartData, volumeEvolutionChartData,
      releasedPercent, releasedOrders, waitingCollection, cancelledCount, backlogCount, financialBacklog,
      unreleasedFinancialBacklog, totalPartialFaturamento,
      topClientsByWeight, topClientsByValue, topClientsByOrders,
      avgTicketByClient, avgLeadTimeByClient,
      weightByColorChartData, top5Heaviest, lateOrders,
      weightNatural, weightPintado, weightTargetTotalSum, target
    };
  }, [filteredData, selectedMonth]);

  const searchedOrders = useMemo(() => {
    if (!searchTerm) return filteredData;
    const term = searchTerm.toLowerCase();
    return filteredData.filter(item => 
      item.pedido.toString().toLowerCase().includes(term) ||
      item.cliente.toLowerCase().includes(term) ||
      item.cor.toLowerCase().includes(term)
    );
  }, [filteredData, searchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return searchedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [searchedOrders, currentPage]);

  const totalPages = Math.ceil(searchedOrders.length / itemsPerPage);

  const tabs = [
    { id: 0, name: 'Visão Geral', icon: LayoutDashboard },
    { id: 1, name: 'Expedição', icon: Truck },
    { id: 2, name: 'Performance', icon: Clock },
    { id: 3, name: 'Volume & Logística', icon: Package },
    { id: 4, name: 'Financeiro', icon: DollarSign },
    { id: 5, name: 'Clientes', icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <Activity className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Carregando Dados de Expedição...</p>
      </div>
    );
  }

  // Render subpages based on activeTab
  const renderSubPage = () => {
    switch (activeTab) {
      case 0: // VISÃO GERAL
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard title="Total de Pedidos" value={formatNumber(metrics.totalOrders)} icon={Package} color="blue" />
              <KpiCard title="Valor Total" value={formatCurrency(metrics.totalRevenue)} icon={DollarSign} color="emerald" />
              <KpiCard title="Faturamento Parcial" value={formatCurrency(metrics.totalPartialFaturamento)} icon={Coins} color="emerald" />
              <KpiCard title="Peso Expedido" value={formatWeight(metrics.totalWeight)} icon={Truck} color="amber" />
              <KpiCard title="Ticket Médio" value={formatCurrency(metrics.avgTicket)} icon={Activity} color="indigo" />
              <KpiCard title="Peso Médio/Pedido" value={formatWeight(metrics.avgWeight)} icon={TrendingUp} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-primary" /> Pedidos por Status
                  </h3>
                </div>
                
                <div className="h-80 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusChartData}
                        cx="40%" cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {metrics.statusChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
                                <p className="text-lg font-black text-white">{formatNumber(Number(payload[0].value))} <span className="text-xs text-slate-400 font-medium">Pedidos</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{value}</span>
                        )}
                        wrapperStyle={{
                          paddingLeft: '20px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" /> Volume Diário (Contagem)
                  </h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.volumeEvolutionChartData.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label === 'N/D' ? 'Data Indefinida' : label}</p>
                                <p className="text-lg font-black text-white">{formatNumber(Number(payload[0].value))} <span className="text-xs text-slate-400 font-medium">Pedidos</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // EXPEDIÇÃO
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title="% Pedidos Liberados" 
                value={`${metrics.releasedPercent.toFixed(1)}%`} 
                icon={CheckCircle2} 
                color="emerald" 
                progress={metrics.releasedPercent}
                secondaryText={`${formatNumber(metrics.releasedOrders)} Pedidos`}
              />
              <KpiCard title="Aguardando Coleta" value={formatNumber(metrics.waitingCollection)} icon={Clock3} color="amber" secondaryText="Total de pedidos" />
              <KpiCard title="Faturamento Parcial" value={formatCurrency(metrics.totalPartialFaturamento)} icon={Coins} color="emerald" secondaryText="Saldo Restante" />
              <KpiCard title="Backlog (Não Liberados)" value={formatNumber(metrics.backlogCount)} icon={AlertCircle} color="rose" secondaryText="Pendentes" />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm col-span-1">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Peso por Status (kg)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.statusWeightChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black text-white">{formatWeight(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // PERFORMANCE
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KpiCard 
                title="Peso das Cores Alvo" 
                value={formatWeight(metrics.weightTargetTotalSum)} 
                icon={Target} 
                color="indigo" 
                secondaryText="SOMA: NATURAL + PINTADO" 
              />
              <KpiCard title="Pedidos Atrasados" value={formatNumber(metrics.lateOrders)} icon={AlertCircle} color="rose" secondaryText="Atrasados vs Hoje" />
            </div>

            {metrics.target && (
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group mb-6">
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-8 relative z-10 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" /> Metas de Peso {selectedMonth === 'Todos' ? 'Anual' : `Mensal - ${selectedMonth}`}
                </h3>

                <div className="space-y-8 relative z-10">
                  {/* Total Weight Target */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Total (Meta)</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">{formatWeight(metrics.weightTargetTotalSum)} / {formatWeight(metrics.target.total)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black ${metrics.weightTargetTotalSum >= metrics.target.total ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {((metrics.weightTargetTotalSum / metrics.target.total) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (metrics.weightTargetTotalSum / metrics.target.total) * 100)}%` }}
                        className={`h-full rounded-full ${metrics.weightTargetTotalSum >= metrics.target.total ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Natural Weight Target */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Natural</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatWeight(metrics.weightNatural)} / {formatWeight(metrics.target.natural)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${metrics.weightNatural >= metrics.target.natural ? 'text-emerald-500' : 'text-blue-500'}`}>
                            {((metrics.weightNatural / metrics.target.natural) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (metrics.weightNatural / metrics.target.natural) * 100)}%` }}
                          className={`h-full rounded-full ${metrics.weightNatural >= metrics.target.natural ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        />
                      </div>
                    </div>

                    {/* Pintado Weight Target */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Pintado</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatWeight(metrics.weightPintado)} / {formatWeight(metrics.target.pintado)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${metrics.weightPintado >= metrics.target.pintado ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {((metrics.weightPintado / metrics.target.pintado) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (metrics.weightPintado / metrics.target.pintado) * 100)}%` }}
                          className={`h-full rounded-full ${metrics.weightPintado >= metrics.target.pintado ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {metrics.weightTargetTotalSum < metrics.target.total && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                        Faltam {formatWeight(metrics.target.total - metrics.weightTargetTotalSum)} para atingir a meta total.
                      </p>
                    </div>
                  )}
                  {metrics.weightTargetTotalSum >= metrics.target.total && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        Meta atingida e superada em {formatWeight(metrics.weightTargetTotalSum - metrics.target.total)}!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" /> Detalhamento de Pedidos ({searchedOrders.length})
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lista completa de pedidos filtrados</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar por pedido, cliente ou cor" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-1"><Hash className="w-3 h-3" /> Pedido</div></th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cor</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Data Fat.</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Data Entr.</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Peso</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedOrders.length > 0 ? (
                      paginatedOrders.map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-4 font-black text-primary text-xs">{item.pedido}</td>
                          <td className="px-4 py-4">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase truncate max-w-[200px]">{item.cliente}</p>
                          </td>
                          <td className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase">
                            {item.cor}
                          </td>
                          <td className="px-4 py-4 text-center text-[10px] font-bold text-primary whitespace-nowrap">
                            {item.dataFaturamento?.toLocaleDateString('pt-BR') || '-'}
                          </td>
                          <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-500 whitespace-nowrap">
                            {item.dataEntrega?.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-4 text-right font-black text-slate-700 dark:text-slate-300 text-xs">
                            {formatWeight(item.peso)}
                          </td>
                          <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-xs text-nowrap">
                            {formatCurrency(item.valor)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              item.status === 'LIBERADO' 
                                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' 
                                : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-20 text-center">
                          <div className="flex flex-col items-center opacity-40">
                            <Search className="w-10 h-10 mb-2" />
                            <p className="text-xs font-black uppercase tracking-widest">Nenhum pedido encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-2 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) pageNumber = i + 1;
                      else if (currentPage <= 3) pageNumber = i + 1;
                      else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i;
                      else pageNumber = currentPage - 2 + i;

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                            currentPage === pageNumber 
                              ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3: // VOLUME E LOGÍSTICA
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Peso por Cliente (Top 10)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.topClientsByWeight} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} fontSize={10} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black text-white">{formatWeight(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Peso por Cor</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.weightByColorChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black text-white">{formatWeight(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Top 5 Pedidos mais Pesados</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={metrics.top5Heaviest} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                              <p className="text-lg font-black text-white">{formatWeight(Number(payload[0].value))}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case 4: // FINANCEIRO
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <KpiCard title="Valor Total" value={formatCurrency(metrics.totalRevenue)} icon={DollarSign} color="emerald" />
               <KpiCard title="Backlog Financeiro" value={formatCurrency(metrics.financialBacklog)} icon={AlertCircle} color="rose" secondaryText="Pedidos em aberto" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Valor por Cliente (Top 10)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.topClientsByValue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} fontSize={10} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black text-white">{formatCurrency(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-emerald-500" /> Valor por Status
                  </h3>
                </div>
                
                <div className="h-80 relative z-10">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusValueChartData}
                        cx="40%" cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {metrics.statusValueChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
                                <p className="text-lg font-black text-white">{formatCurrency(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{value}</span>
                        )}
                        wrapperStyle={{
                          paddingLeft: '20px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      case 5: // CLIENTES
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Pedidos por Cliente</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.topClientsByOrders} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={10} width={100} axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black text-white">{formatNumber(Number(payload[0].value))} <span className="text-xs text-slate-400 font-medium ml-1">Pedidos</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Ticket Médio por Cliente</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.avgTicketByClient} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={10} width={100} axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black text-white">{formatCurrency(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Peso por Cliente (Top 10)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.topClientsByWeight} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={10} width={100} axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl shadow-black/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black text-white">{formatWeight(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            {tabs[activeTab]?.name || 'Expedição de Perfil'}
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest text-[10px]">Controle de pedidos, volume e logística de expedição</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-slate-800 p-2 rounded-xl flex items-center gap-3 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-slate-600">
               <Filter className="w-3.5 h-3.5 text-primary" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
            </div>
            <div className="flex items-center gap-1">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">Ano:</span>
               <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-800 dark:text-white outline-none cursor-pointer">
                  {years.map(y => <option key={y} value={y} className="bg-white dark:bg-slate-800">{y}</option>)}
               </select>
            </div>
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-slate-200 dark:border-slate-600">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">Mês:</span>
               <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-800 dark:text-white outline-none cursor-pointer">
                  <option value="Todos" className="bg-white dark:bg-slate-800">Todos</option>
                  {months.map(m => <option key={m} value={m} className="bg-white dark:bg-slate-800">{m}</option>)}
               </select>
            </div>
          </div>
          <button 
            onClick={() => setShowPrintPreview(true)}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 text-rose-500 no-print"
          >
            <Printer className="w-4 h-4" /> Relatório
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="no-print"
        >
          {renderSubPage()}
        </motion.div>
      </AnimatePresence>

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-500 print:relative print:block">
          <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print">
            <div className="flex items-center">
              <Printer className="mr-2 w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-widest text-white">Relatório de Expedição</span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPrintPreview(false)} 
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all active:scale-95 text-white"
              >
                <X className="w-4 h-4 mr-2" /> Voltar
              </button>
              <button 
                onClick={handleConfirmPrint} 
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all shadow-lg active:scale-95 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Impressão
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-12 print:p-0">
            <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 shadow-xl print:shadow-none print:border-none">
              <header className="mb-8 text-center border-b-[3px] border-black pb-4">
                <h1 className="text-5xl font-black mb-1 text-black">ALUMASA</h1>
                <p className="text-xl font-bold mb-4 uppercase text-black italic">Alumínio & Plástico</p>
                <div className="py-2">
                  <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO DE EXPEDIÇÃO DE PERFIL</h2>
                  <p className="text-xs font-bold text-black uppercase">Período (Faturamento): {selectedMonth} / {selectedYear}</p>
                </div>
              </header>

              <section className="mb-8 w-full no-break-inside">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES DE PERFORMANCE (BASEADO EM FATURAMENTO)</h3>
                <table className="w-full text-sm border-collapse border border-black">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Total de Pedidos</td>
                      <td className="p-3 font-black text-black">{formatNumber(metrics.totalOrders)} unidades</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Valor Total Faturado</td>
                      <td className="p-3 font-black text-black">{formatCurrency(metrics.totalRevenue)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Peso Total Expedido</td>
                      <td className="p-3 font-black text-black">{formatWeight(metrics.totalWeight)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Ticket Médio (Financeiro)</td>
                      <td className="p-3 font-black text-black">{formatCurrency(metrics.avgTicket)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Peso Médio por Pedido</td>
                      <td className="p-3 font-black text-black">{formatWeight(metrics.avgWeight)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Percentual de Pedidos Liberados</td>
                      <td className="p-3 font-black text-black">{metrics.releasedPercent.toFixed(1)}%</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Backlog Atual (Não Liberados)</td>
                      <td className="p-3 font-black text-black">{formatNumber(metrics.backlogCount)} pedidos ({formatCurrency(metrics.unreleasedFinancialBacklog)})</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Pedidos em Atraso (Data Entrega)</td>
                      <td className="p-3 font-black text-black">{formatNumber(metrics.lateOrders)} pedidos</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Faturamento Parcial (Saldo Restante)</td>
                      <td className="p-3 font-black text-black">{formatCurrency(metrics.totalPartialFaturamento)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full no-break-inside">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. DISTRIBUIÇÃO POR STATUS & TOP CLIENTES</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <table className="w-full text-[9px] border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <th className="p-2 text-left font-black uppercase border-r border-black text-black">Status</th>
                          <th className="p-2 text-right font-black uppercase text-black">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.statusChartData.map((s, i) => (
                          <tr key={i} className="border-b border-black last:border-b-0">
                            <td className="p-2 border-r border-black font-bold uppercase text-black">{s.name}</td>
                            <td className="p-2 text-right font-black text-black">{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table className="w-full text-[9px] border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <th className="p-2 text-left font-black uppercase border-r border-black text-black">Top 5 Clientes (Valor)</th>
                          <th className="p-2 text-right font-black uppercase text-black">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topClientsByValue.slice(0, 5).map((c, i) => (
                          <tr key={i} className="border-b border-black last:border-b-0">
                            <td className="p-2 border-r border-black font-bold uppercase text-black truncate max-w-[100px]">{c.name}</td>
                            <td className="p-2 text-right font-black text-black">{formatCurrency(c.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="mb-8 w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. DETALHAMENTO DOS PEDIDOS</h3>
                <table className="w-full text-[9px] border-collapse border border-black text-black">
                  <thead style={{ display: 'table-header-group' }}>
                    <tr className="bg-gray-100 text-black">
                      <th className="border border-black p-2 text-left font-black uppercase">Cliente</th>
                      <th className="border border-black p-2 text-center font-black uppercase">Pedido</th>
                      <th className="border border-black p-2 text-center font-black uppercase">Faturamento</th>
                      <th className="border border-black p-2 text-center font-black uppercase">Cor</th>
                      <th className="border border-black p-2 text-right font-black uppercase">Valor</th>
                      <th className="border border-black p-2 text-right font-black uppercase">Peso</th>
                      <th className="border border-black p-2 text-center font-black uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="border-b border-black" style={{ pageBreakInside: 'avoid' }}>
                        <td className="border-r border-black p-1.5 font-bold uppercase truncate max-w-[150px]">{item.cliente}</td>
                        <td className="border-r border-black p-1.5 text-center font-black">{item.pedido}</td>
                        <td className="border-r border-black p-1.5 text-center font-bold text-[8px]">{item.dataFaturamento?.toLocaleDateString('pt-BR') || '-'}</td>
                        <td className="border-r border-black p-1.5 text-center font-black uppercase text-[8px]">{item.cor}</td>
                        <td className="border-r border-black p-1.5 text-right font-black">{formatCurrency(item.valor)}</td>
                        <td className="border-r border-black p-1.5 text-right font-black">{formatWeight(item.peso)}</td>
                        <td className="p-1.5 text-center text-[7px] font-black uppercase">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <footer className="mt-12 pt-10 flex justify-between gap-24 no-break-inside">
                <div className="text-center flex-1">
                  <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Logística / Expedição</div>
                </div>
                <div className="text-center flex-1">
                  <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Comercial</div>
                </div>
              </footer>
              <div className="mt-4 text-center text-[7px] font-bold text-gray-500 uppercase tracking-widest no-break-inside">
                Relatório Gerencial Alumasa - Emitido em: {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponents
const KpiCard: React.FC<{ 
  title: string; 
  value: string; 
  icon: any; 
  color: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';
  secondaryText?: string;
  progress?: number;
}> = ({ title, value, icon: Icon, color, secondaryText, progress }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-400/10 border-blue-100 dark:border-blue-400/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-100 dark:border-emerald-400/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-400/10 border-amber-100 dark:border-amber-400/20',
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-400/10 border-indigo-100 dark:border-indigo-400/20',
    rose: 'text-rose-600 bg-rose-50 dark:bg-rose-400/10 border-rose-100 dark:border-rose-400/20',
  };

  const barColorMap = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] dark:opacity-[0.07] transition-transform group-hover:scale-110 group-hover:rotate-12`}>
        <Icon className="w-full h-full" />
      </div>
      
      <div className="flex items-start justify-between relative z-10 mb-2">
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">{value}</h4>
        {secondaryText && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{secondaryText}</p>}
        
        {progress !== undefined && (
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full ${barColorMap[color]}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpedicaoPerfil;

