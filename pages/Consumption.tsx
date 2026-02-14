import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, 
  Legend, PieChart, Pie, Cell, LabelList, ComposedChart, Line, Area
} from 'recharts';
import { 
  Filter, Calendar, ChevronLeft, ChevronRight, ShoppingCart, 
  Users, Package, TrendingDown, LayoutDashboard, Wallet, Search, ArrowRight, ArrowUpRight, ArrowDownRight, History, Layers, Box, Activity, UserCheck, BarChart3, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle, RefreshCw, Clock, Printer, X, Check, FileText
} from 'lucide-react';
import { InventoryItem, Movement } from '../types';
import StatCard from '../components/StatCard';

interface ConsumptionProps {
  data: InventoryItem[];
  movements?: Movement[];
  isWarehouse?: boolean;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const WmsCustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b]/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-white text-[11px] font-black mb-3 border-b border-slate-700 pb-2 uppercase tracking-tight leading-tight">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{entry.name}:</span>
              </div>
              <span className="text-white text-xs font-black">
                {entry.name.includes('%') || entry.name.includes('Percentual') 
                  ? `${Number(entry.value).toFixed(1)}%` 
                  : entry.value.toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Consumption: React.FC<ConsumptionProps> = ({ data, movements = [], isWarehouse = false }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [rankingPage, setRankingPage] = useState(1);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const itemsPerPage = 10;

  const inventoryMap = useMemo(() => {
    const map: Record<string, InventoryItem> = {};
    data.forEach(item => { map[item.codigo] = item; });
    return map;
  }, [data]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const monthMatch = selectedMonth === 'Todos' || months[m.data.getMonth()] === selectedMonth;
      const yearMatch = selectedYear === 'Todos' || m.data.getFullYear().toString() === selectedYear;
      return monthMatch && yearMatch;
    });
  }, [movements, selectedMonth, selectedYear]);

  const years = useMemo(() => {
    const y = new Set<string>();
    movements.forEach(m => y.add(m.data.getFullYear().toString()));
    return ['Todos', ...Array.from(y).sort().reverse()];
  }, [movements]);

  // Lógica para WMS (Almoxarifado Geral)
  const wmsMetrics = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let internal = 0;
    const dayMap: Record<string, { date: string, in: number, out: number, move: number, ts: number }> = {};
    const itemGiro: Record<string, number> = {};
    
    const operatorActionMap: Record<string, { 
      name: string, 
      type: 'entrada' | 'saida' | 'transferencia', 
      total: number, 
      lastDate: Date,
      isRealDate: boolean,
      itemCounts: Record<string, number> 
    }> = {};
    
    filteredMovements.forEach(m => {
      const qty = m.quantidade || 0;
      const dateStr = m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { date: dateStr, in: 0, out: 0, move: 0, ts: m.data.getTime() };
      }

      const opName = m.responsavel || 'N/D';
      const opType = m.tipo;
      const dayKey = m.data.toLocaleDateString('pt-BR');
      const compositeKey = `${opName}|${opType}|${dayKey}`;

      if (!operatorActionMap[compositeKey]) {
        operatorActionMap[compositeKey] = { 
          name: opName, 
          type: opType, 
          total: 0, 
          lastDate: m.data, 
          isRealDate: !m.isDateFallback,
          itemCounts: {} 
        };
      } else {
        // Se já existe, atualizamos a flag isRealDate se encontrarmos um movimento com data real
        if (!m.isDateFallback) {
          operatorActionMap[compositeKey].isRealDate = true;
          if (m.data.getTime() > operatorActionMap[compositeKey].lastDate.getTime()) {
            operatorActionMap[compositeKey].lastDate = m.data;
          }
        }
      }

      if (opType === 'entrada') { inbound += qty; dayMap[dateStr].in += qty; }
      else if (opType === 'saida') { outbound += qty; dayMap[dateStr].out += qty; }
      else if (opType === 'transferencia') { internal += qty; dayMap[dateStr].move += qty; }

      operatorActionMap[compositeKey].total += qty;
      const code = m.codigo;
      operatorActionMap[compositeKey].itemCounts[code] = (operatorActionMap[compositeKey].itemCounts[code] || 0) + qty;
      const itemKey = inventoryMap[m.codigo]?.descricao || m.codigo;
      itemGiro[itemKey] = (itemGiro[itemKey] || 0) + qty;
    });

    const sortedGiro = Object.entries(itemGiro).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const totalGiroSum = sortedGiro.reduce((acc, curr) => acc + curr.value, 0);
    let cumulative = 0;
    const abcData = sortedGiro.map(item => {
        cumulative += item.value;
        const cumPercent = (cumulative / totalGiroSum) * 100;
        let cls = 'C';
        if (cumPercent <= 80) cls = 'A';
        else if (cumPercent <= 95) cls = 'B';
        return { ...item, cumPercent, class: cls };
    });

    const individualActions = Object.values(operatorActionMap).map(action => {
        let maxQty = 0;
        let topCode = '-';
        Object.entries(action.itemCounts).forEach(([code, qty]) => { if (qty > maxQty) { maxQty = qty; topCode = code; } });
        const desc = inventoryMap[topCode]?.descricao || topCode;
        let typeTotal = action.type === 'entrada' ? inbound : action.type === 'saida' ? outbound : internal;
        return { 
          ...action, 
          representation: typeTotal > 0 ? ((action.total / typeTotal) * 100).toFixed(1) : "0", 
          topItem: `${desc} (${maxQty} ${inventoryMap[topCode]?.unidade || 'un'})` 
        };
    }).sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());

    return { inbound, outbound, internal, total: inbound + outbound + internal, chartTimeline: Object.values(dayMap).sort((a,b) => a.ts - b.ts).slice(-30), chartGiro: abcData.slice(0, 15), abcSummary: { A: abcData.filter(x => x.class === 'A').length, B: abcData.filter(x => x.class === 'B').length, C: abcData.filter(x => x.class === 'C').length }, chartTypes: [ { name: 'Entradas', value: inbound, color: '#10b981' }, { name: 'Saídas', value: outbound, color: '#ef4444' }, { name: 'Internas', value: internal, color: '#3b82f6' } ].filter(d => d.value > 0), individualActions };
  }, [filteredMovements, inventoryMap]);

  // Lógica para Almoxarifado de Peças (Análise Financeira e Consumo)
  const partsMetrics = useMemo(() => {
    // 1. Custo por Equipamento
    const costMap: Record<string, number> = {};
    filteredMovements.filter(m => m.tipo === 'entrada').forEach(m => {
      const masterItem = inventoryMap[m.codigo];
      const equip = (masterItem?.equipamento || 'Geral/Não Vinculado').trim();
      const movementValue = m.valorTotal && m.valorTotal > 0 
        ? m.valorTotal 
        : (masterItem?.valorUnitario || 0) * m.quantidade;
      
      costMap[equip] = (costMap[equip] || 0) + movementValue;
    });
    const costByEquipment = Object.entries(costMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

    // 2. Top Fornecedores
    const supplierMap: Record<string, number> = {};
    filteredMovements.filter(m => m.tipo === 'entrada').forEach(m => {
      const masterItem = inventoryMap[m.codigo];
      const forn = (m.fornecedor || masterItem?.fornecedor || 'DIVERSOS').trim().toUpperCase();
      const movementValue = m.valorTotal && m.valorTotal > 0 
        ? m.valorTotal 
        : (masterItem?.valorUnitario || 0) * m.quantidade;
        
      supplierMap[forn] = (supplierMap[forn] || 0) + movementValue;
    });
    const totalInvest = Object.values(supplierMap).reduce((a, b) => a + b, 0);
    const topSuppliers = Object.entries(supplierMap).map(([name, value]) => ({ 
      name, value, percent: totalInvest > 0 ? ((value / totalInvest) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.value - a.value).slice(0, 8);

    // 3. Itens com Maior Volume de Saída
    const exitVolMap: Record<string, { desc: string, qty: number, unit: string }> = {};
    filteredMovements.filter(m => m.tipo === 'saida').forEach(m => {
      if (!exitVolMap[m.codigo]) {
        const item = inventoryMap[m.codigo];
        exitVolMap[m.codigo] = { desc: item?.descricao || m.codigo, qty: 0, unit: item?.unidade || 'un' };
      }
      exitVolMap[m.codigo].qty += m.quantidade;
    });
    const topExitItems = Object.entries(exitVolMap)
      .map(([code, data]) => ({ name: code, desc: data.desc, value: data.qty, unit: data.unit }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // 4. Ranking de Retiradas por Responsável
    const respMap: Record<string, { total: number, count: number, items: Record<string, number> }> = {};
    filteredMovements.filter(m => m.tipo === 'saida').forEach(m => {
      const resp = m.responsavel || 'N/D';
      if (!respMap[resp]) respMap[resp] = { total: 0, count: 0, items: {} };
      respMap[resp].total += m.quantidade;
      respMap[resp].count += 1;
      respMap[resp].items[m.codigo] = (respMap[resp].items[m.codigo] || 0) + m.quantidade;
    });

    const rankingResponsaveis = Object.entries(respMap).map(([name, s]) => {
      let topItemCode = '';
      let topItemQty = 0;
      Object.entries(s.items).forEach(([code, qty]) => {
        if (qty > topItemQty) { topItemQty = qty; topItemCode = code; }
      });
      const itemDesc = inventoryMap[topItemCode]?.descricao || topItemCode;
      const unit = inventoryMap[topItemCode]?.unidade || 'un';
      return {
        name,
        qty: s.total,
        count: s.count,
        topItem: `${itemDesc} (${topItemQty} ${unit})`
      };
    }).sort((a, b) => b.qty - a.qty);

    return { 
      costByEquipment, 
      topSuppliers, 
      topExitItems, 
      rankingResponsaveis, 
      totalInvest,
      totalEntries: filteredMovements.filter(m => m.tipo === 'entrada').length,
      totalExits: filteredMovements.filter(m => m.tipo === 'saida').length,
    };
  }, [filteredMovements, inventoryMap]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "relatorio_financeiro_consumo_alumasa";
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 200);
  };

  if (isWarehouse) {
    const paginatedActions = wmsMetrics.individualActions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(wmsMetrics.individualActions.length / itemsPerPage);
    const getActionBadge = (type: string) => {
      switch (type) {
        case 'entrada': return <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase"><ArrowUpCircle className="w-3 h-3" /> Entrada</div>;
        case 'saida': return <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase"><ArrowDownCircle className="w-3 h-3" /> Saída</div>;
        case 'transferencia': return <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase"><RefreshCw className="w-3 h-3" /> Interna</div>;
        default: return <div className="px-3 py-1 bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded-lg text-[9px] font-black uppercase">{type}</div>;
      }
    };

    return (
      <div className="max-w-[1440px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div><h1 className="text-2xl font-black text-white uppercase tracking-tighter">Fluxo de Movimentação WMS</h1><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Auditabilidade, Produtividade e Curva ABC.</p></div>
          <div className="bg-[#1e293b] p-1.5 rounded-xl flex items-center gap-4 border border-slate-700 shadow-xl"><Filter className="w-3.5 h-3.5 text-blue-500 ml-2" /><select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">{years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}</select><select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer"><option value="Todos" className="bg-slate-900">Mês: Todos</option>{months.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="INBOUND (ENTRADAS)" value={wmsMetrics.inbound.toLocaleString('pt-BR')} icon={ArrowUpRight} color="green" /><StatCard title="OUTBOUND (SAÍDAS)" value={wmsMetrics.outbound.toLocaleString('pt-BR')} icon={ArrowDownRight} color="red" /><StatCard title="INTERNAL (TRANSF.)" value={wmsMetrics.internal.toLocaleString('pt-BR')} icon={ArrowRightLeft} color="blue" /><StatCard title="VOLUME TOTAL" value={wmsMetrics.total.toLocaleString('pt-BR')} icon={Layers} color="purple" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
             <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><BarChart3 className="w-5 h-5 text-amber-500" /><h3 className="text-xs font-black text-white uppercase tracking-widest">Curva ABC de Movimentação (Pareto)</h3></div><div className="flex gap-2"><div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black border border-emerald-500/20">CLASSE A: {wmsMetrics.abcSummary.A}</div></div></div>
             <div className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={wmsMetrics.chartGiro} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} /><XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={80} /><YAxis yAxisId="left" hide /><YAxis yAxisId="right" orientation="right" hide /><Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<WmsCustomTooltip />} /><Bar yAxisId="left" dataKey="value" name="Volume Movimentado" radius={[4, 4, 0, 0]} barSize={25}>{wmsMetrics.chartGiro.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.class === 'A' ? '#10b981' : entry.class === 'B' ? '#f59e0b' : '#64748b'} />)}</Bar><Line yAxisId="right" type="monotone" dataKey="cumPercent" name="% Acumulado" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} /></ComposedChart></ResponsiveContainer></div>
          </div>
          <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col"><div className="flex items-center gap-3 mb-8"><Layers className="w-5 h-5 text-blue-500" /><h3 className="text-xs font-black text-white uppercase tracking-widest">Mix de Operações</h3></div><div className="flex-1 min-h-[250px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={wmsMetrics.chartTypes} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">{wmsMetrics.chartTypes.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip content={<WmsCustomTooltip />} /></PieChart></ResponsiveContainer></div><div className="space-y-2 mt-4">{wmsMetrics.chartTypes.map((t, idx) => (<div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></div><span>{t.name}</span></div><span className="text-white">{((t.value / wmsMetrics.total) * 100).toFixed(1)}%</span></div>))}</div></div>
        </div>
        <div className="bg-[#1e293b] rounded-[2rem] shadow-2xl border border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center"><div className="flex items-center gap-4"><div className="p-3 bg-indigo-500/10 rounded-2xl"><Users className="w-6 h-6 text-indigo-500" /></div><h3 className="text-sm font-black text-white uppercase tracking-widest">Log de Atividade por Operador</h3></div><div className="flex items-center gap-2 no-print"><button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-slate-800 rounded-lg disabled:opacity-20"><ChevronLeft className="w-4 h-4 text-white" /></button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2 bg-slate-800 rounded-lg disabled:opacity-20"><ChevronRight className="w-4 h-4 text-white" /></button></div></div>
            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-900/40 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800"><tr><th className="px-8 py-5">COLABORADOR</th><th className="px-8 py-5">MOVIMENTAÇÃO REALIZADA</th><th className="px-8 py-5 text-center">VOLUME MOVIMENTADO</th><th className="px-8 py-5 text-center">DATA DA ÚLTIMA AÇÃO</th><th className="px-8 py-5">ITEM PRINCIPAL (NA AÇÃO)</th></tr></thead><tbody className="divide-y divide-slate-800">{paginatedActions.map((row, idx) => (<tr key={idx} className="hover:bg-slate-800/40 transition-colors"><td className="px-8 py-5 font-black text-slate-200 uppercase text-lg">{row.name}</td><td className="px-8 py-5">{getActionBadge(row.type)}</td><td className="px-8 py-5 text-center"><div className="flex flex-col items-center"><span className="font-black text-blue-400 text-lg">{row.total.toLocaleString('pt-BR')}</span><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{row.representation}% do total de {row.type}s</span></div></td><td className="px-8 py-5 text-center"><div className="flex flex-col items-center gap-1">{row.isRealDate ? (<><div className="flex items-center gap-1.5 text-slate-300 font-bold"><Clock className="w-3 h-3 text-indigo-400" /><span>{row.lastDate.toLocaleDateString('pt-BR')}</span></div><span className="text-[9px] font-black text-slate-500 uppercase">{row.lastDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></>) : (<span className="text-slate-500 font-black">-</span>)}</div></td><td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase italic line-clamp-1 max-w-[300px]">{row.topItem}</td></tr>))}</tbody></table></div><div className="p-6 bg-slate-900/20 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center border-t border-slate-800">Mostrando {paginatedActions.length} registros de {wmsMetrics.individualActions.length} total • Página {currentPage} de {totalPages}</div>
        </div>
      </div>
    );
  }

  // Visual para Almoxarifado de Peças (Análise Financeira e Consumo)
  const paginatedRanking = partsMetrics.rankingResponsaveis.slice((rankingPage - 1) * itemsPerPage, rankingPage * itemsPerPage);
  const rankingTotalPages = Math.ceil(partsMetrics.rankingResponsaveis.length / itemsPerPage);

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Análise Financeira e Consumo</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Monitoramento de custos por equipamento e investimentos por fornecedor.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#1e293b] p-1.5 rounded-xl flex items-center gap-4 border border-slate-700 shadow-xl">
             <div className="flex items-center gap-2 px-3 border-r border-slate-700">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                   {years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                </select>
             </div>
             <div className="flex items-center gap-2 px-3">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                   <option value="Todos" className="bg-slate-900">Todos</option>
                   {months.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                </select>
             </div>
          </div>
          <button onClick={() => setShowPrintPreview(true)} className="bg-rose-600/10 hover:bg-rose-600/20 border border-rose-600/30 text-rose-500 p-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">
             <Printer className="w-4 h-4" /> Relatório
          </button>
        </div>
      </div>

      {/* LINHA 1: CUSTO E FORNECEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <ShoppingCart className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                 <h3 className="text-sm font-black text-white uppercase tracking-tight">Custo de Compras por Equipamento</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase">Valor total das ENTRADAS vinculadas ao EQUIPAMENTO.</p>
              </div>
           </div>
           <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={partsMetrics.costByEquipment} layout="vertical" margin={{ right: 80, left: 100 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 8, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                 <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<WmsCustomTooltip />} />
                 <Bar dataKey="value" name="Investimento" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="value" position="right" formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'black' }} offset={10} />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                 <h3 className="text-sm font-black text-white uppercase tracking-tight">Top Fornecedores (Investimento)</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase">Financeiro total das Entradas de itens.</p>
              </div>
           </div>
           <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={partsMetrics.topSuppliers} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                   {partsMetrics.topSuppliers.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                 </Pie>
                 <Tooltip content={<WmsCustomTooltip />} />
                 <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', paddingLeft: '20px' }} />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* LINHA 2: ITENS COM MAIOR VOLUME DE SAÍDA */}
      <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl no-print">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
            <TrendingDown className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Itens com Maior Volume de Saída</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Top 10 itens com maior movimentação física de retirada.</p>
          </div>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={partsMetrics.topExitItems} layout="vertical" margin={{ left: 120, right: 80 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="desc" 
                type="category" 
                width={120} 
                tick={{fontSize: 8, fontWeight: 'black', fill: '#94a3b8'}} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<WmsCustomTooltip />} />
              <Bar dataKey="value" name="Volume Saída" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20}>
                 <LabelList 
                   dataKey="value" 
                   position="right" 
                   formatter={(v: any) => `${Number(v).toLocaleString('pt-BR')} un.`} 
                   style={{ fill: '#f97316', fontSize: 10, fontWeight: 'black' }} 
                   offset={10} 
                 />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LINHA 3: RANKING DE RETIRADAS POR RESPONSÁVEL */}
      <div className="bg-[#1e293b] rounded-[2rem] shadow-2xl border border-slate-800 overflow-hidden no-print">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <Users className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Ranking de Retiradas por Responsável</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase">Produtividade por colaborador em requisições de almoxarifado.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-500 uppercase">{rankingPage} / {rankingTotalPages}</span>
             <div className="flex gap-2">
                <button onClick={() => setRankingPage(p => Math.max(1, p-1))} disabled={rankingPage === 1} className="p-2 bg-slate-800 rounded-lg disabled:opacity-20"><ChevronLeft className="w-4 h-4 text-white" /></button>
                <button onClick={() => setRankingPage(p => Math.min(rankingTotalPages, p+1))} disabled={rankingPage === rankingTotalPages} className="p-2 bg-slate-800 rounded-lg disabled:opacity-20"><ChevronRight className="w-4 h-4 text-white" /></button>
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/40 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-5">FUNCIONÁRIO</th>
                <th className="px-8 py-5 text-center">QUANTIDADE RETIRADA</th>
                <th className="px-8 py-5 text-center">Nº REQUISIÇÕES</th>
                <th className="px-8 py-5">ITEM MAIS SOLICITADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginatedRanking.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-200 uppercase">{row.name}</td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-sm font-black text-blue-400">{row.qty.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="px-8 py-5 text-center font-bold text-slate-500">{row.count}</td>
                  <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase italic line-clamp-1 max-w-[350px]">{row.topItem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-900/20 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-800">
          <span>EXIBINDO {paginatedRanking.length} DE {partsMetrics.rankingResponsaveis.length} REGISTROS</span>
          <div className="flex gap-1">
             {Array.from({ length: Math.min(5, rankingTotalPages) }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setRankingPage(i + 1)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${rankingPage === (i+1) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                >
                  {i + 1}
                </button>
             ))}
          </div>
        </div>
      </div>

      {/* PRINT PREVIEW MODAL */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col items-center overflow-auto print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:bg-white">
          <div className="w-full sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shadow-2xl no-print preview-header">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="font-black text-xs uppercase tracking-widest text-white">Relatório Supervisor - Financeiro e Consumo</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-[10px] uppercase text-white transition-all active:scale-95">Voltar</button>
              <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase text-white shadow-lg active:scale-95 flex items-center gap-2"><Printer className="w-4 h-4" /> Confirmar Impressão</button>
            </div>
          </div>

          <div className="flex-1 w-full flex justify-center py-10 print:py-0 print:block print:bg-white">
            <div className="printable-document bg-white !text-black p-12 w-[210mm] shadow-2xl min-h-[297mm] print:shadow-none print:p-0 print:w-full">
               <header className="mb-10 text-center border-b-[3px] border-black pb-6 text-black">
                    <h1 className="text-6xl font-black leading-none uppercase tracking-tighter text-black">ALUMASA</h1>
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-black">ALUMÍNIO & PLÁSTICO</span>
                    <div className="mt-8 space-y-1">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-black">RELATÓRIO TÉCNICO DE CONSUMO E INVESTIMENTO</h2>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-black">UNIDADE DE PEÇAS E REPOSIÇÃO INDUSTRIAL</p>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <div className="border border-black px-4 py-1.5 text-[9px] font-black uppercase bg-gray-50 rounded text-black">FILTROS: {selectedYear} / {selectedMonth} • EMITIDO EM: {new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                </header>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                   <h3 className="text-[11px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES FINANCEIROS E VOLUMÉTRICOS</h3>
                   <table className="w-full border-collapse border border-black text-black">
                      <tbody>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[10px] uppercase border-r border-black bg-gray-50 text-black">Investimento Total no Período</td>
                            <td className="p-3 font-black text-lg text-black">R$ {partsMetrics.totalInvest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                         </tr>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[10px] uppercase border-r border-black bg-gray-50 text-black">Lançamentos de Entrada (Inbound)</td>
                            <td className="p-3 font-black text-lg text-emerald-600">{partsMetrics.totalEntries} Registros</td>
                         </tr>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[10px] uppercase border-r border-black bg-gray-50 text-black">Requisições de Saída (Outbound)</td>
                            <td className="p-3 font-black text-lg text-rose-600">{partsMetrics.totalExits} Registros</td>
                         </tr>
                      </tbody>
                   </table>
                </section>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                  <h3 className="text-[11px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. CUSTO DE MANUTENÇÃO POR EQUIPAMENTO (RANKING)</h3>
                  <table className="w-full border-collapse border border-black text-black">
                      <thead>
                        <tr className="bg-gray-100 text-[10px] font-black uppercase text-black">
                            <th className="border border-black px-4 py-2 text-left text-black">EQUIPAMENTO / ATIVO</th>
                            <th className="border border-black px-4 py-2 text-right text-black">TOTAL INVESTIDO (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partsMetrics.costByEquipment.map((item, i) => (
                           <tr key={i} className="text-[10px] font-bold text-black border-b border-black">
                              <td className="border border-black px-4 py-2 uppercase text-black">{item.name}</td>
                              <td className="border border-black px-4 py-2 font-black text-right text-black">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                           </tr>
                        ))}
                      </tbody>
                  </table>
                </section>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                  <h3 className="text-[11px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. TOP 10 ITENS COM MAIOR CONSUMO FÍSICO</h3>
                  <table className="w-full border-collapse border border-black text-black">
                      <thead>
                        <tr className="bg-gray-100 text-[10px] font-black uppercase text-black">
                            <th className="border border-black px-4 py-2 text-left text-black">DESCRIÇÃO DO ITEM</th>
                            <th className="border border-black px-4 py-2 text-center text-black">QUANTIDADE</th>
                            <th className="border border-black px-4 py-2 text-center text-black">UNIDADE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partsMetrics.topExitItems.map((item, i) => (
                           <tr key={i} className="text-[10px] font-bold text-black border-b border-black">
                              <td className="border border-black px-4 py-2 uppercase text-black">{item.desc}</td>
                              <td className="border border-black px-4 py-2 font-black text-center text-black">{item.value.toLocaleString('pt-BR')}</td>
                              <td className="border border-black px-4 py-2 text-center uppercase text-black">{item.unit}</td>
                           </tr>
                        ))}
                      </tbody>
                  </table>
                </section>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                  <h3 className="text-[11px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">4. PRODUTIVIDADE E REQUISIÇÕES POR COLABORADOR</h3>
                  <table className="w-full border-collapse border border-black text-black">
                      <thead>
                        <tr className="bg-gray-100 text-[10px] font-black uppercase text-black">
                            <th className="border border-black px-4 py-2 text-left text-black">FUNCIONÁRIO</th>
                            <th className="border border-black px-4 py-2 text-center text-black">QTD. REQUISIÇÕES</th>
                            <th className="border border-black px-4 py-2 text-center text-black">VOLUME TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partsMetrics.rankingResponsaveis.slice(0, 15).map((row, i) => (
                           <tr key={i} className="text-[10px] font-bold text-black border-b border-black">
                              <td className="border border-black px-4 py-2 uppercase text-black">{row.name}</td>
                              <td className="border border-black px-4 py-2 font-black text-center text-black">{row.count}</td>
                              <td className="border border-black px-4 py-2 font-black text-center text-black">{row.qty.toLocaleString('pt-BR')}</td>
                           </tr>
                        ))}
                      </tbody>
                  </table>
                </section>

                <footer className="mt-20 pt-16 flex justify-between gap-12 text-black" style={{ pageBreakInside: 'avoid' }}>
                   <div className="flex-1 text-center text-black">
                      <div className="w-full border-t border-black mb-1"></div>
                      <span className="text-[9px] font-black uppercase text-black">SUPERVISOR DO ALMOXARIFADO</span>
                   </div>
                   <div className="flex-1 text-center text-black">
                      <div className="w-full border-t border-black mb-1"></div>
                      <span className="text-[9px] font-black uppercase text-black">GERÊNCIA INDUSTRIAL</span>
                   </div>
                </footer>
                
                <div className="mt-8 pt-4 border-t border-black text-center">
                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">Documento Gerencial Alumasa - Gerado Eletronicamente em {new Date().toLocaleString('pt-BR')}</p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consumption;