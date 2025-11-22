import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Printer, Tag, X, Check } from 'lucide-react';
import { InventoryItem } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOMServer from 'react-dom/server'; // Necessário para renderizar o QR Code para string se usássemos SSR, mas aqui faremos manual ou via ref, simplificando com string template para o iframe

interface InventoryProps {
  data: InventoryItem[];
}

const Inventory: React.FC<InventoryProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [equipmentFilter, setEquipmentFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Print Preview State
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const itemsPerPage = 15;

  // Extract unique categories and equipment
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.categoria).filter(Boolean)))], [data]);
  const equipments = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.equipamento).filter(Boolean)))], [data]);

  // Filter Logic
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    return data.filter(item => {
      const check = (val: string | number | undefined) => 
        String(val || '').toLowerCase().includes(term);

      const matchesSearch = 
        !term || 
        check(item.codigo) ||
        check(item.descricao) ||
        check(item.equipamento) ||
        check(item.localizacao) ||
        check(item.fornecedor) ||
        check(item.categoria);
      
      const matchesCategory = categoryFilter === 'Todos' || item.categoria === categoryFilter;
      const matchesEquipment = equipmentFilter === 'Todos' || item.equipamento === equipmentFilter;

      return matchesSearch && matchesCategory && matchesEquipment;
    });
  }, [data, searchTerm, categoryFilter, equipmentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Selection Handlers
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredData.length && filteredData.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map(i => i.id)));
    }
  };

  const isAllSelected = filteredData.length > 0 && selectedItems.size === filteredData.length;

  const handleExportCSV = () => {
    const headers = ["Código", "Descrição", "Equipamento", "Localização", "Fornecedor", "Qtd Atual", "Categoria", "Valor Unit", "Valor Total"];
    const csvContent = [
      headers.join(";"),
      ...filteredData.map(item => [
        item.codigo,
        item.descricao,
        item.equipamento || "N/D",
        item.localizacao || "N/D",
        item.fornecedor || "N/D",
        item.quantidadeAtual,
        item.categoria,
        item.valorUnitario.toFixed(2).replace('.', ','),
        item.valorTotal.toFixed(2).replace('.', ',')
      ].join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "inventario_almoxarifado.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadZPL = () => {
    if (selectedItems.size === 0) return;
    let zplContent = "^XA\n";
    const selected = data.filter(item => selectedItems.has(item.id));
    selected.forEach(item => {
      zplContent += `^XA
^FO30,30^BQN,2,6^FDQA,${item.codigo}^FS
^FO220,40^A0N,130,130^FD${item.codigo}^FS
^FO220,160^A0N,30,30^FD${item.descricao.substring(0, 30)}^FS
^FO220,200^A0N,25,25^FDEquip: ${item.equipamento || 'N/D'}^FS
^FO220,230^A0N,25,25^FDLoc: ${item.localizacao || ''}^FS
^XZ\n`;
    });
    const blob = new Blob([zplContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "etiquetas_zpl.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedItemsList = data.filter(item => selectedItems.has(item.id));

  // --- NOVA LÓGICA DE IMPRESSÃO VIA IFRAME ---
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

    // Gera o HTML das etiquetas
    const labelsHTML = selectedItemsList.map(item => `
      <div class="label-container">
         <div class="code-section">
           <span class="code-text">${item.codigo}</span>
         </div>
         <div class="info-section">
            <p class="desc">${item.descricao}</p>
            <div class="meta">
               <p>EQ: <strong>${item.equipamento || 'N/D'}</strong></p>
               ${item.localizacao ? `<p>LOCAL: <strong>${item.localizacao}</strong></p>` : ''}
            </div>
         </div>
      </div>
    `).join('');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Imprimir Etiquetas</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { margin: 5mm; size: auto; }
            body { margin: 0; padding: 20px; font-family: sans-serif; -webkit-print-color-adjust: exact; }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .label-container {
              border: 2px solid #000;
              border-radius: 4px;
              padding: 8px;
              display: flex;
              align-items: center;
              gap: 10px;
              height: 140px; /* Altura fixa para A4 */
              overflow: hidden;
              page-break-inside: avoid;
            }
            .code-section {
              width: 35%;
              height: 100%;
              border-right: 2px solid #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #f9fafb;
            }
            .code-text {
              font-size: 3rem;
              font-weight: 900;
              letter-spacing: -2px;
            }
            .info-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
            }
            .desc {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .meta p {
              font-size: 10px;
              margin: 0;
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${labelsHTML}
          </div>
          <script>
            // Espera carregar e imprime
            setTimeout(() => {
              window.print();
              // Opcional: remover iframe após impressão
              // window.parent.document.body.removeChild(window.frameElement);
            }, 500);
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* --- SCREEN VIEW --- */}
      <div className="space-y-6">
        {/* Filters Bar */}
        <div className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-1 gap-4 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Buscar código, nome, local..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              className="hidden md:block px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white"
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
            >
              {equipments.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            {selectedItems.size > 0 && (
              <>
                <button 
                  onClick={handleDownloadZPL}
                  className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
                  title="Baixar arquivo para impressora térmica (Zebra/Argox)"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Baixar ZPL
                </button>
                <button 
                  onClick={() => setShowPrintPreview(true)}
                  className="flex items-center px-4 py-2 bg-primary hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir ({selectedItems.size})
                </button>
              </>
            )}
            <button 
              onClick={handleExportCSV}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 w-4">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </th>
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Equipamento</th>
                  <th className="px-6 py-3">Localização</th>
                  <th className="px-6 py-3 text-right">Qtd</th>
                  <th className="px-6 py-3 text-right">Valor Unit.</th>
                  <th className="px-6 py-3 text-center">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-dark-card'}`}>
                    <td className="px-4 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.codigo}</td>
                    <td className="px-6 py-4">{item.descricao}</td>
                    <td className="px-6 py-4">
                      {item.equipamento ? (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                          {item.equipamento}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/D</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                      {item.localizacao || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">{item.quantidadeAtual}</td>
                    <td className="px-6 py-4 text-right">R$ {item.valorUnitario.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                        {item.categoria}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
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
        </div>
      </div>

      {/* --- PREVIEW OVERLAY (Tela Branca para Conferência) --- */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          {/* Header de Controle */}
          <div className="sticky top-0 bg-gray-800 text-white p-4 flex justify-between items-center shadow-md z-50">
             <div className="flex items-center">
               <Printer className="mr-2" />
               <span className="font-bold">Pré-visualização de Impressão</span>
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

          {/* Visualização das Etiquetas (Apenas para o usuário ver o que vai ser impresso) */}
          <div className="p-8 max-w-[210mm] mx-auto bg-gray-100 my-8 shadow-lg min-h-screen">
               <p className="text-center text-gray-500 mb-4">Layout A4 - Exemplo Visual</p>
               <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                {selectedItemsList.map((item) => (
                  <div key={item.id} className="border-2 border-gray-800 p-2 rounded flex flex-row items-center gap-2 bg-white h-[38mm] overflow-hidden relative">
                     <div className="flex items-center justify-center w-[35%] border-r-2 border-gray-300 h-full bg-gray-50">
                       <span className="text-5xl font-black text-black tracking-tighter leading-none">
                         {item.codigo}
                       </span>
                     </div>
                     <div className="flex flex-col flex-1 justify-between h-full py-1">
                        <div>
                           <p className="text-[11px] font-bold text-black leading-tight line-clamp-3 uppercase">
                             {item.descricao}
                           </p>
                           <div className="mt-1">
                             <p className="text-[9px] text-gray-600 truncate">
                               EQ: <span className="font-semibold">{item.equipamento || 'N/D'}</span>
                             </p>
                             {item.localizacao && (
                               <p className="text-[9px] text-black truncate font-bold">
                                 LOCAL: {item.localizacao}
                               </p>
                             )}
                           </div>
                        </div>
                        <div className="absolute bottom-1 right-1 opacity-50">
                           <QRCodeSVG value={item.codigo} size={32} />
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;