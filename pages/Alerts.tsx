
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Archive, TrendingDown, Printer, ChevronLeft, ChevronRight, Edit3, X, Check, Save } from 'lucide-react';
import { InventoryItem } from '../types';

interface AlertsProps {
  data: InventoryItem[];
}

const Alerts: React.FC<AlertsProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  // Inicializa notas buscando do LocalStorage ou vazio
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('almox_order_notes');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Estado de Seleção para Alertas
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const itemsPerPage = 10;

  // Efeito para salvar automaticamente sempre que as notas mudarem
  useEffect(() => {
    localStorage.setItem('almox_order_notes', JSON.stringify(orderNotes));
  }, [orderNotes]);

  const lowStockItems = data.filter(item => {
    if (!item.quantidadeMinima || item.quantidadeMinima <= 0) return false;
    return item.quantidadeAtual <= item.quantidadeMinima;
  });

  const totalPages = Math.ceil(lowStockItems.length / itemsPerPage);
  const paginatedItems = lowStockItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const overStockItems = data.filter(item => item.quantidadeAtual > 50 && item.saidas < 2);
  const dormantItems = data.filter(item => item.entradas === 0 && item.saidas === 0 && item.quantidadeAtual > 0);

  const handleNoteChange = (id: string, value: string) => {
    setOrderNotes(prev => ({ ...prev, [id]: value }));
  };

  // Handlers de Seleção
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedAlerts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedAlerts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === lowStockItems.length && lowStockItems.length > 0) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(lowStockItems.map(i => i.id)));
    }
  };

  const isAllSelected = lowStockItems.length > 0 && selectedAlerts.size === lowStockItems.length;

  // Itens a serem impressos (Apenas os selecionados, ou todos se nenhum selecionado - OPCIONAL: Aqui forçamos selecionar)
  // Lógica atual: O botão habilita se houver seleção. Se clicar, imprime os selecionados.
  const itemsToPrint = lowStockItems.filter(item => selectedAlerts.has(item.id));

  // --- IMPRESSÃO NATIVA ---
  const handlePrint = () => {
     // Pequeno delay para garantir que o navegador renderize o overlay antes de imprimir
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* --- SCREEN VIEW --- */}
      <div className="space-y-8">
        {/* Low Stock Alert Section */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg mr-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Reposição Necessária</h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Selecione os itens abaixo para gerar a requisição de compra.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 italic hidden md:block mr-2">
                    * As observações são salvas automaticamente
                </span>
                <button 
                onClick={() => setShowPrintPreview(true)}
                disabled={selectedAlerts.size === 0}
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Selecionados ({selectedAlerts.size})
                </button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-sm border border-red-100 dark:border-red-900/50">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-red-100/50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 w-4">
                                <input 
                                type="checkbox" 
                                checked={isAllSelected}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                />
                            </th>
                            <th className="px-6 py-3">Código</th>
                            <th className="px-6 py-3">Descrição</th>
                            <th className="px-6 py-3">Fornecedor</th>
                            <th className="px-6 py-3 text-right">Mínimo</th>
                            <th className="px-6 py-3 text-right">Atual</th>
                            <th className="px-6 py-3 w-1/4">Obs. / Pedido</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {paginatedItems.map(item => {
                             return (
                              <tr key={item.id} className={`transition-colors ${selectedAlerts.has(item.id) ? 'bg-red-50 dark:bg-red-900/30' : 'hover:bg-red-50/50 dark:hover:bg-slate-800/50'}`}>
                                  <td className="px-4 py-4">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedAlerts.has(item.id)}
                                        onChange={() => toggleSelection(item.id)}
                                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-6 py-4 font-medium dark:text-white">{item.codigo}</td>
                                  <td className="px-6 py-4 dark:text-gray-300">
                                    <div className="font-medium">{item.descricao}</div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                      {item.fornecedor || '-'}
                                  </td>
                                  <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{item.quantidadeMinima}</td>
                                  <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">{item.quantidadeAtual}</td>
                                  <td className="px-6 py-4">
                                    <div className="relative group">
                                      <Edit3 className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 group-hover:text-red-500 transition-colors" />
                                      <input 
                                        type="text" 
                                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded bg-white dark:bg-slate-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                        placeholder="Digite para salvar..."
                                        value={orderNotes[item.id] || ''}
                                        onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                      />
                                    </div>
                                  </td>
                              </tr>
                             );
                        })}
                         {lowStockItems.length === 0 && (
                            <tr><td colSpan={7} className="p-6 text-center text-gray-500">Nenhum item com "Quantidade Mínima" preenchida na planilha precisa de reposição.</td></tr>
                        )}
                    </tbody>
                </table>
              </div>

              {lowStockItems.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
                  <span className="text-sm text-gray-700 dark:text-gray-400">
                    Página <span className="font-semibold">{currentPage}</span> de <span className="font-semibold">{totalPages}</span>
                  </span>
                  <div className="inline-flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Other alerts (Overstock / Dormant) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex items-center mb-4 text-orange-600 dark:text-orange-400">
                  <Archive className="w-5 h-5 mr-2" />
                  <h3 className="font-semibold">Possível Excesso de Estoque</h3>
               </div>
               <p className="text-xs text-gray-500 mb-4">Muitos itens (acima de 50) e baixa saída (abaixo de 2)</p>
               <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                  {overStockItems.slice(0, 10).map(item => (
                      <li key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-slate-800 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                          <span className="dark:text-white truncate mr-2">{item.descricao}</span>
                          <span className="font-mono text-orange-600">{item.quantidadeAtual} {item.unidade || 'un.'}</span>
                      </li>
                  ))}
                   {overStockItems.length === 0 && <li className="text-sm text-gray-400">Tudo normal.</li>}
               </ul>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex items-center mb-4 text-slate-600 dark:text-slate-400">
                  <TrendingDown className="w-5 h-5 mr-2" />
                  <h3 className="font-semibold">Itens Sem Movimentação</h3>
               </div>
               <p className="text-xs text-gray-500 mb-4">Sem entradas ou saídas recentes</p>
               <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                  {dormantItems.slice(0, 10).map(item => (
                      <li key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-slate-800 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                          <span className="dark:text-white truncate mr-2">{item.descricao}</span>
                          <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">Parado</span>
                      </li>
                  ))}
                  {dormantItems.length === 0 && <li className="text-sm text-gray-400">Tudo normal.</li>}
               </ul>
            </div>
        </div>
      </div>

      {/* --- PREVIEW OVERLAY (Com classe .printable-area) --- */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto flex flex-col print-mode-wrapper">
           <div className="sticky top-0 bg-gray-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print">
             <div className="flex items-center">
               <Printer className="mr-2" />
               <span className="font-bold">Pré-visualização de Requisição</span>
             </div>
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowPrintPreview(false)}
                 className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded flex items-center"
               >
                 <X className="w-4 h-4 mr-2" />
                 Voltar
               </button>
               <button 
                 onClick={handlePrint}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold flex items-center"
               >
                 <Check className="w-4 h-4 mr-2" />
                 Confirmar Impressão
               </button>
             </div>
          </div>

          {/* ÁREA IMPRESSA: Adicionada a classe 'printable-area' */}
           <div className="printable-area p-8 max-w-[210mm] mx-auto bg-white min-h-screen">
             <div className="bg-white p-10 shadow-none">
                <div className="border-b-2 border-black mb-6 pb-4 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold uppercase tracking-wide text-black">Requisição de Compras</h1>
                    <p className="text-sm text-gray-600 mt-1">Relatório automático de itens abaixo do estoque mínimo</p>
                  </div>
                  <div className="text-right text-black">
                    <p className="text-sm">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm font-bold">Almoxarifado de Peças</p>
                  </div>
              </div>

              <table className="w-full text-sm border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-200 text-black">
                        <th className="border border-gray-400 px-3 py-2 text-left w-16">Cód.</th>
                        <th className="border border-gray-400 px-3 py-2 text-left">Descrição</th>
                        <th className="border border-gray-400 px-3 py-2 text-left w-32">Fornecedor</th>
                        <th className="border border-gray-400 px-3 py-2 text-center w-16">Atual</th>
                        <th className="border border-gray-400 px-3 py-2 text-center w-16">Mín</th>
                        <th className="border border-gray-400 px-3 py-2 text-center w-16">Repor</th>
                        <th className="border border-gray-400 px-3 py-2 text-left">Observação / Pedido</th>
                    </tr>
                  </thead>
                  <tbody className="text-black">
                    {itemsToPrint.map((item) => {
                        const min = item.quantidadeMinima;
                        const diff = min - item.quantidadeAtual;
                        const note = orderNotes[item.id] || '';
                        return (
                          <tr key={item.id}>
                              <td className="border border-gray-400 px-3 py-2 font-mono font-bold text-lg">{item.codigo}</td>
                              <td className="border border-gray-400 px-3 py-2">
                                <span className="font-bold block text-base">{item.descricao}</span>
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-xs font-medium">
                                  {item.fornecedor}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center font-bold text-red-700">{item.quantidadeAtual}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center">{min}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center font-bold bg-gray-50">{Math.max(0, diff)}</td>
                              <td className="border border-gray-400 px-3 py-2">{note}</td>
                          </tr>
                        );
                    })}
                  </tbody>
              </table>
              
              <div className="mt-20 flex justify-between px-10 text-black">
                  <div className="text-center">
                    <div className="w-64 border-t border-black h-px"></div>
                    <p className="text-sm mt-2">Solicitante</p>
                  </div>
                  <div className="text-center">
                    <div className="w-64 border-t border-black h-px"></div>
                    <p className="text-sm mt-2">Gerência / Aprovação</p>
                  </div>
              </div>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Alerts;
