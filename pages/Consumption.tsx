
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Filter, Users, PackageMinus, UserCheck, ClipboardList, Info, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { InventoryItem, Movement } from '../types';

interface ConsumptionProps {
  data: InventoryItem[];
  movements?: Movement[];
}

const Consumption: React.FC<ConsumptionProps> = ({ data, movements = [] }) => {
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [equipmentFilter, setEquipmentFilter] = useState('Todos');
  
  // Estado para paginação da tabela de responsáveis
  const [currentResponsiblePage, setCurrentResponsiblePage] = useState(1);
  const responsibleItemsPerPage = 10;

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.categoria).filter(Boolean)))], [data]);
  const equipments = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.equipamento).filter(Boolean)))], [data]);

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

  // Gráfico: Itens Mais Consumidos (Saídas físicas)
  const topConsumedItems = useMemo(() => {
    return [...filteredData]
      .filter(item => item.saidas > 0)
      .sort((a, b) => b.saidas - a.saidas)
      .slice(0, 10)
      .map(item => ({
        name: item.descricao,
        shortName: item.descricao.length > 25 ? item.descricao.substring(0, 25) + '...' : item.descricao,
        value: item.saidas,
        code: item.codigo,
        unit: item.unidade
      }));
  }, [filteredData]);

  // --- SOLICITAÇÃO: Custo por Equipamento (Entradas x Equipamento do Estoque) ---
  const costByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    
    // 1. Criar mapa de Código -> Equipamento (extraído da aba Estoque Atual)
    const codeToEquipment = new Map<string, string>();
    data.forEach(item => {
      if (item.equipamento) {
        codeToEquipment.set(item.codigo, item.equipamento);
      }
    });

    // 2. Filtrar movimentos de Entrada (Compras)
    const inMovements = movements.filter(m => m.tipo === 'entrada');

    // 3. Somar custos financeiros agrupando pelo equipamento definido no estoque
    inMovements.forEach(m => {
      const eq = codeToEquipment.get(m.codigo) || 'Geral/Não Vinculado';
      
      // Respeitar filtro de equipamento selecionado no topo
      if (equipmentFilter !== 'Todos' && eq !== equipmentFilter) return;

      const cost = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (cost > 0) {
        if (!map[eq]) map[eq] = 0;
        map[eq] += cost;
      }
    });
    
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [movements, data, equipmentFilter]);

  // --- SOLICITAÇÃO: Top Fornecedores (Valor total de compras nas Entradas) ---
  const supplierData = useMemo(() => {
    const map: Record<string, number> = {};
    const inMovements = movements.filter(m => m.tipo === 'entrada');

    inMovements.forEach(m => {
      let forn = m.fornecedor?.trim() || 'Não Identificado';
      if (forn.toLowerCase() === 'n/d' || forn === '-' || forn === '') forn = 'Outros';
      
      const key = forn.toUpperCase();
      const value = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      
      if (value > 0) {
        if (!map[key]) map[key] = 0;
        map[key] += value;
      }
    });

    return Object.entries(map)
      .map(([name, value]) => ({ 
        name: name.charAt(0) + name.slice(1).toLowerCase(), 
        value 
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [movements]);

  const totalSupplierValue = useMemo(() => {
    return supplierData.reduce((acc, curr) => acc + curr.value, 0);
  }, [supplierData]);

  // Estatísticas por Responsável (Saídas)
  const responsibleStats = useMemo(() => {
    if (!movements || movements.length === 0) return [];
    const grouped: Record<string, { totalQty: number, count: number, items: Record<string, number> }> = {};

    movements.forEach(m => {
        if (m.tipo !== 'saida' || !m.responsavel) return;
        const name = m.responsavel.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        if (!grouped[name]) grouped[name] = { totalQty: 0, count: 0, items: {} };
        grouped[name].totalQty += m.quantidade;
        grouped[name].count += 1;
        const code = m.codigo;
        if (!grouped[name].items[code]) grouped[name].items[code] = 0;
        grouped[name].items[code] += m.quantidade;
    });

    return Object.entries(grouped)
        .map(([name, stats]) => {
            let topCode = ''; let max = 0;
            Object.entries(stats.items).forEach(([c, q]) => { if (q > max) { max = q; topCode = c; } });
            const desc = data.find(d => d.codigo === topCode)?.descricao || `Item ${topCode}`;
            return { name, totalQty: stats.totalQty, requestCount: stats.count, topItem: desc, topItemQty: max };
        })
        .sort((a, b) => b.totalQty - a.totalQty);
  }, [movements, data]);

  // Paginação da tabela de responsáveis
  const totalResponsiblePages = Math.ceil(responsibleStats.length / responsibleItemsPerPage);
  const paginatedResponsibleStats = useMemo(() => {
    const start = (currentResponsiblePage - 1) * responsibleItemsPerPage;
    return responsibleStats.slice(start, start + responsibleItemsPerPage);
  }, [responsibleStats, currentResponsiblePage]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  const CustomCostTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900 p-4 border border-slate-700 shadow-2xl rounded-xl">
          <p className="font-bold text-white text-sm mb-2">{d.name}</p>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Total Gasto em Compras</span>
            <span className="text-lg font-black text-blue-400 leading-none">{formatCurrency(d.value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomQuantityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900 p-4 border border-slate-700 shadow-2xl rounded-xl min-w-[200px]">
          <p className="font-bold text-white text-sm mb-3 leading-tight">{d.name}</p>
          <div className="flex flex-col border-t border-slate-800 pt-2">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Quantidade Retirada</span>
            <span className="text-xl font-black text-orange-400 leading-none">
              {d.value} <span className="text-xs text-slate-400 font-medium lowercase">{d.unit || 'un'}</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Análise Financeira e Consumo</h1>
           <p className="text-sm text-slate-500">Monitoramento de custos por equipamento e investimentos por fornecedor.</p>
        </div>
        <div className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-2">
             <Filter className="w-4 h-4 text-gray-400 ml-2" />
             <select className="px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-white outline-none" value={categoryFilter} onChange={(e) => {setCategoryFilter(e.target.value); setCurrentResponsiblePage(1);}}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <select className="px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-white outline-none" value={equipmentFilter} onChange={(e) => {setEquipmentFilter(e.target.value); setCurrentResponsiblePage(1);}}>
                {equipments.map(e => <option key={e} value={e}>{e}</option>)}
             </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Custo de Compras por Equipamento</h3>
                <p className="text-xs text-slate-500">Valor total das ENTRADAS cruzado com o EQUIPAMENTO do item no estoque.</p>
            </div>
          </div>
          <div className="h-80">
            {costByEquipment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByEquipment} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} stroke="#64748b" tick={{fontSize: 10, fontWeight: 700}} />
                  <Tooltip content={<CustomCostTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                      {costByEquipment.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <Info className="w-8 h-8 mb-2 opacity-20" />
                 <p className="text-sm">Vincule equipamentos na aba Estoque Atual para visualizar os custos.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Fornecedores (Investimento)</h3>
                <p className="text-xs text-slate-500">Baseado no volume financeiro total das Entradas de Itens.</p>
            </div>
          </div>
          <div className="h-80">
            {supplierData.length > 0 ? (
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
                    nameKey="name" 
                    label={({name}) => name.length > 15 ? `${name.substring(0, 15)}...` : name}
                    labelLine={true}
                  >
                    {supplierData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <Info className="w-8 h-8 mb-2 opacity-20" />
                 <p className="text-sm">Sem dados de fornecedores ou valores nas Entradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                <PackageMinus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Itens com Maior Volume de Saída</h3>
                <p className="text-xs text-slate-500">Top 10 itens com maior movimentação física (Saídas).</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topConsumedItems} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                <XAxis type="number" hide />
                <YAxis dataKey="shortName" type="category" width={150} stroke="#64748b" tick={{fontSize: 11, fontWeight: 500}} />
                <Tooltip content={<CustomQuantityTooltip />} cursor={{fill: 'rgba(249, 115, 22, 0.05)'}} />
                <Bar dataKey="value" name="Qtd. Saída" radius={[0, 4, 4, 0]} barSize={20} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-primary" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Ranking de Retiradas por Responsável</h3>
            </div>
            {totalResponsiblePages > 1 && (
              <div className="flex items-center gap-2 no-print">
                <button 
                  onClick={() => setCurrentResponsiblePage(p => Math.max(1, p - 1))}
                  disabled={currentResponsiblePage === 1}
                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {currentResponsiblePage} / {totalResponsiblePages}
                </span>
                <button 
                  onClick={() => setCurrentResponsiblePage(p => Math.min(totalResponsiblePages, p + 1))}
                  disabled={currentResponsiblePage === totalResponsiblePages}
                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-300">
                    <tr>
                        <th className="px-6 py-4">Funcionário</th>
                        <th className="px-6 py-4 text-center">Barras Retiradas</th>
                        <th className="px-6 py-4 text-center">Nº Requisições</th>
                        <th className="px-6 py-4">Item mais solicitado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedResponsibleStats.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{item.name}</td>
                            <td className="px-6 py-4 text-center font-black text-blue-600">{item.totalQty}</td>
                            <td className="px-6 py-4 text-center text-slate-500">{item.requestCount}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                {item.topItem} <span className="opacity-50">({item.topItemQty} un)</span>
                            </td>
                        </tr>
                    ))}
                    {paginatedResponsibleStats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          Nenhum dado de movimentação para os filtros atuais.
                        </td>
                      </tr>
                    )}
                </tbody>
            </table>
        </div>
        {totalResponsiblePages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-slate-800/30 no-print">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
              Exibindo {paginatedResponsibleStats.length} de {responsibleStats.length} registros
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentResponsiblePage(p => Math.max(1, p - 1))}
                disabled={currentResponsiblePage === 1}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Anterior
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalResponsiblePages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentResponsiblePage(page)}
                    className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold transition-all ${
                      currentResponsiblePage === page 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCurrentResponsiblePage(p => Math.min(totalResponsiblePages, p + 1))}
                disabled={currentResponsiblePage === totalResponsiblePages}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-primary disabled:opacity-30 transition-colors"
              >
                Próximo <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Consumption;
