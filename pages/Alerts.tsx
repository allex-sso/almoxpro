import React, { useState } from 'react';
import { AlertTriangle, Archive, TrendingDown, Printer, ChevronLeft, ChevronRight, Edit3, X, Check } from 'lucide-react';
import { InventoryItem } from '../types';

interface AlertsProps {
  data: InventoryItem[];
}

const Alerts: React.FC<AlertsProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const itemsPerPage = 10;

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

  // --- NOVA LÓGICA DE IMPRESSÃO VIA IFRAME (CORRIGIDA) ---
  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const rowsHTML = lowStockItems.map(item => {
        const note = orderNotes[item.id] || '';
        const diff = item.quantidadeMinima - item.quantidadeAtual;
        return `
        <tr>
            <td class="mono bold">${item.codigo}</td>
            <td>${item.descricao}</td>
            <td>${item.fornecedor || ''}</td>
            <td class="center bold red">${item.quantidadeAtual}</td>
            <td class="center">${item.quantidadeMinima}</td>
            <td class="center bold bg-gray">${Math.max(0, diff)}</td>
            <td>${note}</td>
        </tr>
        `;
    }).join('');

    const dateStr = new Date().toLocaleDateString('pt-BR');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Requisição de Compras</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: sans-serif; padding: 40px; -webkit-print-color-adjust: exact; }
            h1 { font-size: 24px; font-weight: bold; text-transform: uppercase; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #e5e7eb; border: 1px solid #9ca3af; padding: 8px; text-align: left; }
            td { border: 1px solid #9ca3af; padding: 6px; }
            .mono { font-family: monospace; font-size: 14px; }
            .bold { font-weight: bold; }
            .center { text-align: center; }
            .red { color: #b91c1c; }
            .bg-gray { background-color: #f3f4f6; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-between; padding: 0 50px; }
            .sig-line { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
           <div class="header">
              <div>
                 <h1>Requisição de Compras</h1>
                 <p style="color: #666; font-size: 12px;">Relatório automático de reposição</p>
              </div>
              <div style="text-align: right; font-size: 12px;">
                 <p>Data: ${dateStr}</p>
                 <p><strong>Almoxarifado Central</strong></p>
              </div>
           </div>

           <table>
              <thead>
                 <tr>
                    <th style="width: 60px;">Cód.</th>
                    <th>Descrição</th>
                    <th style="width: 150px;">Fornecedor</th>
                    <th style="width: 60px; text-align: center;">Atual</th>
                    <th style="width: 60px; text-align: center;">Mín</th>
                    <th style="width: 60px; text-align: center;">Repor</th>
                    <th>Observação / Pedido</th>
                 </tr>
              </thead>
              <tbody>
                ${rowsHTML}
              </tbody>
           </table>

           <div class="signatures">
              <div class="sig-line">Solicitante</div>
              <div class="sig-line">Gerência / Aprovação</div>
           </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus(); // FOCO é fundamental para impressão programática funcionar
        iframe.contentWindow.print();
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
           document.body.removeChild(iframe);
        }
      }, 2000);
    }, 500);
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
                      Itens abaixo da Quantidade Mínima definida na planilha.
                    </p>
                </div>
            </div>
            <button 
              onClick={() => setShowPrintPreview(true)}
              disabled={lowStockItems.length === 0}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Requisição
            </button>
          </div>
          
          <div className="bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-sm border border-red-100 dark:border-red-900/50">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-red-100/50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 uppercase text-xs">
                        <tr>
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
                              <tr key={item.id} className="hover:bg-red-50/50 dark:hover:bg-slate-800/50">
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
                                    <div className="relative">
                                      <Edit3 className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                                      <input 
                                        type="text" 
                                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded bg-white dark:bg-slate-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-red-500 outline-none"
                                        placeholder="Observação..."
                                        value={orderNotes[item.id] || ''}
                                        onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                      />
                                    </div>
                                  </td>
                              </tr>
                             );
                        })}
                         {lowStockItems.length === 0 && (
                            <tr><td colSpan={6} className="p-6 text-center text-gray-500">Nenhum item com "Quantidade Mínima" preenchida na planilha precisa de reposição.</td></tr>
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
               {/* SUBSTITUIÇÃO DE SIMBOLOS POR TEXTO PARA CORRIGIR ERRO DE BUILD */}
               <p className="text-xs text-gray-500 mb-4">Muitos itens (acima de 50) e baixa saída (abaixo de 2)</p>
               <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {overStockItems.slice(0, 10).map(item => (
                      <li key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-slate-800 rounded">
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
               <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {dormantItems.slice(0, 10).map(item => (
                      <li key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-slate-800 rounded">
                          <span className="dark:text-white truncate mr-2">{item.descricao}</span>
                          <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">Parado</span>
                      </li>
                  ))}
                  {dormantItems.length === 0 && <li className="text-sm text-gray-400">Tudo normal.</li>}
               </ul>
            </div>
        </div>
      </div>

      {/* --- PREVIEW OVERLAY --- */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
           <div className="sticky top-0 bg-gray-800 text-white p-4 flex justify-between items-center shadow-md z-50">
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
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold flex items-center animate-pulse"
               >
                 <Check className="w-4 h-4 mr-2" />
                 Confirmar Impressão
               </button>
             </div>
          </div>

          {/* Visualização HTML para Conferência */}
           <div className="p-8 max-w-[210mm] mx-auto bg-gray-50 min-h-screen shadow-inner">
             <div className="bg-white p-10 shadow-lg">
                <div className="border-b-2 border-black mb-6 pb-4 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold uppercase tracking-wide text-black">Requisição de Compras</h1>
                    <p className="text-sm text-gray-600 mt-1">Relatório automático de itens abaixo do estoque mínimo</p>
                  </div>
                  <div className="text-right text-black">
                    <p className="text-sm">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm font-bold">Almoxarifado Central</p>
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
                    {lowStockItems.map((item) => {
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