import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Filter } from 'lucide-react';
import { InventoryItem } from '../types';

interface ConsumptionProps {
  data: InventoryItem[];
}

const Consumption: React.FC<ConsumptionProps> = ({ data }) => {
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Extract categories
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.categoria).filter(Boolean)))], [data]);

  // Filter Data
  const filteredData = useMemo(() => {
     if (categoryFilter === 'Todos') return data;
     return data.filter(item => item.categoria === categoryFilter);
  }, [data, categoryFilter]);

  // Process data for charts
  const equipmentData = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      const eq = item.equipamento || 'Sem Equipamento';
      if (!map[eq]) map[eq] = 0;
      map[eq] += item.saidas; // Saídas = Consumo
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [filteredData]);

  const categoryConsumption = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      const cat = item.categoria || 'Geral';
      if (!map[cat]) map[cat] = 0;
      map[cat] += item.saidas;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-800 dark:text-white">Análise de Consumo</h2>
           <p className="text-sm text-slate-500">Detalhamento de onde os itens estão sendo utilizados.</p>
        </div>
        
        <div className="flex items-center bg-white dark:bg-dark-card p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
             <Filter className="w-4 h-4 text-gray-400 ml-2 mr-2" />
             <select 
              className="px-3 py-1.5 rounded-md bg-transparent text-sm focus:outline-none dark:text-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Top Equipment */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Consumo por Equipamento (Top 8)
            {categoryFilter !== 'Todos' && <span className="text-sm font-normal text-gray-500 ml-2">em {categoryFilter}</span>}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={equipmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {equipmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {equipmentData.length === 0 && <p className="text-center text-gray-400 mt-4">Sem dados de consumo para este filtro.</p>}
        </div>

        {/* Chart 2: Category Bar */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Comparativo por Categoria</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryConsumption} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} stroke="#64748b" tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                    {categoryConsumption.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Detalhamento de Consumo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
             <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-300">
                <tr>
                    <th className="px-6 py-3">Equipamento</th>
                    <th className="px-6 py-3 text-right">Total Peças Consumidas</th>
                    <th className="px-6 py-3 text-right">% do Total Selecionado</th>
                </tr>
             </thead>
             <tbody>
                {equipmentData.map((item, index) => {
                    const total = equipmentData.reduce((acc, curr) => acc + curr.value, 0);
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    return (
                        <tr key={index} className="bg-white border-b dark:bg-dark-card dark:border-gray-700">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                            <td className="px-6 py-4 text-right font-bold">{item.value}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs">{percent}%</span>
                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                {equipmentData.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-gray-400">Nenhum dado disponível.</td></tr>
                )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Consumption;