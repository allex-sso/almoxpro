
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Printer, Tag, Info, AlertCircle, CheckCircle2, PackageSearch, X, Check, Maximize2, QrCode, Barcode as BarcodeIcon } from 'lucide-react';
import { InventoryItem } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

interface InventoryProps {
  data: InventoryItem[];
  isLoading?: boolean;
  isWarehouse?: boolean;
}

const LABEL_SIZES = [
  { id: '100x50', label: 'Grande (100x50mm)', width: '100mm', height: '50mm', qrSize: 84, barHeight: 40 },
  { id: '80x40', label: 'Padrão (80x40mm)', width: '80mm', height: '40mm', qrSize: 64, barHeight: 30 },
  { id: '60x30', label: 'Médio (60x30mm)', width: '60mm', height: '30mm', qrSize: 48, barHeight: 25 },
  { id: '40x25', label: 'Pequeno (40x25mm)', width: '40mm', height: '25mm', qrSize: 30, barHeight: 18 },
];

const BarcodeComponent: React.FC<{ value: string, format: string, height: number, width: number }> = ({ value, format, height, width }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        // Validação básica para EAN13 (deve ser numérico)
        let finalValue = value;
        if (format === 'EAN13') {
           finalValue = value.replace(/\D/g, '').padEnd(13, '0').slice(0, 13);
        }

        JsBarcode(svgRef.current, finalValue, {
          format: format,
          width: width === 40 ? 1 : 1.5,
          height: height,
          displayValue: false,
          margin: 0,
          background: 'transparent'
        });
      } catch (e) {
        console.error("Erro ao gerar código de barras:", e);
      }
    }
  }, [value, format, height, width]);

  return <svg ref={svgRef} className="max-w-full"></svg>;
};

const Inventory: React.FC<InventoryProps> = ({ data, isLoading = false, isWarehouse = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedLabelSize, setSelectedLabelSize] = useState(LABEL_SIZES[1]); // Padrão 80x40
  const [printCodeType, setPrintCodeType] = useState<'qrcode' | 'barcode'>('qrcode');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  
  const itemsPerPage = 12;

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(data.map(i => i.categoria).filter(Boolean)))], [data]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const baseData = data.filter(item => categoryFilter === 'Todos' || item.categoria === categoryFilter);
    if (!term) return baseData;
    const exactCodeMatches = baseData.filter(item => (item.codigo || '').toLowerCase() === term);
    if (exactCodeMatches.length > 0) return exactCodeMatches;
    return baseData.filter(item => {
      return (item.codigo || '').toLowerCase().includes(term) ||
        (item.descricao || '').toLowerCase().includes(term) ||
        (item.setor || '').toLowerCase().includes(term) ||
        (item.localizacao || '').toLowerCase().includes(term) ||
        (item.situacao || '').toLowerCase().includes(term);
    });
  }, [data, searchTerm, categoryFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const allFilteredSelected = useMemo(() => {
    return filteredData.length > 0 && filteredData.every(item => selectedItems.has(item.id));
  }, [filteredData, selectedItems]);

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedItems(new Set());
    else setSelectedItems(new Set(filteredData.map(i => i.id)));
  };

  const handlePrint = () => window.print();

  const getStatusBadge = (status: string) => {
    const s = (status || 'OK').toUpperCase();
    if (s.includes('OK')) return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> OK</span>;
    if (s.includes('ESGOTADO')) return <span className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> ESGOTADO</span>;
    if (s.includes('PEDIDO') || s.includes('ATENCAO')) return <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><PackageSearch className="w-3 h-3" /> REALIZAR PEDIDO</span>;
    return <span className="px-3 py-1 bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">{status}</span>;
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Sincronizando Inventário...</div>;

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Inventário de Itens</h1>
          <p className="text-sm font-medium text-slate-400">
            {isWarehouse ? 'Controle de saldo, picking e pulmão logístico.' : 'Gerencie todos os itens do estoque e gere etiquetas.'}
          </p>
        </div>
      </div>

      <div className="bg-[#1e293b] p-4 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center no-print">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text"
            placeholder="Buscar código, descrição, setor..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[#0f172a] border border-slate-700 text-sm font-bold outline-none text-white focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-6 py-3 rounded-2xl bg-[#0f172a] border border-slate-700 text-xs font-black outline-none cursor-pointer w-full md:w-auto text-white uppercase tracking-widest"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
        </select>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowPrintPreview(true)}
            disabled={selectedItems.size === 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
             <Tag className="w-4 h-4" /> Etiquetas ({selectedItems.size})
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-[#10b981] hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-lg active:scale-95">
             <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-[2rem] shadow-2xl border border-slate-800 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase text-slate-500 font-black tracking-widest bg-slate-800/30">
              <tr>
                <th className="px-6 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 cursor-pointer" 
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-5">CÓDIGO</th>
                <th className="px-6 py-5">DESCRIÇÃO</th>
                {isWarehouse ? (
                  <>
                    <th className="px-6 py-5">ENDEREÇO</th>
                    <th className="px-6 py-5 text-center">ESTOQUE</th>
                    <th className="px-6 py-5 text-center">PICKING</th>
                    <th className="px-6 py-5 text-center">SALDO TOTAL</th>
                    <th className="px-6 py-5 text-center">SITUAÇÃO</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-5">EQUIPAMENTO</th>
                    <th className="px-6 py-5">LOCALIZAÇÃO</th>
                    <th className="px-6 py-5 text-center">QTD ESTOQUE</th>
                    <th className="px-6 py-5 text-center">MEDIDA</th>
                    <th className="px-6 py-5 text-right">VALOR UNIT.</th>
                    <th className="px-6 py-5 text-center">CATEGORIA</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginatedData.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-800/40 transition-colors group cursor-pointer ${selectedItems.has(item.id) ? 'bg-blue-500/5' : ''}`}
                  onClick={() => toggleSelectItem(item.id)}
                >
                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 cursor-pointer" 
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                    />
                  </td>
                  <td className="px-6 py-5 font-black text-white font-mono">{item.codigo}</td>
                  <td className="px-6 py-5 font-bold text-slate-300 uppercase text-[11px] leading-tight max-w-xs">{item.descricao}</td>
                  
                  {isWarehouse ? (
                    <>
                      <td className="px-6 py-5">
                         <span className="text-slate-400 font-bold text-[10px] uppercase leading-tight block max-w-[200px]">
                            {item.localizacao || '-'}
                         </span>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-400">{item.quantidadeEstoque.toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-5 text-center font-bold text-blue-400">{item.quantidadePicking.toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-5 text-center font-black text-white">{item.quantidadeAtual.toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-5 text-center flex justify-center" onClick={(e) => e.stopPropagation()}>
                        {getStatusBadge(item.situacao || 'OK')}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-5 text-slate-500 text-[10px] font-bold italic">{item.equipamento || 'N/D'}</td>
                      <td className="px-6 py-5 text-slate-400 font-bold text-[11px] uppercase">{item.localizacao || 'Rua 1 Lado A'}</td>
                      <td className="px-6 py-5 text-center font-black text-white">{item.quantidadeAtual}</td>
                      <td className="px-6 py-5 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest">{item.unidade}</td>
                      <td className="px-6 py-5 text-right font-bold text-slate-400">R$ {item.valorUnitario?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-3 py-1 bg-slate-800/80 rounded-full text-[9px] font-black uppercase border border-slate-700 text-slate-400 tracking-tighter">
                          {item.categoria}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-slate-800 bg-slate-800/20">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Página {currentPage} de {totalPages} • Mostrando {paginatedData.length} de {filteredData.length} itens</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-700 hover:bg-slate-800 disabled:opacity-30 transition-all shadow-lg"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-700 hover:bg-slate-800 disabled:opacity-30 transition-all shadow-lg"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300">
           <div className="sticky top-0 bg-slate-900 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl z-50 no-print border-b border-slate-800">
             <div className="flex items-center gap-4">
               <div className="p-2 bg-blue-600/20 rounded-xl"><Printer className="w-5 h-5 text-blue-400" /></div>
               <div>
                  <span className="font-black text-xs uppercase tracking-widest block">Configuração de Impressão</span>
                  <p className="text-[9px] font-bold text-slate-500 uppercase italic">Selecione o tamanho adequado para o seu rolo de etiquetas</p>
               </div>
             </div>

             <div className="flex flex-wrap items-center gap-4">
                <div className="bg-slate-800 p-1.5 rounded-xl flex items-center gap-3 border border-slate-700">
                   <div className="flex items-center gap-2 px-3 border-r border-slate-700">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tamanho:</span>
                   </div>
                   <select 
                      value={selectedLabelSize.id} 
                      onChange={(e) => setSelectedLabelSize(LABEL_SIZES.find(s => s.id === e.target.value) || LABEL_SIZES[1])}
                      className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer pr-4"
                   >
                      {LABEL_SIZES.map(size => <option key={size.id} value={size.id} className="bg-slate-900">{size.label}</option>)}
                   </select>
                </div>

                <div className="bg-slate-800 p-1.5 rounded-xl flex items-center gap-3 border border-slate-700">
                   <div className="flex items-center gap-2 px-3 border-r border-slate-700">
                      <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo Código:</span>
                   </div>
                   <select 
                      value={printCodeType} 
                      onChange={(e) => setPrintCodeType(e.target.value as any)}
                      className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer pr-4"
                   >
                      <option value="qrcode" className="bg-slate-900">QR CODE</option>
                      <option value="barcode" className="bg-slate-900">CÓD. BARRAS</option>
                   </select>
                   
                   {printCodeType === 'barcode' && (
                     <div className="flex items-center gap-3 border-l border-slate-700 pl-3">
                        <select 
                            value={barcodeFormat} 
                            onChange={(e) => setBarcodeFormat(e.target.value)}
                            className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer pr-4"
                        >
                            <option value="CODE128" className="bg-slate-900">CODE128</option>
                            <option value="CODE39" className="bg-slate-900">CODE39</option>
                            <option value="EAN13" className="bg-slate-900">EAN-13</option>
                        </select>
                     </div>
                   )}
                </div>

               <div className="flex gap-2">
                 <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all border border-slate-700"><X className="w-4 h-4 mr-2" /> Voltar</button>
                 <button onClick={handlePrint} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center shadow-lg active:scale-95 transition-all"><Check className="w-4 h-4 mr-2" /> Imprimir</button>
               </div>
             </div>
          </div>

          <div className="printable-area flex flex-wrap gap-2 bg-white p-6 justify-start flex-1">
            {data.filter(i => selectedItems.has(i.id)).map(item => {
              const isMini = selectedLabelSize.id === '40x25';
              const isMedium = selectedLabelSize.id === '60x30';
              return (
                <div 
                  key={item.id} 
                  style={{ width: selectedLabelSize.width, height: selectedLabelSize.height }}
                  className={`border-2 border-black flex flex-col items-center justify-between bg-white no-break overflow-hidden ${isMini ? 'p-1' : 'p-3'}`}
                >
                   <div className={`w-full text-center border-b border-black/20 shrink-0 ${isMini ? 'pb-0.5' : 'pb-1'}`}>
                      <span className={`font-black text-black uppercase tracking-widest ${isMini ? 'text-[7px]' : 'text-[10px]'}`}>ALUMASA INDUSTRIAL</span>
                   </div>
                   
                   <div className={`flex items-center w-full flex-1 min-h-0 ${isMini ? 'gap-1.5 py-1' : (printCodeType === 'barcode' ? 'gap-2 py-1' : 'gap-4 py-2')}`}>
                      {printCodeType === 'qrcode' ? (
                        <div className="shrink-0">
                          <QRCodeSVG value={item.codigo} size={selectedLabelSize.qrSize} level="M" />
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center overflow-hidden h-full">
                          <BarcodeComponent 
                            value={item.codigo} 
                            format={barcodeFormat} 
                            height={selectedLabelSize.barHeight} 
                            width={parseInt(selectedLabelSize.width)} 
                          />
                        </div>
                      )}

                      {(printCodeType === 'qrcode' || (isMini || isMedium)) && (
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className={`font-black text-black leading-none font-mono ${isMini ? 'text-[9px] mb-0.5' : (printCodeType === 'barcode' ? 'text-sm mb-1' : 'text-xl mb-1')}`}>{item.codigo}</span>
                            <span className={`font-bold text-black uppercase leading-tight line-clamp-2 ${isMini ? 'text-[6px]' : 'text-[9px]'}`}>{item.descricao}</span>
                        </div>
                      )}
                   </div>

                   {/* Se for código de barras e não for mini, mostramos a descrição abaixo para aproveitar largura */}
                   {printCodeType === 'barcode' && !isMini && !isMedium && (
                     <div className="w-full text-center mb-1">
                        <span className="font-bold text-black uppercase text-[9px] leading-tight line-clamp-1">{item.descricao}</span>
                        <span className="font-black text-black block text-[10px] font-mono mt-0.5 tracking-widest">{item.codigo}</span>
                     </div>
                   )}

                   <div className={`w-full flex justify-between items-end font-black uppercase text-black border-t border-black/20 shrink-0 ${isMini ? 'text-[6px] pt-0.5' : 'text-[8px] pt-1'}`}>
                      <span>{item.setor || 'ALMOXARIFADO'}</span>
                      <span>{item.unidade}</span>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
