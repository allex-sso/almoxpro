import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { 
  TrendingUp, Activity, AlertTriangle, Calendar, Package, DollarSign, ArrowUpRight, ArrowDownRight, Printer, Filter, ShieldCheck, Box, Layers, MousePointer2, TrendingDown, LayoutDashboard, X, Check, FileText, RefreshCw, BarChart3, ShoppingCart
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { DashboardStats, InventoryItem, Movement } from '../types';

interface DashboardProps {
  data: InventoryItem[];
  stats: DashboardStats;
  movements?: Movement[];
  isLoading?: boolean;
  isWarehouse?: boolean;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const Dashboard: React.FC<DashboardProps> = ({ data, stats, movements = [], isLoading = false, isWarehouse = false }) => {
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const years = useMemo(() => {
    const y = new Set<string>();
    movements.forEach(m => y.add(m.data.getFullYear().toString()));
    return ['Todos', ...Array.from(y).sort().reverse()];
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const yearMatch = selectedYear === 'Todos' || m.data.getFullYear().toString() === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || months[m.data.getMonth()] === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [movements, selectedYear, selectedMonth]);

  const healthStats = useMemo(() => {
    const map = { saudavel: 0, atencao: 0, critico: 0 };
    data.forEach(item => {
      const situacao = (item.situacao || 'OK').toUpperCase();
      if (situacao.includes('ESGOTADO') || situacao.includes('PEDIDO') || situacao.includes('CRITICO') || situacao.includes('REPOR') || situacao.includes('RUPTURA')) {
        map.critico++;
      } else if (situacao.includes('ATENCAO') || situacao.includes('ALERTA') || situacao.includes('MINIMO')) {
        map.atencao++;
      } else {
        map.saudavel++;
      }
    });
    return map;
  }, [data]);

  const warehouseKpis = useMemo<{ picking: number; reserva: number; total: number }>(() => {
    let picking = 0;
    let reserva = 0;
    let total = 0;
    data.forEach(item => {
      picking += (item.quantidadePicking || 0);
      reserva += (item.quantidadeEstoque || 0);
      total += (item.quantidadeAtual || 0);
    });
    return { picking, reserva, total };
  }, [data]);

  const reportMetrics = useMemo(() => {
    // 1. Mix de Movimentação Interna
    const internalMoves: Record<string, number> = { 'MUDAR ENDERECO': 0, 'MOVER P/ PICKING': 0 };
    filteredMovements.filter(m => m.tipo === 'transferencia').forEach(m => {
       const type = (m.movimentoTipo || '').toUpperCase();
       if (type.includes('PICKING')) internalMoves['MOVER P/ PICKING'] += m.quantidade;
       else internalMoves['MUDAR ENDERECO'] += m.quantidade;
    });

    // 2. Consumo por Setor (Destino)
    const sectorMap: Record<string, number> = {};
    filteredMovements.filter(m => m.tipo === 'saida').forEach(m => {
       const s = (m.setor || 'GERAL').toUpperCase();
       sectorMap[s] = (sectorMap[s] || 0) + m.quantidade;
    });

    // 3. Top SKUs por Saldo
    const topSkus = [...data]
      .sort((a, b) => b.quantidadeAtual - a.quantidadeAtual)
      .slice(0, 10);

    // 4. Top SKUs por Valorização (Para Almoxarifado de Peças)
    const topValuedSkus = [...data]
      .sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0))
      .slice(0, 10);

    // 5. Produtividade por Operador (Top 5)
    const opMap: Record<string, number> = {};
    filteredMovements.forEach(m => {
       const op = (m.responsavel || 'N/D').toUpperCase();
       opMap[op] = (opMap[op] || 0) + 1;
    });
    const topOps = Object.entries(opMap)
       .map(([name, actions]) => ({ name, actions }))
       .sort((a,b) => b.actions - a.actions)
       .slice(0, 5);

    return { internalMoves, sectorMap, topSkus, topValuedSkus, topOps };
  }, [filteredMovements, data]);

  const healthChartData = [
    { name: 'Saudável', value: healthStats.saudavel, color: '#10b981' },
    { name: 'Atenção', value: healthStats.atencao, color: '#f59e0b' },
    { name: 'Crítico', value: healthStats.critico, color: '#ef4444' }
  ];

  const wmsOccupation = useMemo(() => {
    return [
      { name: 'Picking', value: warehouseKpis.picking, color: '#3b82f6' },
      { name: 'Reserva', value: warehouseKpis.reserva, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [warehouseKpis]);

  const flowData = useMemo(() => {
    const grouped: Record<string, { date: string, in: number, out: number, ts: number }> = {};
    filteredMovements.forEach(m => {
        const dStr = m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (!grouped[dStr]) {
            const dayTs = new Date(m.data.getFullYear(), m.data.getMonth(), m.data.getDate()).getTime();
            grouped[dStr] = { date: dStr, in: 0, out: 0, ts: dayTs };
        }
        if (m.tipo === 'entrada') grouped[dStr].in += m.quantidade; 
        else if (m.tipo === 'saida') grouped[dStr].out += m.quantidade;
    });
    return Object.values(grouped).sort((a, b) => a.ts - b.ts).slice(-30);
  }, [filteredMovements]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b]/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[120px]">
          <p className="text-white text-lg font-black mb-2 tracking-tighter">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-[10px] font-black uppercase flex items-center justify-between gap-4" style={{ color: entry.color || entry.fill }}>
                <span>{entry.name || 'VALOR'}:</span>
                <span className="text-white">{entry.value.toLocaleString('pt-BR')}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `relatorio_dashboard_${isWarehouse ? 'geral' : 'pecas'}_alumasa`;
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 200);
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Sincronizando Dashboard Industrial...</div>;

  return (
    <div className="max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-500 w-full overflow-hidden pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 no-print">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Visão Geral</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Monitoramento industrial em tempo real.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#1e293b] p-1.5 rounded-xl flex items-center gap-4 border border-slate-700 shadow-xl">
            <Filter className="w-3.5 h-3.5 text-blue-500 ml-2" />
            
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ano:</span>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                {years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mês:</span>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                <option value="Todos" className="bg-slate-900">Todos</option>
                {months.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
              </select>
            </div>
          </div>
          <button 
            onClick={() => setShowPrintPreview(true)}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-md transition-all active:scale-95 text-rose-500"
          >
            <Printer className="w-4 h-4" /> Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {isWarehouse ? (
          <>
            <StatCard title="ESTOQUE (RESERVA)" value={warehouseKpis.reserva.toLocaleString('pt-BR')} icon={Layers} color="blue" />
            <StatCard title="PICKING (DISPONÍVEL)" value={warehouseKpis.picking.toLocaleString('pt-BR')} icon={Box} color="green" />
            <StatCard title="SALDO TOTAL" value={warehouseKpis.total.toLocaleString('pt-BR')} icon={Package} color="purple" />
          </>
        ) : (
          <>
            <StatCard title="VALOR EM ESTOQUE" value={`R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="blue" />
            <StatCard title="ENTRADAS (LANÇ.)" value={stats.totalIn} icon={ArrowUpRight} color="green" />
            <StatCard title="SAÍDAS (LANÇ.)" value={stats.totalOut} icon={ArrowDownRight} color="purple" />
          </>
        )}
        <StatCard title="ITENS CRÍTICOS" value={healthStats.critico} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 no-print">
        <div className="lg:col-span-2 bg-[#1e293b] rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 flex flex-col min-h-[550px]">
          <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <Activity className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Fluxo de Movimentações</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Comparativo diário de entrada e saída</p>
                  </div>
              </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} margin={{ bottom: 20, left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} interval={Math.ceil(flowData.length / 10)} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomTooltip />} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', paddingBottom: '30px' }} />
                <Bar dataKey="in" name="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} barSize={10} />
                <Bar dataKey="out" name="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 flex flex-col items-center min-h-[550px]">
          <div className="w-full mb-10 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Saúde do Estoque</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Nível de criticidade global</p>
              </div>
          </div>
          <div className="h-[280px] w-full relative mb-12 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={isWarehouse ? wmsOccupation : healthChartData} innerRadius={85} outerRadius={115} paddingAngle={10} dataKey="value" stroke="none" cornerRadius={8}>
                  {(isWarehouse ? wmsOccupation : healthChartData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry as any).color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-5xl font-black text-white leading-none">{data.length}</span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">SKUS Ativos</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 w-full mt-auto">
                <div className="bg-[#0f172a]/60 px-6 py-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner group hover:border-rose-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crítico / Ruptura</span>
                    </div>
                    <span className="text-2xl font-black text-white">{healthStats.critico}</span>
                </div>
                <div className="bg-[#0f172a]/60 px-6 py-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saudável / Disponível</span>
                    </div>
                    <span className="text-2xl font-black text-white">{healthStats.saudavel}</span>
                </div>
          </div>
        </div>
      </div>

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col items-center overflow-auto print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:h-auto print:overflow-visible print:bg-white">
           <div className="w-full sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shadow-2xl no-print preview-toolbar">
             <div className="flex items-center gap-2">
               <FileText className="w-5 h-5 text-blue-400" />
               <span className="font-black text-xs uppercase tracking-widest text-white">Relatório Supervisor - Visão Geral do Almoxarifado</span>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-[10px] uppercase text-white transition-all active:scale-95">Voltar</button>
               <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase text-white shadow-lg active:scale-95 flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Confirmar Impressão</button>
             </div>
          </div>

          <div className="flex-1 w-full flex justify-center py-10 print:py-0 print:block print:bg-white">
             <div className="printable-document bg-white !text-black p-12 w-[210mm] shadow-2xl min-h-[297mm] print:shadow-none print:p-0 print:w-full">
                <header className="mb-10 text-center border-b-[3px] border-black pb-6 text-black">
                    <h1 className="text-6xl font-black leading-none uppercase tracking-tighter text-black">ALUMASA</h1>
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-black">ALUMÍNIO & PLÁSTICO</span>
                    <div className="mt-8 space-y-1">
                        <h2 className="text-3xl font-black uppercase tracking-tight text-black">RELATÓRIO GERENCIAL {isWarehouse ? 'ALMOXARIFADO GERAL' : 'ALMOXARIFADO DE PEÇAS'}</h2>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-black">{isWarehouse ? 'UNIDADE DE LOGÍSTICA E ARMAZENAGEM INDUSTRIAL' : 'UNIDADE DE PEÇAS E REPOSIÇÃO INDUSTRIAL'}</p>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <div className="border border-black px-4 py-1.5 text-[9px] font-black uppercase bg-gray-50 rounded text-black">FILTROS: {selectedYear} / {selectedMonth} • EMITIDO EM: {new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                </header>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                   <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES EXECUTIVOS (KPIS)</h3>
                   <table className="w-full border-collapse border border-black text-black">
                      <tbody>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black bg-gray-50 text-black">{isWarehouse ? 'SALDO TOTAL EM PEÇAS' : 'VALOR TOTAL EM ESTOQUE'}</td>
                            <td className="p-3 font-black text-lg text-black">{isWarehouse ? `${(warehouseKpis.total as number).toLocaleString('pt-BR')} Unidades` : `R$ ${(stats.totalValue as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                         </tr>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black bg-gray-50 text-black">LANÇAMENTOS DE ENTRADA (INBOUND)</td>
                            <td className="p-3 font-black text-lg text-emerald-600">{stats.totalIn} Registros</td>
                         </tr>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black bg-gray-50 text-black">REQUISIÇÕES DE SAÍDA (OUTBOUND)</td>
                            <td className="p-3 font-black text-lg text-rose-600">{stats.totalOut} Registros</td>
                         </tr>
                         <tr>
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black bg-gray-50 text-black">SKUS EM NÍVEL CRÍTICO / RUPTURA</td>
                            <td className="p-3 font-black text-lg text-red-600">{healthStats.critico} Itens</td>
                         </tr>
                      </tbody>
                   </table>
                </section>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                   <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. SAÚDE E DISPONIBILIDADE DO INVENTÁRIO</h3>
                   <table className="w-full border-collapse border border-black text-center text-black">
                      <thead>
                         <tr className="bg-gray-100 text-[10px] font-black uppercase text-black">
                            <th className="border border-black px-4 py-2 text-left w-1/2 text-black">CLASSIFICAÇÃO DE DISPONIBILIDADE</th>
                            <th className="border border-black px-4 py-2 text-black">QUANTIDADE DE SKUS</th>
                            <th className="border border-black px-4 py-2 text-black">PARTICIPAÇÃO (%)</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr className="text-[10px] font-bold text-black border-b border-black">
                            <td className="border-r border-black px-4 py-2 text-left uppercase text-black">CRÍTICO (ABAIXO DO MÍNIMO / RUPTURA)</td>
                            <td className="border-r border-black px-4 py-2 font-black text-black">{healthStats.critico}</td>
                            <td className="border-black px-4 py-2 text-black">{((healthStats.critico / (data.length || 1)) * 100).toFixed(1)}%</td>
                         </tr>
                         <tr className="text-[10px] font-bold text-black border-b border-black">
                            <td className="border-r border-black px-4 py-2 text-left uppercase text-black">ATENÇÃO (ALERTA DE REPOSIÇÃO)</td>
                            <td className="border-r border-black px-4 py-2 font-black text-black">{healthStats.atencao}</td>
                            <td className="border-black px-4 py-2 text-black">{((healthStats.atencao / (data.length || 1)) * 100).toFixed(1)}%</td>
                         </tr>
                         <tr className="text-[10px] font-bold text-black border-b border-black">
                            <td className="border-r border-black px-4 py-2 text-left uppercase text-black">SAUDÁVEL (DISPONIBILIDADE PLENA)</td>
                            <td className="border-r border-black px-4 py-2 font-black text-black">{healthStats.saudavel}</td>
                            <td className="border-black px-4 py-2 text-black">{((healthStats.saudavel / (data.length || 1)) * 100).toFixed(1)}%</td>
                         </tr>
                      </tbody>
                   </table>
                </section>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                  <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. TOP 10 SKUS (MAIOR IMPACTO FINANCEIRO / VOLUME)</h3>
                  <table className="w-full border-collapse border border-black text-center text-black">
                      <thead>
                        <tr className="bg-gray-100 text-[10px] font-black uppercase text-black">
                            <th className="border border-black px-4 py-2 text-left text-black">CÓDIGO</th>
                            <th className="border border-black px-4 py-2 text-left text-black">DESCRIÇÃO DO ATIVO</th>
                            <th className="border border-black px-4 py-2 text-black">SALDO ATUAL</th>
                            <th className="border border-black px-4 py-2 text-black">{isWarehouse ? 'LOCALIZAÇÃO' : 'VALOR TOTAL (R$)'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isWarehouse ? reportMetrics.topSkus : reportMetrics.topValuedSkus).map((item) => (
                           <tr key={item.id} className="text-[9px] font-bold text-black border-b border-black">
                              <td className="border-r border-black px-4 py-2 text-left uppercase font-black text-black">{item.codigo}</td>
                              <td className="border-r border-black px-4 py-2 text-left uppercase text-black line-clamp-1">{item.descricao}</td>
                              <td className="border-r border-black px-4 py-2 font-black text-black">{item.quantidadeAtual.toLocaleString('pt-BR')}</td>
                              <td className="border-black px-4 py-2 font-black text-black">
                                 {isWarehouse ? item.localizacao : `R$ ${item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </td>
                           </tr>
                        ))}
                      </tbody>
                  </table>
                </section>

                {isWarehouse && (
                  <>
                    <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                      <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">4. CONSUMO POR SETOR DESTINO</h3>
                      <table className="w-full border-collapse border border-black text-center text-black">
                          <thead>
                            <tr className="bg-gray-100 text-[10px] font-black uppercase text-black">
                                <th className="border border-black px-4 py-2 text-left w-1/2 text-black">SETOR / DEPARTAMENTO</th>
                                <th className="border border-black px-4 py-2 text-black">VOLUME REQUISITADO (PCS)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(reportMetrics.sectorMap).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 10).map(([name, value]) => (
                               <tr key={name} className="text-[10px] font-bold text-black border-b border-black">
                                  <td className="border-r border-black px-4 py-2 text-left uppercase text-black">{name}</td>
                                  <td className="border-black px-4 py-2 font-black text-black">{(value as number).toLocaleString('pt-BR')}</td>
                               </tr>
                            ))}
                          </tbody>
                      </table>
                    </section>
                  </>
                )}

                <footer className="mt-20 pt-16 flex justify-between gap-12 text-black" style={{ pageBreakInside: 'avoid' }}>
                   <div className="flex-1 text-center text-black">
                      <div className="w-full border-t border-black mb-1"></div>
                      <span className="text-[9px] font-black uppercase text-black">ASSINATURA SUPERVISOR PCM</span>
                   </div>
                   <div className="flex-1 text-center text-black">
                      <div className="w-full border-t border-black mb-1"></div>
                      <span className="text-[9px] font-black uppercase text-black">GERÊNCIA INDUSTRIAL</span>
                   </div>
                </footer>
                
                <div className="mt-12 pt-4 border-t border-gray-200 text-center text-black">
                    <p className="text-[7px] font-black uppercase tracking-widest text-gray-400">Relatório Consolidado de Unidade Alumasa - Gerado Eletronicamente em {new Date().toLocaleString('pt-BR')}</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;