
import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Printer, Tag, X, Check, PackageX, Loader2 } from 'lucide-react';
import { InventoryItem } from '../types';
import { QRCodeSVG } from 'qrcode.react';

interface InventoryProps {
  data: InventoryItem[];
  isLoading?: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ data, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [equipmentFilter, setEquipmentFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // States de Feedback
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isGeneratingZPL, setIsGeneratingZPL] = useState(false);
  
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

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    // Simula delay para feedback visual claro (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const headers = ["Código", "Descrição", "Equipamento", "Localização", "Fornecedor", "Quantidade em Estoque", "Medida", "Categoria", "Valor Unit", "Valor Total"];
    const csvContent = [
      headers.join(";"),
      ...filteredData.map(item => [
        item.codigo,
        item.descricao,
        item.equipamento || "N/D",
        item.localizacao || "N/D",
        item.fornecedor || "N/D",
        item.quantidadeAtual,
        item.unidade || "un.",
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
    setIsExportingCSV(false);
  };

  const handleDownloadZPL = async () => {
    if (selectedItems.size === 0) return;
    setIsGeneratingZPL(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let zplContent = "";
    const selected = data.filter(item => selectedItems.has(item.id));
    
    // ZPL CONFIGURADO PARA ETIQUETAS QUADRADAS 50mm x 50mm (Aprox 400x400 dots)
    // LAYOUT VERTICAL: CÓDIGO GRANDE NO TOPO, QR PEQUENO NO MEIO, DESCRIÇÃO EMBAIXO
    selected.forEach(item => {
      const cod = normalize(item.codigo);
      const desc = normalize(item.descricao).substring(0, 40);
      const equip = normalize(item.equipamento).substring(0, 25);

      zplContent += `
^XA
^PW400
^LL400
^FO10,10^GB380,380,2^FS

^FO0,20^A0N,110,100^FB400,1,0,C,0^FD${cod}^FS

^FO140,130^BQN,2,4^FDQA,${cod}^FS

^FO10,270^A0N,40,40^FB380,2,0,C,0^FD${desc}^FS
^FO10,360^A0N,30,30^FB380,1,0,C,0^FD${equip}^FS
^XZ`;
    });

    const blob = new Blob([zplContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "etiquetas_50x50_zpl.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsGeneratingZPL(false);
  };

  const selectedItemsList = data.filter(item => selectedItems.has(item.id));

  // --- IMPRESSÃO VIA CSS NATIVO ---
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // --- SKELETON LOADING ---
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
         <div className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex gap-4">
            <div className="h-10 flex-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
         </div>
         <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-4">
            {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="flex gap-4">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-8 flex-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
            ))}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* --- SCREEN VIEW --- */}
      <div className="space-y-6">
        {/* Filters Bar */}
        <div className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-20">
          <div className="flex flex-1 gap-4 w-full md:w-auto flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Buscar código, nome, local..."
                className="w-full pl-10 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white transition-shadow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="w-4 h-4" />
                </button>
              )}
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
                  disabled={isGeneratingZPL}
                  className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  title="Baixar arquivo para impressora térmica (Zebra/Argox)"
                >
                  {isGeneratingZPL ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Tag className="w-4 h-4 mr-2" />}
                  {isGeneratingZPL ? 'Gerando...' : 'ZPL (50x50mm)'}
                </button>
                <button 
                  onClick={() => setShowPrintPreview(true)}
                  className="flex items-center px-4 py-2 bg-primary hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir ({selectedItems.size})
                </button>
              </>
            )}
            <button 
              onClick={handleExportCSV}
              disabled={isExportingCSV}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExportingCSV ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {isExportingCSV ? 'Exportando...' : 'CSV'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {filteredData.length > 0 ? (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 w-4">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Equipamento</th>
                  <th className="px-6 py-3">Localização</th>
                  <th className="px-6 py-3 text-right">Quantidade em Estoque</th>
                  <th className="px-6 py-3 text-center">Medida</th>
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
                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap font-mono">{item.codigo}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={item.descricao}>{item.descricao}</td>
                    <td className="px-6 py-4">
                      {item.equipamento ? (
                        <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.equipamento}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">N/D</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300 text-xs">
                      {item.localizacao || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-white">{item.quantidadeAtual}</td>
                    <td className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 text-xs uppercase">
                        {item.unidade || 'un.'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">R$ {item.valorUnitario.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        {item.categoria}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                <PackageX className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium mb-1">Nenhum item encontrado</h3>
                <p className="text-sm">Tente ajustar os filtros ou a busca.</p>
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-4 text-primary hover:underline text-sm"
                    >
                        Limpar busca
                    </button>
                )}
            </div>
          )}

          {/* Pagination */}
          {filteredData.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
            </span>
            <div className="inline-flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* --- PREVIEW OVERLAY --- */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto flex flex-col print-mode-wrapper">
          {/* Header de Controle */}
          <div className="sticky top-0 bg-gray-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print">
             <div className="flex items-center">
               <Printer className="mr-2" />
               <span className="font-bold">Pré-visualização: Impressão Térmica (Rolo 50x50mm)</span>
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

          {/* ÁREA IMPRESSA - ETIQUETAS EM ROLO (QUADRADA 50x50mm) */}
          {/* Removido p-8 e gap-8 para permitir fluxo contínuo. Alinhamento centralizado. */}
          <div className="printable-area bg-gray-200 min-h-screen flex flex-col items-center">
               {selectedItemsList.map((item) => (
                  // ETIQUETA INDIVIDUAL (50mm x 50mm)
                  // Medida fixa em pixels para tela: 189px aprox
                  // Layout ajustado para textos maiores e QR menor
                  // Uso de flex-shrink-0 para evitar esmagamento pelo flexbox do container
                  <div 
                    key={item.id} 
                    className="bg-white border border-gray-300 flex flex-col items-center justify-between py-2 px-1 break-after-page page-break-after-always overflow-hidden flex-shrink-0 box-border"
                    style={{ width: '189px', height: '189px', minWidth: '189px', minHeight: '189px' }}
                  >
                     
                     {/* TOPO: CÓDIGO GIGANTE */}
                     <div className="w-full text-center mt-0">
                        <span className="text-6xl font-black text-black tracking-tighter leading-none block">
                          {item.codigo}
                        </span>
                     </div>
                     
                     {/* MEIO: QR CODE (REDUZIDO PARA 42px) */}
                     <div className="flex-1 flex items-center justify-center py-1">
                       <QRCodeSVG value={item.codigo} size={42} />
                     </div>
                     
                     {/* BASE: DESCRIÇÃO (AUMENTADA e NEGRITO) */}
                     <div className="w-full text-center pb-1 px-1">
                        <p className="text-xs font-bold text-black uppercase leading-tight line-clamp-2">
                          {item.descricao}
                        </p>
                        <p className="text-[10px] font-bold text-gray-700 uppercase leading-none mt-1">
                          {item.equipamento}
                        </p>
                     </div>
                  </div>
               ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
