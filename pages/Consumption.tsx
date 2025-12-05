
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';
import { Filter, Users, Wrench, PackageMinus, UserCheck, ClipboardList } from 'lucide-react';
import { InventoryItem, Movement } from '../types';

interface ConsumptionProps {
  data: InventoryItem[];
  movements?: Movement[]; // Nova prop opcional
}

const Consumption: React.FC<ConsumptionProps> = ({ data, movements = [] }) => {
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [equipmentFilter, setEquipmentFilter] = useState('Todos');

  // Extract categories and equipments
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.categoria).filter(Boolean)))], [data]);
  const equipments = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.equipamento).filter(Boolean)))], [data]);

  // Filter Inventory Data
  const filteredData = useMemo(() => {
     let res = data;
     if (categoryFilter !== 'Todos') {
         res = res.filter(item => item.categoria === categoryFilter);
     }
     if (equipmentFilter !== 'Todos') {
         res = res.filter(item => item.equipamento === equipmentFilter);
     }
     return res;
  }, [data, categoryFilter, equipmentFilter]);

  // 1. TOP ITEMS CONSUMED (Quantidade Física)
  const topConsumedItems = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.saidas - a.saidas)
      .slice(0, 10)
      .map(item => ({
        name: item.descricao,
        shortName: item.descricao.length > 25 ? item.descricao.substring(0, 25) + '...' : item.descricao,
        value: item.saidas,
        code: item.codigo,
        unit: item.unidade
      }))
      .filter(i => i.value > 0);
  }, [filteredData]);

  // 2. COST BY EQUIPMENT (Financeiro)
  const costByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      const eq = item.equipamento || 'Geral';
      const cost = item.saidas * item.valorUnitario;
      if (!map[eq]) map[eq] = 0;
      map[eq] += cost;
    });
    
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // 3. TOP SUPPLIERS (Volume de Compras/Estoque)
  const supplierData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      const forn = item.fornecedor || 'Desconhecido';
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

  // 4. TOP RESPONSIBLES FOR WITHDRAWALS (Novo: Responsáveis)
  const responsibleStats = useMemo(() => {
    if (!movements || movements.length === 0) return [];

    // Map para lookup rápido de descrição de item pelo código
    const itemDescMap = new Map<string, string>();
    data.forEach(d => itemDescMap.set(d.codigo, d.descricao));

    // Agrupamento
    const grouped: Record<string, { totalQty: number, count: number, items: Record<string, number>, lastDate: Date }> = {};

    movements.forEach(m => {
        if (m.tipo !== 'saida' || !m.responsavel) return;
        
        // Normalização do nome (Title Case)
        const rawName = m.responsavel.toLowerCase().trim();
        const name = rawName.replace(/(^\w|\s\w)/g, m => m.toUpperCase());

        if (!grouped[name]) {
            grouped[name] = { totalQty: 0, count: 0, items: {}, lastDate: m.data };
        }

        grouped[name].totalQty += m.quantidade;
        grouped[name].count += 1; // Incrementa contagem de requisições (linhas)
        
        // Mantém a data mais recente
        if (m.data > grouped[name].lastDate) {
            grouped[name].lastDate = m.data;
        }

        // Contagem de item por responsável (para achar o "Principal Item")
        const code = m.codigo; // Ou usar descrição direto se quiser agrupar nomes
        if (!grouped[name].items[code]) grouped[name].items[code] = 0;
        grouped[name].items[code] += m.quantidade;
    });

    // Formatação final
    return Object.entries(grouped)
        .map(([name, stats]) => {
            // Encontrar item mais retirado
            let topItemCode = '';
            let maxQtd = 0;
            Object.entries(stats.items).forEach(([code, qtd]) => {
                if (qtd > maxQtd) {
                    maxQtd = qtd;
                    topItemCode = code;
                }
            });
            const topItemDesc = itemDescMap.get(topItemCode) || `Item ${topItemCode}`;

            return {
                name,
                totalQty: stats.totalQty,
                requestCount: stats.count,
                topItem: topItemDesc,
                topItemQty: maxQtd,
                lastWithdrawal: stats.lastDate
            };
        })
        .sort((a, b) => b.totalQty - a.totalQty); // Ordenar por quem retira mais

  }, [movements, data]);

  const responsibleChartData = useMemo(() => {
      return responsibleStats.slice(0, 10).map(r => ({
          name: r.name,
          value: r.totalQty,
          // Propriedades extras para custom tooltip se necessário
          requests: r.requestCount
      }));
  }, [responsibleStats]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  const CustomQuantityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
          <p className="font-bold text-slate-800 dark:text-white mb-1">{data.code ? `${data.code} - ` : ''}{data.name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Quantidade: <span className="font-bold text-orange-600">{data.value} {data.unit || ''}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Análise de Consumo</h1>
           <p className="text-sm text-slate-500">Onde o dinheiro está sendo gasto e principais parceiros.</p>
        </div>
        
        <div className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-2">
             <Filter className="w-4 h-4 text-gray-400 ml-2" />
             <select 
              className="px-3 py-1.5 rounded-md bg-transparent text-sm focus:outline-none dark:text-white font-medium border-r border-gray-200 dark:border-gray-700"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select 
              className="px-3 py-1.5 rounded-md bg-transparent text-sm focus:outline-none dark:text-white font-medium"
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
            >
              {equipments.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
        </div>
      </div>

      {/* --- TOP CONSUMED ITEMS --- */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                <PackageMinus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Itens Mais Consumidos</h3>
                <p className="text-xs text-slate-500">Top 10 itens com maior saída (Quantidade física)</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topConsumedItems} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                <XAxis type="number" hide />
                <YAxis dataKey="shortName" type="category" width={150} stroke="#64748b" tick={{fontSize: 11, fontWeight: 500}} />
                <Tooltip content={<CustomQuantityTooltip />} cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" name="Qtd. Retirada" radius={[0, 4, 4, 0]} barSize={20} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* --- GRID DE GRÁFICOS FINANCEIROS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Custo por Equipamento</h3>
                <p className="text-xs text-slate-500">Valor consumido (Saídas x Custo Unitário)</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costByEquipment} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} stroke="#64748b" tick={{fontSize: 11, fontWeight: 500}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {costByEquipment.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Fornecedores</h3>
                <p className="text-xs text-slate-500">Por volume financeiro (Entradas)</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={supplierData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {supplierData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- NOVO GRÁFICO: RESPONSÁVEIS POR RETIRADA --- */}
      {responsibleStats.length > 0 && (
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Retiradas por Responsável</h3>
                <p className="text-xs text-slate-500">Quem mais retira itens do estoque</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responsibleChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 11, fontWeight: 500}} interval={0} />
                <YAxis stroke="#64748b" tick={{fontSize: 11}} />
                <Tooltip content={<CustomQuantityTooltip />} cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="value" name="Total Itens" radius={[4, 4, 0, 0]} barSize={40} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>
      )}

      {/* --- DETALHAMENTO: TABELAS --- */}
      {/* Tabela de Responsáveis */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalhamento por Responsável</h3>
        </div>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-300 sticky top-0">
                    <tr>
                        <th className="px-6 py-4">Responsável</th>
                        <th className="px-6 py-4 text-center">Total Itens</th>
                        <th className="px-6 py-4 text-center">Qtd. Requisições</th>
                        <th className="px-6 py-4">Principal Item Solicitado</th>
                    </tr>
                </thead>
                <tbody>
                    {responsibleStats.map((item, index) => (
                        <tr key={index} className="bg-white border-b dark:bg-dark-card dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                            <td className="px-6 py-4 text-center font-bold text-purple-600 dark:text-purple-400">
                                {item.totalQty}
                            </td>
                            <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                                {item.requestCount}
                            </td>
                            <td className="px-6 py-4 text-xs">
                                <div className="font-medium text-slate-700 dark:text-slate-200">{item.topItem}</div>
                                <span className="text-gray-400">({item.topItemQty} un.)</span>
                            </td>
                        </tr>
                    ))}
                    {responsibleStats.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nenhum dado de responsável encontrado. Verifique se a coluna "Responsável" ou "Solicitante" existe na aba de Saídas.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Consumption;
