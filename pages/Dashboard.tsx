import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Package, DollarSign, ArrowDownRight, ArrowUpRight, TrendingUp, Filter, Calendar, Info } from 'lucide-react';
import StatCard from '../components/StatCard';
import { DashboardStats, InventoryItem, Movement } from '../types';

interface DashboardProps {
  data: InventoryItem[];
  stats: DashboardStats;
  movements?: Movement[];
}

const Dashboard: React.FC<DashboardProps> = ({ data, movements = [] }) => {
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [equipmentFilter, setEquipmentFilter] = useState('Todos');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.categoria).filter(Boolean)))], [data]);
  const equipments = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.equipamento).filter(Boolean)))], [data]);

  // --- FILTER LOGIC ---
  const filteredItems = useMemo(() => {
    return data.filter(item => {
      const matchesCategory = categoryFilter === 'Todos' || item.categoria === categoryFilter;
      const matchesEquipment = equipmentFilter === 'Todos' || item.equipamento === equipmentFilter;
      
      // Filtro de data nos itens (se tiver data de atualização ou movimentação)
      let matchesDate = true;
      if (startDate && endDate && item.ultimaMovimentacao) {
          const itemDate = new Date(item.ultimaMovimentacao);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59); // Fim do dia
          matchesDate = itemDate >= start && itemDate <= end;
      }

      return matchesCategory && matchesEquipment && matchesDate;
    });
  }, [data, categoryFilter, equipmentFilter, startDate, endDate]);

  // --- TIMELINE DATA LOGIC (New) ---
  const timelineData = useMemo(() => {
    if (!movements.length) return [];

    const filteredCodes = new Set(filteredItems.map(i => i.codigo));
    
    // Filtra movimentos pelos itens selecionados e pelo intervalo de datas
    const relevantMoves = movements.filter(m => {
        if (!filteredCodes.has(m.codigo)) return false;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59);
            return m.data >= start && m.data <= end;
        }
        return true;
    });

    // Agrupa por data
    const grouped: Record<string, { date: string, entradas: number, saidas: number }> = {};
    
    relevantMoves.forEach(m => {
        const dateKey = m.data.toLocaleDateString('pt-BR'); // dd/mm/yyyy
        if (!grouped[dateKey]) {
            grouped[dateKey] = { date: dateKey, entradas: 0, saidas: 0 };
        }
        if (m.tipo === 'entrada') grouped[dateKey].entradas += m.quantidade;
        if (m.tipo === 'saida') grouped[dateKey].saidas += m.quantidade;
    });

    // Converte para array e ordena por data (Requer conversão da string BR de volta para ordenar)
    return Object.values(grouped).sort((a, b) => {
        const [da, ma, ya] = a.date.split('/').map(Number);
        const [db, mb, yb] = b.date.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });

  }, [movements, filteredItems, startDate, endDate]);

  const filteredStats = useMemo(() => {
    // Se tivermos movimentos carregados, calculamos entradas/saidas reais do período
    // Caso contrário usamos o snapshot do item
    const periodIn = timelineData.reduce((acc, d) => acc + d.entradas, 0);
    const periodOut = timelineData.reduce((acc, d) => acc + d.saidas, 0);
    const hasTimeline = timelineData.length > 0;

    return {
      totalItems: filteredItems.length,
      totalValue: filteredItems.reduce((acc, item) => acc + item.valorTotal, 0),
      // Se tiver filtro de data, usa o calculado da timeline, senão usa o acumulado do item
      totalIn: (startDate || endDate) && hasTimeline ? periodIn : filteredItems.reduce((acc, item) => acc + item.entradas, 0),
      totalOut: (startDate || endDate) && hasTimeline ? periodOut : filteredItems.reduce((acc, item) => acc + item.saidas, 0),
    };
  }, [filteredItems, timelineData, startDate, endDate]);

  // Chart Data: Category
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; entradas: number; saidas: number }> = {};
    filteredItems.forEach(item => {
      const cat = item.categoria || 'Outros';
      if (!map[cat]) map[cat] = { name: cat, entradas: 0, saidas: 0 };
      map[cat].entradas += item.entradas;
      map[cat].saidas += item.saidas;
    });
    return Object.values(map).sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas)).slice(0, 12);
  }, [filteredItems]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {movements.length > 0 ? 'Dados integrados de Estoque, Entradas e Saídas.' : 'Visualizando apenas dados do estoque atual.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto bg-white dark:bg-dark-card p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 items-center">
           
           {/* Date Range */}
           <div className="flex items-center gap-2 px-2 border-r border-gray-200 dark:border-gray-700 mr-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-slate-300">-</span>
              <input 
                type="date" 
                className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
           </div>

           {/* Selectors */}
           <div className="flex items-center gap-2">
             <Filter className="w-4 h-4 text-slate-400" />
             <select 
                className="px-2 py-1 rounded bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                className="px-2 py-1 rounded bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
              >
                {equipments.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
           </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Itens Cadastrados" value={filteredStats.totalItems} icon={Package} color="blue" />
        <StatCard title="Valor em Estoque" value={formatCurrency(filteredStats.totalValue)} icon={DollarSign} color="green" />
        <StatCard 
          title={startDate ? "Entradas (Período)" : "Entradas (Total)"} 
          value={filteredStats.totalIn} 
          icon={ArrowDownRight} 
          color="purple" 
          trendUp={true} 
        />
        <StatCard 
          title={startDate ? "Saídas (Período)" : "Saídas (Total)"} 
          value={filteredStats.totalOut} 
          icon={ArrowUpRight} 
          color="red" 
          trendUp={false} 
        />
      </div>

      {/* TIMELINE CHART (NEW) */}
      {timelineData.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Evolução Diária (Entradas vs Saídas)
           </h3>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" />
                   <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                   />
                   <Legend />
                   <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#8b5cf6" strokeWidth={3} dot={{r:3}} activeDot={{r:6}} />
                   <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" strokeWidth={3} dot={{r:3}} activeDot={{r:6}} />
                </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Movimentação por Categoria</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="saidas" name="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Consumo */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Maior Saída (Top 5)</h3>
          <div className="space-y-3">
            {filteredItems.sort((a, b) => b.saidas - a.saidas).slice(0, 5).map((item, idx) => (
               <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                       {idx + 1}
                     </div>
                     <div className="min-w-0">
                        <p className="text-sm font-medium truncate dark:text-white" title={item.descricao}>{item.descricao}</p>
                        <p className="text-xs text-gray-500">{item.codigo}</p>
                     </div>
                  </div>
                  <span className="font-bold text-rose-500 text-sm">-{item.saidas}</span>
               </div>
            ))}
             {filteredItems.length === 0 && <p className="text-gray-400 text-center text-sm py-4">Sem dados.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;