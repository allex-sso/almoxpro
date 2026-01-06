import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, Building, Package, TrendingUp, Link as LinkIcon, Activity, ChevronDown, Calendar } from 'lucide-react';
import StatCard from '../components/StatCard';
import { Movement } from '../types';

interface CentralDashboardProps {
  data: Movement[];
  isLoading: boolean;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CentralDashboard: React.FC<CentralDashboardProps> = ({ data, isLoading }) => {
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');

  // Extrai anos disponíveis nos dados globais
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    data.forEach(m => {
      if (m.data) years.add(m.data.getFullYear().toString());
    });
    return ['Todos', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [data]);

  // Filtra os dados com base na seleção de Ano e Mês em todas as fontes consolidadas
  const filteredData = useMemo(() => {
    return data.filter(m => {
      const yearMatch = selectedYear === 'Todos' || m.data.getFullYear().toString() === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || months[m.data.getMonth()] === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [data, selectedYear, selectedMonth]);

  const metrics = useMemo(() => {
    const bySector: Record<string, number> = {};
    const byRequester: Record<string, { total: number, count: number }> = {};
    const byProfile: Record<string, number> = {};
    let totalItems = 0;
    const movementCount = filteredData.length;

    filteredData.forEach(m => {
      totalItems += m.quantidade;
      const sector = m.setor || 'Outros';
      bySector[sector] = (bySector[sector] || 0) + m.quantidade;
      const req = m.responsavel || 'N/D';
      if (!byRequester[req]) byRequester[req] = { total: 0, count: 0 };
      byRequester[req].total += m.quantidade;
      byRequester[req].count += 1;
      const profile = m.perfil || 'Geral';
      byProfile[profile] = (byProfile[profile] || 0) + m.quantidade;
    });

    const avgPerMovement = movementCount > 0 ? (totalItems / movementCount).toFixed(1) : "0";

    return {
      totalItems,
      movementCount,
      avgPerMovement,
      sectorData: Object.entries(bySector).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10),
      requesterData: Object.entries(byRequester).map(([name, s]) => ({ 
        name, 
        total: s.total, 
        avg: (s.total / s.count).toFixed(2) 
      })).sort((a,b) => b.total - a.total).slice(0, 10),
      profileData: Object.entries(byProfile).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8)
    };
  }, [filteredData]);

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Carregando indicadores central...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-sans tracking-tight">Indicadores Central</h1>
          <p className="text-sm text-slate-500 font-medium">Consolidado de todas as fontes de dados cadastradas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Período Consolidado */}
            <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-gray-800 mr-1">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Período:</span>
                </div>

                {/* Ano */}
                <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[100px]">
                   <span className="text-[9px] font-black text-slate-400 mr-2 uppercase">Ano</span>
                   <select 
                     value={selectedYear}
                     onChange={(e) => setSelectedYear(e.target.value)}
                     className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full"
                   >
                     {yearOptions.map(y => (
                       <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{y}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>

                {/* Mês */}
                <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[130px]">
                   <span className="text-[9px] font-black text-slate-400 mr-2 uppercase">Mês</span>
                   <select 
                     value={selectedMonth}
                     onChange={(e) => setSelectedMonth(e.target.value)}
                     className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full"
                   >
                     <option value="Todos" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Todos</option>
                     {months.map(m => (
                       <option key={m} value={m} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{m}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Itens Saídos" value={metrics.totalItems} icon={Package} color="blue" />
        <StatCard title="Setores Atendidos" value={metrics.sectorData.length} icon={Building} color="green" />
        <StatCard title="Solicitantes Ativos" value={metrics.requesterData.length} icon={Users} color="purple" />
        <StatCard title="Média de Itens p/ Saída" value={metrics.avgPerMovement} icon={Activity} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-500" /> Quantidade por Setor
          </h3>
          <div className="h-72">
            {metrics.sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.sectorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                  <Tooltip cursor={{fill: 'rgba(37, 99, 235, 0.05)'}} />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Distribuição por Perfil
          </h3>
          <div className="h-72">
            {metrics.profileData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.profileData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {metrics.profileData.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 font-bold text-slate-800 dark:text-white uppercase tracking-widest text-xs">
            Ranking de Consumo por Solicitante
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4 text-center">Total de Itens</th>
                  <th className="px-6 py-4 text-center">Média por Saída</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {metrics.requesterData.map((req, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium dark:text-white">{req.name}</td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600">{req.total}</td>
                    <td className="px-6 py-4 text-center text-slate-500 font-mono">{req.avg}</td>
                  </tr>
                ))}
                {metrics.requesterData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">Nenhum registro encontrado nas fontes ou período selecionado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default CentralDashboard;