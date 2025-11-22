import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';
import { Filter, DollarSign, Users, Wrench } from 'lucide-react';
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

  // 1. COST BY EQUIPMENT (Financeiro)
  const costByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      const eq = item.equipamento || 'Geral';
      // Custo = Qtd Saída * Valor Unitário
      const cost = item.saidas * item.valorUnitario;
      if (!map[eq]) map[eq] = 0;
      map[eq] += cost;
    });
    
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10
  }, [filteredData]);

  // 2. TOP SUPPLIERS (Volume de Compras/Estoque)
  const supplierData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      const forn = item.fornecedor || 'Desconhecido';
      // Considerando valor total em estoque + valor já consumido (entradas totais * custo)
      // Isso dá uma ideia do volume de negócios com o fornecedor
      const volume = item.entradas * item.valorUnitario;
      
      if (!map[forn]) map[forn] = 0;
      map[forn] += volume;
    });

    return Object.entries(map)
      .filter(([name]) => name !== 'Desconhecido' && name !== 'N/D')
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Análise de Custos</h2>
           <p className="text-sm text-slate-500">Onde o dinheiro está sendo gasto e principais parceiros.</p>
        </div>
        
        <div className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
             <Filter className="w-4 h-4 text-gray-400 ml-2 mr-2" />
             <select 
              className="px-3 py-1.5 rounded-md bg-transparent text-sm focus:outline-none dark:text-white font-medium"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Cost By Equipment */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Custo Operacional por Equipamento</h3>
                <p className="text-xs text-slate-500">Valor consumido (Saídas x Custo Unitário)</p>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costByEquipment} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} stroke="#64748b" tick={{fontSize: 11, fontWeight: 500}} />
                <Tooltip 
                    cursor={{fill: 'transparent'}} 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} 
                    formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {costByEquipment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Suppliers */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Fornecedores</h3>
                <p className="text-xs text-slate-500">Por volume financeiro movimentado (Entradas)</p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={supplierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {supplierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} 
                    formatter={(value: number) => formatCurrency(value)}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalhamento Financeiro por Equipamento</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
             <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-300">
                <tr>
                    <th className="px-6 py-4">Equipamento</th>
                    <th className="px-6 py-4 text-right">Custo Total (Consumo)</th>
                    <th className="px-6 py-4 text-right">Representatividade</th>
                </tr>
             </thead>
             <tbody>
                {costByEquipment.map((item, index) => {
                    const total = costByEquipment.reduce((acc, curr) => acc + curr.value, 0);
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    return (
                        <tr key={index} className="bg-white border-b dark:bg-dark-card dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">
                                {formatCurrency(item.value)}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                    <span className="text-xs font-medium w-8">{percent}%</span>
                                    <div className="w-24 bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                {costByEquipment.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-gray-400">Nenhum dado financeiro disponível para o filtro selecionado.</td></tr>
                )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Consumption;