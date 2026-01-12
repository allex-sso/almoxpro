
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  DollarSign, TrendingUp, Activity, AlertTriangle, Calendar, TrendingDown, 
  Filter, X, Info, Package, Printer, Check, ClipboardList, ShieldCheck 
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
    let totalIn = 0;
    let totalOut = 0;
    movements.forEach(m => {
      const val = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (m.tipo === 'entrada') totalIn += val;
      else if (m.tipo === 'saida') totalOut += val;
    });
    return Math.max(0, totalIn - totalOut);
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
      const dateIso = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!grouped[dateIso]) {
        grouped[dateIso] = { dateIso, displayDate, entradaFinanceiro: 0, saidaFinanceiro: 0, entradaQtd: 0, saidaQtd: 0 };
      }
      const valTotal = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (m.tipo === 'entrada') {
          grouped[dateIso].entradaFinanceiro += valTotal;
          grouped[dateIso].entradaQtd += 1;
      } else {
          grouped[dateIso].saidaFinanceiro += valTotal;
          grouped[dateIso].saidaQtd += 1;
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

  const formatValue = (val: number, isFinancial: boolean) => 
    isFinancial 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val)
      : val.toLocaleString('pt-BR');

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
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-20 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitoramento de fluxos e saúde do estoque.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-gray-800 mr-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Histórico:</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700">
              <input type="date" className="bg-transparent text-xs font-bold text-slate-700 dark:text-white focus:outline-none" value={tempStart} onChange={e => setTempStart(e.target.value)} onKeyDown={handleKeyDown}/>
              <span className="text-slate-300">-</span>
              <input type="date" className="bg-transparent text-xs font-bold text-slate-700 dark:text-white focus:outline-none" value={tempEnd} onChange={e => setTempEnd(e.target.value)} onKeyDown={handleKeyDown}/>
            </div>
            <div className="flex gap-2">
              <button onClick={applyFilters} className="flex items-center px-3 py-1.5 bg-primary hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95">
                <Filter className="w-3 h-3 mr-1" /> Aplicar
              </button>
              {(startDate || endDate) && (
                <button onClick={clearFilters} className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
                  <X className="w-3 h-3 mr-1" /> Limpar
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={() => setShowPrintPreview(true)} 
            className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95"
          >
            <Printer className="w-4 h-4 text-rose-500" /> Relatório Gerencial
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard title="Valor em Estoque" value={formatValue(stockTotalFinancial, true)} icon={DollarSign} color="blue" />
        <StatCard title="Entradas (Lançamentos)" value={formatValue(totals.in, false)} icon={TrendingUp} color="green" />
        <StatCard title="Saídas (Lançamentos)" value={formatValue(totals.out, false)} icon={TrendingDown} color="purple" />
        <StatCard title="Itens Críticos" value={totals.critical} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                 <Activity className="w-5 h-5 mr-2 text-primary" />
                 Fluxo de Movimentações
              </h3>
              
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewType('quantity')} className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'quantity' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Package className="w-3.5 h-3.5 mr-1.5" /> Registros
                </button>
                <button onClick={() => setViewType('financial')} className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'financial' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Financeiro
                </button>
              </div>
           </div>

           <div className="h-80">
             {flowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={10} tick={{ dy: 10 }} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} formatter={(value: number) => viewType === 'financial' ? formatValue(value, true) : `${value} Reg.`}/>
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey={viewType === 'financial' ? 'entradaFinanceiro' : 'entradaQtd'} name={viewType === 'financial' ? 'Entradas (R$)' : 'Entradas (Registros)'} fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey={viewType === 'financial' ? 'saidaFinanceiro' : 'saidaQtd'} name={viewType === 'financial' ? 'Saídas (R$)' : 'Saídas (Registros)'} fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Info className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma movimentação histórica encontrada.</p>
                </div>
             )}
           </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Saúde do Estoque</h3>
          <p className="text-xs text-slate-500 mb-6">Itens em relação ao estoque mínimo</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {healthData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-[-10px]">
             <span className="text-3xl font-bold text-slate-800 dark:text-white">{data.length}</span>
             <p className="text-xs text-slate-500">Total de Itens Ativos</p>
          </div>
        </div>
      </div>

      {/* --- OVERLAY DE PRÉ-VISUALIZAÇÃO DO RELATÓRIO GERENCIAL --- */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300">
            {/* Header de Controle */}
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
                <div className="flex items-center">
                    <Printer className="mr-2 w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-widest">Relatório Gerencial de Peças</span>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowPrintPreview(false)}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center transition-all active:scale-95"
                    >
                        <X className="w-4 h-4 mr-2" /> Voltar
                    </button>
                    <button 
                        onClick={handleConfirmPrint}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center transition-all shadow-lg active:scale-95"
                    >
                        <Check className="w-4 h-4 mr-2" /> Confirmar Impressão
                    </button>
                </div>
            </div>

            {/* Conteúdo do Relatório */}
            <div className="flex-1 p-4 md:p-12 print-container">
                <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 h-auto overflow-visible block">
                    <div className="w-full">
                        <header className="mb-8 text-center border-b-[3px] border-black pb-4 no-break-inside">
                            <h1 className="text-4xl font-black mb-1 text-black">ALUMASA</h1>
                            <p className="text-lg font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                            <div className="py-2">
                                <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO GERENCIAL ALMOXARIFADO DE PEÇAS</h2>
                                <p className="text-xs font-bold text-black">Consolidado de Movimentação e Auditoria Financeira</p>
                            </div>
                        </header>

                        <section className="mb-8 no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">DADOS DA EMISSÃO</h3>
                            <table className="w-full text-[10px] border-collapse border border-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black w-1/3 bg-gray-100 text-black">Data e Hora</td>
                                        <td className="p-2 font-black text-black">{new Date().toLocaleString('pt-BR')}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Período Selecionado</td>
                                        <td className="p-2 font-black text-black">
                                          {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} até {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Tipo de Documento</td>
                                        <td className="p-2 font-black text-black">Gerencial / Auditoria de Estoque</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">RESUMO FINANCEIRO E DE LANÇAMENTOS</h3>
                            <table className="w-full text-[10px] border-collapse border border-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black w-1/3 bg-gray-100 text-black">Valor Total em Estoque</td>
                                        <td className="p-2 font-black text-black">{formatValue(stockTotalFinancial, true)}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Total de Entradas (Lançamentos)</td>
                                        <td className="p-2 font-black text-black">{totals.in} registros</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Total de Saídas (Lançamentos)</td>
                                        <td className="p-2 font-black text-black">{totals.out} registros</td>
                                    </tr>
                                    <tr>
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Itens Críticos (Abaixo do Mínimo)</td>
                                        <td className="p-2 font-black text-red-600">{totals.critical} itens</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* SEÇÃO DE SAÚDE DO ESTOQUE - Agora na mesma página que o resumo */}
                        <section className="mb-8 no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">SAÚDE GERAL DO ESTOQUE</h3>
                            <table className="w-full text-[10px] border-collapse border border-black">
                                <thead style={{ display: 'table-header-group' }}>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2 text-left font-black text-black">Status</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Quantidade de Itens</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Percentual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {healthData.map((d, i) => (
                                        <tr key={i} className="border-b border-black">
                                            <td className="border-r border-black p-2 font-bold text-black">{d.name}</td>
                                            <td className="border-r border-black p-2 text-center font-black text-black">{d.value}</td>
                                            <td className="p-2 text-center font-black text-black">{((d.value / (data.length || 1)) * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        {/* AUDITORIA CONTINUA SEM QUEBRA FORÇADA (REMOVIDA CLASSE break-before) */}
                        <div className="mb-12">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">AUDITORIA DE ESTOQUE ATUAL (PEÇAS)</h3>
                            <table className="w-full text-[8px] border-collapse border border-black">
                                <thead style={{ display: 'table-header-group' }}>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-1 font-black text-black">Código</th>
                                        <th className="border border-black p-1 font-black text-left text-black">Descrição</th>
                                        <th className="border border-black p-1 font-black text-left text-black">Equipamento</th>
                                        <th className="border border-black p-1 text-center font-black text-black">Estoque</th>
                                        <th className="border border-black p-1 text-center font-black text-black">Mínimo</th>
                                        <th className="border border-black p-1 text-center font-black text-black">Vlr. Unit</th>
                                        <th className="border border-black p-1 text-right font-black text-black">Vlr. Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, i) => (
                                        <tr key={i} className="border-b border-black" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                            <td className="border-r border-black p-1 font-bold text-black font-mono">{item.codigo}</td>
                                            <td className="border-r border-black p-1 text-black">{item.descricao}</td>
                                            <td className="border-r border-black p-1 text-black">{item.equipamento || '-'}</td>
                                            <td className={`border-r border-black p-1 text-center font-black ${item.quantidadeAtual <= item.quantidadeMinima ? 'text-red-600' : 'text-black'}`}>{item.quantidadeAtual}</td>
                                            <td className="border-r border-black p-1 text-center text-black">{item.quantidadeMinima}</td>
                                            <td className="border-r border-black p-1 text-center text-black">R$ {item.valorUnitario.toFixed(2)}</td>
                                            <td className="p-1 text-right font-black text-black">R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <footer className="mt-8 pt-16 flex justify-between gap-24 no-break-inside">
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Coordenador de Peças</div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Gerente Industrial</div>
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
