
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Activity, AlertTriangle, Calendar, Package, DollarSign, ArrowUpRight, ArrowDownRight, Printer, Filter, ShieldCheck, Box, Layers, MousePointer2, TrendingDown, LayoutDashboard, X, Check, FileText, RefreshCw
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

const Dashboard: React.FC<DashboardProps> = ({ data, stats, movements = [], isLoading = false, isWarehouse = false }) => {
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const healthStats = useMemo(() => {
    const map = { saudavel: 0, atencao: 0, critico: 0 };
    data.forEach(item => {
      const situacao = (item.situacao || 'OK').toUpperCase();
      // Lógica expandida para capturar diferentes nomenclaturas de erro/alerta
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

  const warehouseKpis = useMemo(() => {
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
    movements.forEach(m => {
        const dStr = m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (!grouped[dStr]) {
            const dayTs = new Date(m.data.getFullYear(), m.data.getMonth(), m.data.getDate()).getTime();
            grouped[dStr] = { date: dStr, in: 0, out: 0, ts: dayTs };
        }
        if (m.tipo === 'entrada') grouped[dStr].in += m.quantidade; 
        else if (m.tipo === 'saida') grouped[dStr].out += m.quantidade;
    });
    return Object.values(grouped).sort((a, b) => a.ts - b.ts).slice(-30);
  }, [movements]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b]/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[120px]">
          <p className="text-white text-lg font-black mb-2 tracking-tighter">{label}</p>
          <div className="space-y-1">
            <p className="text-[#10b981] text-[10px] font-black uppercase flex items-center justify-between gap-4">
              <span>ENT:</span>
              <span className="text-white">{payload[0].value.toLocaleString('pt-BR')}</span>
            </p>
            <p className="text-[#ef4444] text-[10px] font-black uppercase flex items-center justify-between gap-4">
              <span>SAÍ:</span>
              <span className="text-white">{payload[1].value.toLocaleString('pt-BR')}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Sincronizando Dashboard Industrial...</div>;

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 animate-in fade-in duration-500 w-full overflow-hidden">
      {/* UI DE TELA */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 no-print">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Visão Geral</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Monitoramento industrial em tempo real.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#1e293b]/50 backdrop-blur-md p-1.5 rounded-xl flex items-center gap-4 shadow-xl border border-slate-700/50">
            <div className="flex items-center gap-2 px-2 border-r border-slate-700/50">
                <input type="date" className="bg-transparent text-[10px] font-black outline-none text-white w-24" value={tempStart} onChange={e => setTempStart(e.target.value)} />
                <span className="text-slate-600 font-bold">-</span>
                <input type="date" className="bg-transparent text-[10px] font-black outline-none text-white w-24" value={tempEnd} onChange={e => setTempEnd(e.target.value)} />
            </div>
            <button className="px-4 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-95 flex items-center gap-2">
                <Filter className="w-3 h-3" /> APLICAR
            </button>
          </div>
          <button 
            onClick={() => setShowPrintPreview(true)}
            className="bg-[#1e293b] border border-slate-700 px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-md transition-all active:scale-95 text-white"
          >
            <Printer className="w-4 h-4 text-rose-500" /> Relatório Completo
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 no-print pb-4">
        <div className="lg:col-span-2 bg-[#1e293b] rounded-[2rem] p-6 shadow-2xl border border-slate-800 flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Fluxo de Movimentações</h3>
              </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} margin={{ bottom: 10, left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#64748b'}} interval={Math.ceil(flowData.length / 12)} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#64748b'}} />
                <Tooltip cursor={{ fill: '#f8fafc', opacity: 0.1 }} content={<CustomTooltip />} />
                <Bar dataKey="in" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8} />
                <Bar dataKey="out" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded-[2rem] p-6 shadow-2xl border border-slate-800 flex flex-col items-center min-h-[380px]">
          <div className="w-full mb-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Saúde do Estoque</h3>
          </div>
          <div className="h-[180px] w-full relative mb-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={isWarehouse ? wmsOccupation : healthChartData} innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={5}>
                  {(isWarehouse ? wmsOccupation : healthChartData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry as any).color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-white leading-none">{data.length}</span>
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">SKUS Ativos</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 w-full mt-auto">
                <div className="bg-[#0f172a]/40 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Crítico / Ruptura</span>
                    </div>
                    <span className="text-lg font-black text-white">{healthStats.critico}</span>
                </div>
                <div className="bg-[#0f172a]/40 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Atenção</span>
                    </div>
                    <span className="text-lg font-black text-white">{healthStats.atencao}</span>
                </div>
                <div className="bg-[#0f172a]/40 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Saudável</span>
                    </div>
                    <span className="text-lg font-black text-white">{healthStats.saudavel}</span>
                </div>
          </div>
        </div>
      </div>

      {/* OVERLAY DE IMPRESSÃO - REFORMULADO PARA PEÇAS COM CORREÇÃO DE VISIBILIDADE */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col items-center overflow-auto print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:h-auto print:overflow-visible print:bg-white">
           <div className="w-full sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shadow-2xl no-print preview-toolbar">
             <div className="flex items-center gap-2">
               <FileText className="w-5 h-5 text-blue-400" />
               <span className="font-black text-xs uppercase tracking-widest text-white">Relatório Gerencial - {isWarehouse ? 'Almoxarifado Geral' : 'Almoxarifado de Peças'}</span>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-[10px] uppercase text-white transition-all active:scale-95">Voltar</button>
               <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase text-white shadow-lg active:scale-95 flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Confirmar Impressão</button>
             </div>
          </div>

          <div className="flex-1 w-full flex justify-center py-10 print:py-0 print:block print:bg-white">
             <div className="printable-document bg-white !text-black p-12 w-[210mm] shadow-2xl min-h-[297mm] print:shadow-none print:p-0 print:w-full">
                
                <header className="mb-10 text-center border-b-[3px] border-black pb-6 text-black">
                    <h1 className="text-6xl font-black leading-none uppercase tracking-tighter text-black !text-black">ALUMASA</h1>
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-black !text-black">ALUMÍNIO & PLÁSTICO</span>
                    
                    <div className="mt-8 space-y-1">
                        <h2 className="text-3xl font-black uppercase tracking-tight text-black !text-black">
                          RELATÓRIO GERENCIAL {isWarehouse ? 'ALMOXARIFADO GERAL' : 'ALMOXARIFADO DE PEÇAS'}
                        </h2>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-black !text-black">
                          {isWarehouse ? 'UNIDADE DE LOGÍSTICA E ARMAZENAGEM INDUSTRIAL' : 'UNIDADE DE PEÇAS E REPOSIÇÃO INDUSTRIAL'}
                        </p>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <div className="border border-black px-4 py-1.5 text-[9px] font-black uppercase bg-gray-50 rounded text-black !text-black">
                            EMITIDO EM: {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </header>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                   <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES GERAIS DE PERFORMANCE</h3>
                   <table className="w-full border-collapse border border-black text-black">
                      <tbody>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black text-black !text-black">
                              {isWarehouse ? 'SALDO TOTAL' : 'VALOR TOTAL EM ESTOQUE'}
                            </td>
                            <td className="p-3 font-black text-lg text-black !text-black">
                              {isWarehouse ? 
                                `${warehouseKpis.total.toLocaleString('pt-BR')} Unidades` : 
                                `R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              }
                            </td>
                         </tr>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black text-black !text-black">ENTRADAS REGISTRADAS</td>
                            <td className="p-3 font-black text-lg text-emerald-600 !text-emerald-600">{stats.totalIn} Lançamentos</td>
                         </tr>
                         <tr className="border-b border-black">
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black text-black !text-black">SAÍDAS REGISTRADAS</td>
                            <td className="p-3 font-black text-lg text-rose-600 !text-rose-600">{stats.totalOut} Lançamentos</td>
                         </tr>
                         <tr>
                            <td className="p-3 w-1/2 font-black text-[11px] uppercase border-r border-black text-black !text-black">ITENS EM NÍVEL CRÍTICO</td>
                            <td className="p-3 font-black text-lg text-red-600 !text-red-600">{healthStats.critico} Itens</td>
                         </tr>
                      </tbody>
                   </table>
                </section>

                <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                   <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. SAÚDE DO ESTOQUE CONSOLIDADO</h3>
                   <table className="w-full border-collapse border border-black text-center text-black">
                      <thead>
                         <tr className="bg-gray-100 text-[10px] font-black uppercase text-black">
                            <th className="border border-black px-4 py-2 text-left w-1/2 text-black !text-black">STATUS DO INVENTÁRIO</th>
                            <th className="border border-black px-4 py-2 text-black !text-black">QUANTIDADE DE ITENS</th>
                            <th className="border border-black px-4 py-2 text-black !text-black">PARTICIPAÇÃO (%)</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr className="text-[10px] font-bold text-black">
                            <td className="border border-black px-4 py-2 text-left uppercase text-black !text-black">CRÍTICO (REPOR)</td>
                            <td className="border border-black px-4 py-2 font-black text-black !text-black">{healthStats.critico}</td>
                            <td className="border border-black px-4 py-2 text-black !text-black">{((healthStats.critico / (data.length || 1)) * 100).toFixed(1)}%</td>
                         </tr>
                         <tr className="text-[10px] font-bold text-black">
                            <td className="border border-black px-4 py-2 text-left uppercase text-black !text-black">ATENÇÃO</td>
                            <td className="border border-black px-4 py-2 font-black text-black !text-black">{healthStats.atencao}</td>
                            <td className="border border-black px-4 py-2 text-black !text-black">{((healthStats.atencao / (data.length || 1)) * 100).toFixed(1)}%</td>
                         </tr>
                         <tr className="text-[10px] font-bold text-black">
                            <td className="border border-black px-4 py-2 text-left uppercase text-black !text-black">SAUDÁVEL</td>
                            <td className="border border-black px-4 py-2 font-black text-black !text-black">{healthStats.saudavel}</td>
                            <td className="border border-black px-4 py-2 text-black !text-black">{((healthStats.saudavel / (data.length || 1)) * 100).toFixed(1)}%</td>
                         </tr>
                         <tr className="bg-gray-50 text-[10px] font-black text-black">
                            <td className="border border-black px-4 py-2 text-left uppercase text-black !text-black">TOTAL DE ITENS ATIVOS</td>
                            <td className="border border-black px-4 py-2 text-black !text-black">{data.length}</td>
                            <td className="border border-black px-4 py-2 text-black !text-black">100.0%</td>
                         </tr>
                      </tbody>
                   </table>
                </section>

                <section className="mb-10 text-black">
                   <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. DETALHAMENTO ANALÍTICO DO INVENTÁRIO</h3>
                   <table className="w-full border-collapse border border-black text-black">
                      <thead style={{ display: 'table-header-group' }}>
                        <tr className="bg-gray-100 text-[9px] font-black uppercase text-black">
                           <th className="border border-black px-2 py-2 text-left text-black !text-black">CÓD.</th>
                           <th className="border border-black px-2 py-2 text-left text-black !text-black">DESCRIÇÃO DO MATERIAL</th>
                           <th className="border border-black px-2 py-2 text-center text-black !text-black">SALDO</th>
                           <th className="border border-black px-2 py-2 text-right text-black !text-black">VLR. UNITÁRIO</th>
                           <th className="border border-black px-2 py-2 text-right text-black !text-black">VLR. TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sort((a,b) => (b.valorTotal || 0) - (a.valorTotal || 0)).map((item, idx) => (
                          <tr key={idx} className="text-[8px] border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                             <td className="border-r border-black px-2 py-1.5 font-black text-black !text-black">{item.codigo}</td>
                             <td className="border-r border-black px-2 py-1.5 font-bold uppercase text-black !text-black">{item.descricao}</td>
                             <td className="border-r border-black px-2 py-1.5 text-center font-black text-black !text-black">{item.quantidadeAtual.toLocaleString('pt-BR')}</td>
                             <td className="border-r border-black px-2 py-1.5 text-right font-bold text-black !text-black">R$ {item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             <td className="px-2 py-1.5 text-right font-black text-black !text-black">R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </section>

                <footer className="mt-20 pt-16 flex justify-between gap-12 text-black" style={{ pageBreakInside: 'avoid' }}>
                   <div className="flex-1 text-center text-black">
                      <div className="w-full border-t border-black mb-1 border-black"></div>
                      <span className="text-[9px] font-black uppercase text-black !text-black">RESPONSÁVEL PELO INVENTÁRIO</span>
                   </div>
                   <div className="flex-1 text-center text-black">
                      <div className="w-full border-t border-black mb-1 border-black"></div>
                      <span className="text-[9px] font-black uppercase text-black !text-black">GERÊNCIA INDUSTRIAL</span>
                   </div>
                </footer>

                <div className="mt-12 pt-4 border-t border-black/10 flex justify-between text-[7px] font-black uppercase text-gray-400 text-black" style={{ pageBreakInside: 'avoid' }}>
                   <span className="text-black !text-black">SISTEMA DE GESTÃO ALUMASA • AUDITORIA GERENCIAL</span>
                   <span className="text-black !text-black">DOCUMENTO DE CONTROLE INTERNO - {new Date().getFullYear()}</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
