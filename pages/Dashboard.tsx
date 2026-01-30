import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  DollarSign, TrendingUp, Activity, AlertTriangle, Calendar, TrendingDown, 
  Filter, X, Info, Package, Printer, Check, ShieldCheck 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { DashboardStats, InventoryItem, Movement } from '../types';

interface DashboardProps {
  data: InventoryItem[];
  stats: DashboardStats;
  movements?: Movement[];
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, stats, movements = [], isLoading = false }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');
  const [viewType, setViewType] = useState<'financial' | 'quantity'>('quantity');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const applyFilters = () => {
    setStartDate(tempStart);
    setEndDate(tempEnd);
  };

  const clearFilters = () => {
    setTempStart('');
    setTempEnd('');
    setStartDate('');
    setEndDate('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const healthData = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let healthy = 0;

    data.forEach(item => {
      const min = item.quantidadeMinima || 0;
      if (min > 0) {
        if (item.quantidadeAtual <= min) critical++;
        else if (item.quantidadeAtual <= min * 1.2) warning++;
        else healthy++;
      } else {
        healthy++;
      }
    });

    return [
      { name: 'Crítico (Repor)', value: critical, color: '#ef4444' },
      { name: 'Atenção', value: warning, color: '#f59e0b' },
      { name: 'Saudável', value: healthy, color: '#10b981' },
    ].filter(d => d.value > 0);
  }, [data]);

  const stockTotalFinancial = useMemo(() => {
    let totalEntradasFinanceiro = 0;
    let totalSaidasFinanceiro = 0;

    movements.forEach(m => {
      const valorMovimentacao = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (m.tipo === 'entrada') {
        totalEntradasFinanceiro += valorMovimentacao;
      } else if (m.tipo === 'saida') {
        totalSaidasFinanceiro += valorMovimentacao;
      }
    });

    return totalEntradasFinanceiro - totalSaidasFinanceiro;
  }, [movements]);

  const { flowData, totals } = useMemo(() => {
    const filteredMovements = movements.filter(m => {
      if (!startDate && !endDate) return true;
      if (!m.data || isNaN(m.data.getTime())) return false;
      const moveTime = m.data.getTime();
      if (startDate) {
          const [sy, sm, sd] = startDate.split('-').map(Number);
          const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
          if (moveTime < start) return false;
      }
      if (endDate) {
          const [ey, em, ed] = endDate.split('-').map(Number);
          const end = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
          if (moveTime > end) return false;
      }
      return true;
    });

    let recordsInTotal = 0;
    let recordsOutTotal = 0;
    const grouped: Record<string, { dateIso: string, displayDate: string, entradaFinanceiro: number, saidaFinanceiro: number, entradaQtd: number, saidaQtd: number }> = {};

    filteredMovements.forEach(m => {
      if (m.tipo === 'entrada') recordsInTotal++; 
      if (m.tipo === 'saida') recordsOutTotal++;
      
      const d = m.data || new Date();
      const dateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (!grouped[displayDate]) {
        grouped[displayDate] = { dateIso, displayDate, entradaFinanceiro: 0, saidaFinanceiro: 0, entradaQtd: 0, saidaQtd: 0 };
      }
      
      const valTotal = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (m.tipo === 'entrada') {
          grouped[displayDate].entradaFinanceiro += valTotal;
          grouped[displayDate].entradaQtd += 1;
      } else {
          grouped[displayDate].saidaFinanceiro += valTotal;
          grouped[displayDate].saidaQtd += 1;
      }
    });

    const sortedFlow = Object.values(grouped).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    const criticalCount = healthData.find(d => d.name.includes('Crítico'))?.value || 0;

    return {
        flowData: sortedFlow,
        totals: {
            in: recordsInTotal,
            out: recordsOutTotal,
            critical: criticalCount
        }
    };
  }, [movements, startDate, endDate, healthData]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    document.title = "relatorio_almoxarifado_pecas_alumasa";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Activity className="w-12 h-12 text-primary animate-spin" />
        <p className="font-black text-slate-500 uppercase tracking-widest">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 no-print">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Monitoramento de fluxos e saúde do estoque.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-dark-card p-2.5 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 pl-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">Filtrar Histórico:</span>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-700">
              <input 
                type="date" 
                className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none focus:text-primary transition-colors cursor-pointer" 
                value={tempStart} 
                onChange={e => setTempStart(e.target.value)} 
                onKeyDown={handleKeyDown}
              />
              <span className="text-slate-600 font-bold">-</span>
              <input 
                type="date" 
                className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none focus:text-primary transition-colors cursor-pointer" 
                value={tempEnd} 
                onChange={e => setTempEnd(e.target.value)} 
                onKeyDown={handleKeyDown}
              />
            </div>

            <button 
                onClick={applyFilters} 
                className="flex items-center px-6 py-2.5 bg-primary hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 group"
            >
                <Filter className="w-3.5 h-3.5 mr-2 group-hover:rotate-12 transition-transform" /> APLICAR
            </button>
            
            {(startDate || endDate) && (
              <button onClick={clearFilters} className="pr-2 text-slate-500 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowPrintPreview(true)} 
            className="bg-white dark:bg-dark-card border border-gray-700 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95 shadow-md group"
          >
            <Printer className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" /> 
            <span className="text-slate-800 dark:text-slate-300">Relatório</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard title="VALOR EM ESTOQUE" value={formatCurrency(stockTotalFinancial)} icon={DollarSign} color="blue" />
        <StatCard title="ENTRADAS (PERÍODO)" value={totals.in} icon={TrendingUp} color="green" />
        <StatCard title="SAÍDAS (PERÍODO)" value={totals.out} icon={TrendingDown} color="purple" />
        <StatCard title="ITENS CRÍTICOS" value={totals.critical} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Fluxo de Movimentações</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entradas vs. Saídas no período</p>
                </div>
             </div>
             
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewType('quantity')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'quantity' ? 'bg-white dark:bg-slate-700 text-primary shadow-md' : 'text-slate-500'}`}>Registros</button>
                <button onClick={() => setViewType('financial')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'financial' ? 'bg-white dark:bg-slate-700 text-primary shadow-md' : 'text-slate-500'}`}>Financeiro</button>
             </div>
          </div>

          <div className="h-80">
            {flowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fontBold: true, fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontBold: true, fill: '#94a3b8'}} tickFormatter={(val) => viewType === 'financial' ? `R$${val}` : val} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: number) => [viewType === 'financial' ? formatCurrency(value) : value, viewType === 'financial' ? 'Valor' : 'Lançamentos']}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                  <Bar dataKey={viewType === 'financial' ? 'entradaFinanceiro' : 'entradaQtd'} name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey={viewType === 'financial' ? 'saidaFinanceiro' : 'saidaQtd'} name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Info className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Sem movimentações no período</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Saúde do Estoque Físico
          </h3>
          <div className="h-64 relative">
            {healthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {healthData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Aguardando dados...</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-4xl font-black text-slate-800 dark:text-white leading-none">{data.length}</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Itens Ativos</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-8">
             {healthData.map((d, i) => (
               <div key={i} className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: d.color }}></div>
                  <span className="text-lg font-black dark:text-white">{d.value}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase text-center">{d.name.split(' ')[0]}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:relative print:block print:h-auto print:overflow-visible">
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
                <div className="flex items-center">
                    <Printer className="mr-2 w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-widest">Relatório Gerencial Alumasa</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
                    <button onClick={handleConfirmPrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all shadow-lg active:scale-95"><Check className="w-4 h-4 mr-2" /> Confirmar Impressão</button>
                </div>
            </div>

            <div className="print-container flex-1 p-4 md:p-12 print:p-0 print:block print:h-auto print:static">
                <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 h-auto overflow-visible block print:border-none print:p-0 print:static print:max-w-none">
                    <div className="w-full print:static">
                        <header className="mb-8 text-center border-b-[3px] border-black pb-4 no-break-inside">
                            <h1 className="text-5xl font-black mb-1 text-black">ALUMASA</h1>
                            <p className="text-xl font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                            <div className="py-2">
                                <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO GERENCIAL ALMOXARIFADO DE PEÇAS</h2>
                                <p className="text-xs font-bold text-black uppercase">Unidade de Peças e Reposição Industrial</p>
                            </div>
                        </header>

                        <section className="mb-8 w-full no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES GERAIS DE PERFORMANCE</h3>
                            <table className="w-full text-sm border-collapse border border-black text-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black uppercase">Valor Total em Estoque</td>
                                      <td className="p-3 font-black text-black text-lg">{formatCurrency(stockTotalFinancial)}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-3 font-black bg-gray-50 text-black uppercase">Entradas Registradas</td>
                                      <td className="p-3 font-black text-emerald-600 text-lg">{totals.in} Lançamentos</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-3 font-black bg-gray-50 text-black uppercase">Saídas Registradas</td>
                                      <td className="p-3 font-black text-rose-600 text-lg">{totals.out} Lançamentos</td>
                                    </tr>
                                    <tr>
                                      <td className="border-r border-black p-3 font-black bg-gray-50 text-black uppercase">Itens em Nível Crítico</td>
                                      <td className="p-3 font-black text-red-600 text-lg">{totals.critical} Tipologias</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 w-full no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. SAÚDE DO ESTOQUE CONSOLIDADO</h3>
                            <table className="w-full text-[10px] border-collapse border border-black text-black">
                                <thead>
                                    <tr className="bg-gray-100">
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Status do Inventário</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Quantidade de Itens</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Participação (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {healthData.map((d, i) => (
                                      <tr key={i} className="border-b border-black">
                                        <td className="border-r border-black p-2 font-bold uppercase text-black">{d.name}</td>
                                        <td className="border-r border-black p-2 text-right font-black text-black">{d.value}</td>
                                        <td className="p-2 text-right font-black text-black">{((d.value / (data.length || 1)) * 100).toFixed(1)}%</td>
                                      </tr>
                                    ))}
                                    <tr className="bg-gray-50">
                                        <td className="border-r border-black p-2 font-black text-black uppercase">Total de Itens Ativos</td>
                                        <td className="border-r border-black p-2 text-right font-black text-black">{data.length}</td>
                                        <td className="p-2 text-right font-black text-black">100.0%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 w-full overflow-visible">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. DETALHAMENTO ANALÍTICO DO INVENTÁRIO</h3>
                            <table className="w-full text-[8px] border-collapse border border-black text-black">
                                <thead style={{ display: 'table-header-group' }}>
                                    <tr className="bg-gray-100">
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Cód.</th>
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Descrição do Material</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Saldo</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Vlr. Unitário</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Vlr. Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, idx) => (
                                        <tr key={idx} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                                            <td className="border-r border-black p-1.5 font-bold text-black">{item.codigo}</td>
                                            <td className="border-r border-black p-1.5 text-black uppercase">{item.descricao}</td>
                                            <td className={`border-r border-black p-1.5 text-right font-black ${item.quantidadeAtual <= item.quantidadeMinima ? 'text-red-600' : 'text-black'}`}>{item.quantidadeAtual}</td>
                                            <td className="border-r border-black p-1.5 text-right font-black text-black">{formatCurrency(item.valorUnitario || 0)}</td>
                                            <td className="p-1.5 text-right font-black text-black">{formatCurrency(item.valorTotal || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <footer className="mt-12 pt-10 flex justify-between gap-24 no-break-inside text-black">
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Responsável Almoxarifado</div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Industrial</div>
                            </div>
                        </footer>
                        <div className="mt-8 pt-4 border-t border-black flex justify-between text-[7px] font-black uppercase text-black no-break-inside">
                            <div>Documento Auditável Alumasa Industrial - Almoxarifado de Peças</div>
                            <div>Emitido em: {new Date().toLocaleString('pt-BR')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;