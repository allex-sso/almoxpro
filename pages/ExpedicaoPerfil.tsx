
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
  CheckCircle2, AlertCircle, Clock3, Download,
  Truck, BarChart3, LayoutDashboard, PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpedicaoPerfilProps {
  data: ExpedicaoPedido[];
  isLoading: boolean;
  initialTab?: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const ExpedicaoPerfil: React.FC<ExpedicaoPerfilProps> = ({ data, isLoading, initialTab = 0 }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Helper formatting functions
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const formatNumber = (val: number) => 
    new Intl.NumberFormat('pt-BR').format(val);

  const formatWeight = (val: number) => 
    `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val)} kg`;

  // Calculated Metrics
  const metrics = useMemo(() => {
    const totalOrders = data.length;
    const totalRevenue = data.reduce((acc, curr) => acc + curr.valor, 0);
    const totalWeight = data.reduce((acc, curr) => acc + curr.peso, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgWeight = totalOrders > 0 ? totalWeight / totalOrders : 0;

    // Status processing
    const statusCounts: Record<string, number> = {};
    const statusWeights: Record<string, number> = {};
    const statusValues: Record<string, number> = {};
    
    data.forEach(item => {
      const st = item.status || 'OUTROS';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      statusWeights[st] = (statusWeights[st] || 0) + item.peso;
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
    let totalLeadTime = 0;
    let leadTimeCount = 0;
    const leadTimeByDate: Record<string, { total: number, count: number }> = {};
    const dailyVolume: Record<string, number> = {};

    data.forEach(item => {
      if (item.dataEmbarque && item.dataSolicitacao) {
        const diff = (item.dataEmbarque.getTime() - item.dataSolicitacao.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          totalLeadTime += diff;
          leadTimeCount++;
          
          const dateStr = item.dataEmbarque.toLocaleDateString('pt-BR').slice(0, 5);
          if (!leadTimeByDate[dateStr]) leadTimeByDate[dateStr] = { total: 0, count: 0 };
          leadTimeByDate[dateStr].total += diff;
          leadTimeByDate[dateStr].count += 1;
        }
      }
      
      const dateKey = (item.dataEmbarque || item.dataSolicitacao)?.toLocaleDateString('pt-BR').slice(0, 5) || 'N/D';
      dailyVolume[dateKey] = (dailyVolume[dateKey] || 0) + 1;
    });

    const avgLeadTime = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0;
    
    const leadEvolutionChartData = Object.keys(leadTimeByDate).sort().map(date => ({
      date,
      avg: leadTimeByDate[date].total / leadTimeByDate[date].count
    }));

    const volumeEvolutionChartData = Object.keys(dailyVolume).sort().map(date => ({
      date,
      count: dailyVolume[date]
    }));

    // Backlog calculated metrics
    const releasedOrders = data.filter(item => item.status === 'LIBERADO').length;
    const releasedPercent = totalOrders > 0 ? (releasedOrders / totalOrders) * 100 : 0;
    const waitingCollection = data.filter(item => item.status === 'AGUARDANDO COLETA').length;
    const backlogCount = data.filter(item => item.status !== 'LIBERADO').length;
    const financialBacklog = data.filter(item => item.status !== 'LIBERADO').reduce((acc, curr) => acc + curr.valor, 0);

    // Group by Client
    const clientStats: Record<string, { orders: number, value: number, weight: number, leadTimeSum: number, leadTimeCount: number }> = {};
    data.forEach(item => {
      if (!clientStats[item.cliente]) {
        clientStats[item.cliente] = { orders: 0, value: 0, weight: 0, leadTimeSum: 0, leadTimeCount: 0 };
      }
      clientStats[item.cliente].orders += 1;
      clientStats[item.cliente].value += item.valor;
      clientStats[item.cliente].weight += item.peso;
      
      if (item.dataEmbarque && item.dataSolicitacao) {
        const diff = (item.dataEmbarque.getTime() - item.dataSolicitacao.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          clientStats[item.cliente].leadTimeSum += diff;
          clientStats[item.cliente].leadTimeCount += 1;
        }
      }
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
    data.forEach(item => {
      weightByColor[item.cor] = (weightByColor[item.cor] || 0) + item.peso;
    });

    const weightByColorChartData = Object.keys(weightByColor).map(name => ({
      name,
      value: weightByColor[name]
    })).sort((a, b) => b.value - a.value);

    // Top 5 heaviest orders
    const top5Heaviest = [...data]
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 5)
      .map(item => ({
        name: `Pedido ${item.pedido}`,
        value: item.peso,
        cliente: item.cliente
      }));

    // Late orders
    const today = new Date();
    const lateOrders = data.filter(item => 
      item.dataEntrega && item.dataEntrega < today && item.status !== 'LIBERADO'
    ).length;

    return {
      totalOrders, totalRevenue, totalWeight, avgTicket, avgWeight,
      statusChartData, statusWeightChartData, statusValueChartData,
      avgLeadTime, leadEvolutionChartData, volumeEvolutionChartData,
      releasedPercent, waitingCollection, backlogCount, financialBacklog,
      topClientsByWeight, topClientsByValue, topClientsByOrders,
      avgTicketByClient, avgLeadTimeByClient,
      weightByColorChartData, top5Heaviest, lateOrders
    };
  }, [data]);

  const tabs = [
    { id: 0, name: 'Visão Geral', icon: LayoutDashboard },
    { id: 1, name: 'Expedição', icon: Truck },
    { id: 2, name: 'Tempo & Performance', icon: Clock },
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard title="Total de Pedidos" value={formatNumber(metrics.totalOrders)} icon={Package} color="blue" />
              <KpiCard title="Valor Faturado" value={formatCurrency(metrics.totalRevenue)} icon={DollarSign} color="emerald" />
              <KpiCard title="Peso Expedido" value={formatWeight(metrics.totalWeight)} icon={Truck} color="amber" />
              <KpiCard title="Ticket Médio" value={formatCurrency(metrics.avgTicket)} icon={Activity} color="indigo" />
              <KpiCard title="Peso Médio/Pedido" value={formatWeight(metrics.avgWeight)} icon={TrendingUp} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-primary" /> Pedidos por Status
                  </h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusChartData}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {metrics.statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
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
                    <BarChart data={metrics.volumeEvolutionChartData.slice(-15)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard title="% Pedidos Liberados" value={`${metrics.releasedPercent.toFixed(1)}%`} icon={CheckCircle2} color="emerald" progress={metrics.releasedPercent} />
              <KpiCard title="Aguardando Coleta" value={formatNumber(metrics.waitingCollection)} icon={Clock3} color="amber" secondaryText="Total de pedidos" />
              <KpiCard title="Backlog (Não Liberados)" value={formatNumber(metrics.backlogCount)} icon={AlertCircle} color="rose" secondaryText="Pendentes" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Pedidos por Status Status</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.statusChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: 'right' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Peso por Status (kg)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.statusWeightChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val) => formatWeight(Number(val))} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // TEMPO E PERFORMANCE
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KpiCard title="Lead Time Médio Geral" value={`${metrics.avgLeadTime.toFixed(1)} dias`} icon={Clock} color="indigo" secondaryText="Solicitação até Embarque" />
              <KpiCard title="Pedidos Atrasados" value={formatNumber(metrics.lateOrders)} icon={AlertCircle} color="rose" secondaryText="Atrasados vs Hoje" />
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Lead Time (Dias) - Evolução</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.leadEvolutionChartData.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Lead Time Médio" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
               <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 px-2">Pedidos com datas inconsistentes ou pendentes</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-bold">
                     <tr>
                       <th className="px-4 py-3">Pedido</th>
                       <th className="px-4 py-3">Solicitação</th>
                       <th className="px-4 py-3">Entrega</th>
                       <th className="px-4 py-3">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {data.slice(0, 5).map(item => (
                       <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                         <td className="px-4 py-3 font-bold">{item.pedido}</td>
                         <td className="px-4 py-3">{item.dataSolicitacao?.toLocaleDateString()}</td>
                         <td className="px-4 py-3">{item.dataEntrega?.toLocaleDateString()}</td>
                         <td className="px-4 py-3">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                             item.status === 'LIBERADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                           }`}>
                             {item.status}
                           </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
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
                      <Tooltip formatter={(val) => formatWeight(Number(val))} />
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
                      <Tooltip formatter={(val) => formatWeight(Number(val))} />
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
                    <Tooltip formatter={(val) => formatWeight(Number(val))} />
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
               <KpiCard title="Total Faturado" value={formatCurrency(metrics.totalRevenue)} icon={DollarSign} color="emerald" />
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
                      <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Valor por Status</h3>
                <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusValueChartData}
                        cx="50%" cy="50%"
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {metrics.statusValueChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                      <Legend />
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
                      <Tooltip />
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
                      <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Tempo Médio (Dias) por Cliente</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.avgLeadTimeByClient} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={10} width={100} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val) => `${Number(val).toFixed(1)} dias`} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            {tabs[activeTab]?.name || 'Expedição de Perfil'}
          </h1>
          <p className="text-slate-500 text-sm font-medium">Controle de pedidos, volume e logística de expedição</p>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Download className="w-4 h-4 text-slate-500" />
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-700 shadow-sm rounded-md text-primary tracking-widest uppercase">Gráficos</button>
                <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 tracking-widest uppercase">Tabelas</button>
            </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderSubPage()}
        </motion.div>
      </AnimatePresence>
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

