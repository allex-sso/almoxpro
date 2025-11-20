import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Download, ChevronLeft, ChevronRight, Printer, Tag } from 'lucide-react';
import { InventoryItem } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [printContainer, setPrintContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPrintContainer(document.getElementById('print-root') || document.body);
  }, []);
  
  const itemsPerPage = 15;

  // Extract unique categories and equipment
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.categoria).filter(Boolean)))], [data]);
  const equipments = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.equipamento).filter(Boolean)))], [data]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.fornecedor && item.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.localizacao && item.localizacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.equipamento.toLowerCase().includes(searchTerm.toLowerCase());
      
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
      setSelectedItems(new Set()); // Deselect All
    } else {
      setSelectedItems(new Set(filteredData.map(i => i.id))); // Select All Visible
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

  const handlePrintLabels = () => {
    // Delay aumentado para 500ms para garantir que o DOM foi atualizado
    setTimeout(() => {
      window.print();
    }, 500);
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
                  onClick={handlePrintLabels}
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
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Nenhum item encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Mostrando <span className="font-semibold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-semibold text-gray-900 dark:text-white">{filteredData.length}</span>
            </span>
            <div className="inline-flex mt-2 xs:mt-0">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-primary rounded-l hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-primary border-l border-blue-700 rounded-r hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- PRINT PORTAL --- */}
      {printContainer && createPortal(
        <div className="print-portal">
          {selectedItemsList.length > 0 && (
            <div className="p-8">
               {/* Grid configurado para folha A4, com margens e gap adequados */}
               <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                {selectedItemsList.map((item) => (
                  <div key={item.id} className="avoid-break border-2 border-gray-800 p-2 rounded flex flex-row items-center gap-2 bg-white h-[38mm] overflow-hidden relative">
                     
                     {/* CÓDIGO GIGANTE */}
                     <div className="flex items-center justify-center w-[35%] border-r-2 border-gray-300 h-full bg-gray-50">
                       <span className="text-5xl font-black text-black tracking-tighter leading-none">
                         {item.codigo}
                       </span>
                     </div>
  
                     {/* INFORMAÇÕES */}
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
                        
                        <div className="absolute bottom-1 right-1 opacity-80">
                           <QRCodeCanvas 
                              value={`ID:${item.codigo}|LOC:${item.localizacao}`} 
                              size={42} 
                              level={"L"}
                           />
                        </div>
                     </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center text-xs text-gray-400">
                Impresso em {new Date().toLocaleString()} - Almoxarifado Pro
              </div>
            </div>
          )}
        </div>,
        printContainer
      )}

    </div>
  );
};

export default Inventory;