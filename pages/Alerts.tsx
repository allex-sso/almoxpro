
import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, Printer, ChevronLeft, ChevronRight, X, Check, 
  FileText, Calendar, Package, TrendingUp, Info, History, 
  Search, Edit3, Archive, AlertCircle, Clock, ArrowUpCircle
} from 'lucide-react';
import { InventoryItem, Movement } from '../types';

interface AlertsProps {
  data: InventoryItem[];
  movements?: Movement[];
}

const Alerts: React.FC<AlertsProps> = ({ data, movements = [] }) => {
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [observations, setObservations] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('alumasa_alerts_obs');
    return saved ? JSON.parse(saved) : {};
  });

  const itemsPerPage = 10;

  // Salvar observações automaticamente ao digitar
  const handleObsChange = (id: string, value: string) => {
    const newObs = { ...observations, [id]: value };
    setObservations(newObs);
    localStorage.setItem('alumasa_alerts_obs', JSON.stringify(newObs));
  };

  // 1. REPOSIÇÃO NECESSÁRIA (Dados da Tabela Principal)
  // Regra: Saldo <= Mínimo. Ordenado por Tempo de Entrega (Lead Time) Descendente.
  const reposicaoNecessaria = useMemo(() => {
    return data
      .filter(item => item.quantidadeAtual <= item.quantidadeMinima && item.quantidadeMinima > 0)
      .map(item => ({
        id: item.id,
        codigo: item.codigo,
        desc: item.descricao,
        fornecedor: item.fornecedor || '-',
        min: item.quantidadeMinima,
        atual: item.quantidadeAtual,
        leadTime: item.tempoEntrega || 0,
        situacao: item.quantidadeAtual === 0 ? 'RUPTURA' : 'REPOR'
      }))
      .sort((a, b) => b.leadTime - a.leadTime); // Itens com maior lead time vêm primeiro
  }, [data]);

  // 2. POSSÍVEL EXCESSO DE ESTOQUE
  const excessoSaldos = useMemo(() => {
    return data.filter(item => {
      const movementCount = movements.filter(m => m.codigo === item.codigo && m.tipo === 'saida').length;
      return item.quantidadeAtual > 50 && movementCount < 2;
    }).slice(0, 10);
  }, [data, movements]);

  // 3. ITENS SEM MOVIMENTAÇÃO
  const itensParados = useMemo(() => {
    const movedCodes = new Set(movements.map(m => m.codigo));
    return data.filter(item => !movedCodes.has(item.codigo)).slice(0, 10);
  }, [data, movements]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedAlerts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAlerts(next);
  };

  const totalPages = Math.ceil(reposicaoNecessaria.length / itemsPerPage);
  const paginatedReposicao = reposicaoNecessaria.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getLeadTimeBadge = (days: number) => {
    if (days >= 15) return <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded text-[9px] font-black uppercase"><ArrowUpCircle className="w-3 h-3" /> Urgência Logística ({days} d)</span>;
    if (days > 5) return <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[9px] font-black uppercase"><Clock className="w-3 h-3" /> Prazo Médio ({days} d)</span>;
    return <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[9px] font-black uppercase">{days} dias</span>;
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* TÍTULO DA PÁGINA */}
      <div className="no-print">
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Reposição de Estoque</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
          Ranking de reposição priorizado por <span className="text-blue-400">Lead Time</span> e <span className="text-rose-400">Ruptura</span>.
        </p>
      </div>

      {/* CARD PRINCIPAL: REPOSIÇÃO NECESSÁRIA */}
      <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden no-print">
         <div className="p-8 bg-gradient-to-r from-blue-500/5 to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <AlertTriangle className="w-6 h-6 text-blue-500" />
               </div>
               <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Reposição Necessária</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Itens abaixo do mínimo. Prioridade baseada no prazo de entrega.</p>
               </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Ordenado por Prazo de Entrega</span>
               </div>
               <button 
                  onClick={() => setShowPrintPreview(true)}
                  disabled={selectedAlerts.size === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg transition-all disabled:opacity-30 active:scale-95"
               >
                  <Printer className="w-4 h-4" /> Imprimir Requisição ({selectedAlerts.size})
               </button>
            </div>
         </div>

         <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-left">
               <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <tr>
                     <th className="px-6 py-5 w-12">
                        <input 
                           type="checkbox" 
                           className="w-4 h-4 rounded border-slate-700 bg-slate-900"
                           checked={selectedAlerts.size === reposicaoNecessaria.length && reposicaoNecessaria.length > 0}
                           onChange={() => {
                              if(selectedAlerts.size === reposicaoNecessaria.length) setSelectedAlerts(new Set());
                              else setSelectedAlerts(new Set(reposicaoNecessaria.map(i => i.id)));
                           }}
                        />
                     </th>
                     <th className="px-6 py-5">ITEM / ESPECIFICAÇÃO</th>
                     <th className="px-6 py-5">PRAZO ENTREGA</th>
                     <th className="px-6 py-5 text-center">MÍNIMO</th>
                     <th className="px-6 py-5 text-center">ATUAL</th>
                     <th className="px-6 py-5">OBS. / PEDIDO</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                  {paginatedReposicao.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-800/30 transition-colors group ${selectedAlerts.has(item.id) ? 'bg-blue-500/5' : ''}`}>
                       <td className="px-6 py-5">
                          <input 
                             type="checkbox" 
                             className="w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer"
                             checked={selectedAlerts.has(item.id)}
                             onChange={() => toggleSelect(item.id)}
                          />
                       </td>
                       <td className="px-6 py-5">
                          <div className="flex flex-col">
                             <span className="font-black text-white font-mono text-xs mb-0.5">{item.codigo}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase leading-tight line-clamp-1">{item.desc}</span>
                          </div>
                       </td>
                       <td className="px-6 py-5">
                          {getLeadTimeBadge(item.leadTime)}
                       </td>
                       <td className="px-6 py-5 text-center font-bold text-slate-500">{item.min}</td>
                       <td className="px-6 py-5 text-center font-black text-rose-500">{item.atual}</td>
                       <td className="px-6 py-5 min-w-[200px]">
                          <div className="relative">
                             <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                             <input 
                                type="text"
                                placeholder="Anotar solicitação..."
                                value={observations[item.id] || ''}
                                onChange={(e) => handleObsChange(item.id, e.target.value)}
                                className="w-full pl-8 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 outline-none focus:border-blue-500/50 transition-all"
                             />
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* PAGINAÇÃO */}
         <div className="p-6 bg-slate-900/20 border-t border-slate-800 flex justify-between items-center no-print">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
               <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 disabled:opacity-20 transition-all"><ChevronLeft className="w-4 h-4 text-white" /></button>
               <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 disabled:opacity-20 transition-all"><ChevronRight className="w-4 h-4 text-white" /></button>
            </div>
         </div>
      </div>

      {/* SEÇÃO INFERIOR: EXCESSO E SEM MOVIMENTAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
         
         {/* POSSÍVEL EXCESSO */}
         <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-4 mb-2">
               <div className="p-2.5 bg-orange-500/10 rounded-xl">
                  <Archive className="w-5 h-5 text-orange-500" />
               </div>
               <h3 className="text-sm font-black text-white uppercase tracking-tight">Possível Excesso de Estoque</h3>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-8 ml-12">Muitos itens (acima de 50) e baixa saída (abaixo de 2).</p>
            
            <div className="space-y-4">
               {excessoSaldos.map(item => (
                 <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-800/50 group">
                    <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase">{item.descricao}</span>
                    <div className="text-right">
                       <span className="text-xs font-black text-orange-500">{item.quantidadeAtual}</span>
                       <span className="text-[9px] font-bold text-slate-500 uppercase ml-1.5">{item.unidade}</span>
                    </div>
                 </div>
               ))}
               {excessoSaldos.length === 0 && <p className="text-center py-10 text-[10px] font-black text-slate-600 uppercase tracking-widest">Nenhum excesso identificado</p>}
            </div>
         </div>

         {/* SEM MOVIMENTAÇÃO */}
         <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-4 mb-2">
               <div className="p-2.5 bg-slate-500/10 rounded-xl">
                  <History className="w-5 h-5 text-slate-400" />
               </div>
               <h3 className="text-sm font-black text-white uppercase tracking-tight">Itens Sem Movimentação</h3>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-8 ml-12">Sem entradas ou saídas recentes registrados.</p>
            
            <div className="space-y-4">
               {itensParados.map(item => (
                 <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-800/50 group">
                    <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase">{item.descricao}</span>
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-[8px] font-black text-slate-500 rounded uppercase">Inativo</span>
                 </div>
               ))}
               {itensParados.length === 0 && <p className="text-center py-10 text-[10px] font-black text-slate-600 uppercase tracking-widest">Todos os itens tiveram movimento</p>}
            </div>
         </div>
      </div>

      {/* OVERLAY DE IMPRESSÃO (REQUISIÇÃO) */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col items-center overflow-auto print-mode-wrapper animate-in fade-in duration-300">
           <div className="w-full sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shadow-2xl no-print preview-toolbar">
             <div className="flex items-center gap-2">
               <FileText className="w-5 h-5 text-blue-400" />
               <span className="font-black text-xs uppercase tracking-widest text-white">Requisição de Abastecimento Priorizada</span>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-[10px] uppercase text-white">Cancelar</button>
               <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase text-white shadow-lg">Confirmar Impressão</button>
             </div>
          </div>

          <div className="flex-1 w-full flex justify-center py-10 print:py-0 print:block print:bg-white">
             <div className="printable-document bg-white text-black p-12 w-[210mm] shadow-2xl min-h-[297mm] print:shadow-none print:p-0 print:w-full">
                <header className="mb-10 flex justify-between items-start border-b-[3px] border-black pb-6">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-black text-black leading-none uppercase">ALUMASA</h1>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] mt-1 text-black">Industrial • Gestão de Suprimentos</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <h2 className="text-xl font-black uppercase text-black">REQUISIÇÃO DE COMPRA / REPOSIÇÃO</h2>
                        <div className="text-[10px] font-bold mt-2 bg-gray-100 px-3 py-1 border border-black/10 rounded text-black">
                           EMISSÃO: {new Date().toLocaleString('pt-BR')}
                        </div>
                    </div>
                </header>

                <div className="mb-6 p-4 border border-black bg-gray-50 flex items-center gap-2">
                   <AlertCircle className="w-5 h-5" />
                   <p className="text-[10px] font-black uppercase italic">Nota: Itens listados por ordem de urgência logística (Tempo de Entrega).</p>
                </div>

                <table className="w-full border-collapse border border-black mb-12">
                   <thead>
                     <tr className="bg-gray-100">
                        <th className="border border-black px-4 py-3 text-left text-[11px] font-black uppercase text-black">CÓDIGO</th>
                        <th className="border border-black px-4 py-3 text-left text-[11px] font-black uppercase text-black">DESCRIÇÃO</th>
                        <th className="border border-black px-4 py-3 text-center text-[11px] font-black uppercase text-black">P. ENTREGA</th>
                        <th className="border border-black px-4 py-3 text-center text-[11px] font-black uppercase text-black">MIN/ATUAL</th>
                        <th className="border border-black px-4 py-3 text-left text-[11px] font-black uppercase text-black">OBSERVAÇÃO / PEDIDO</th>
                     </tr>
                   </thead>
                   <tbody>
                     {reposicaoNecessaria.filter(item => selectedAlerts.has(item.id)).map(item => (
                       <tr key={item.id} className="text-black">
                          <td className="border border-black px-4 py-3 font-black font-mono text-xs">{item.codigo}</td>
                          <td className="border border-black px-4 py-3 text-[10px] font-bold uppercase">{item.desc}</td>
                          <td className="border border-black px-4 py-3 text-center font-bold text-xs">{item.leadTime} dias</td>
                          <td className="border border-black px-4 py-3 text-center font-bold">{item.min} / {item.atual}</td>
                          <td className="border border-black px-4 py-3 text-[10px] font-bold italic">{observations[item.id] || '-'}</td>
                       </tr>
                     ))}
                   </tbody>
                </table>

                <footer className="mt-20 pt-16 flex justify-between gap-12 text-black">
                   <div className="flex-1 text-center border-t border-black pt-2"><span className="text-[9px] font-black uppercase">SOLICITANTE / PCP</span></div>
                   <div className="flex-1 text-center border-t border-black pt-2"><span className="text-[9px] font-black uppercase">SUPRIMENTOS / COMPRAS</span></div>
                </footer>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
