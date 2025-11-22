import { InventoryItem, Movement } from '../types';

// --- UTILITÁRIOS DE PARSE ---

const parseNumber = (value: string): number => {
  if (!value) return 0;
  let clean = value.toString().replace(/[R$\s]/g, '');
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const parseCSVLine = (text: string): string[] => {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  result.push(cell.trim());
  return result;
};

// Tenta converter data string (dd/mm/yyyy, excel serial, iso) para Date object
const parseDate = (value: string): Date | null => {
  if (!value) return null;
  
  // Excel Serial Number (aprox)
  if (!isNaN(Number(value)) && !value.includes('/')) {
    const serial = Number(value);
    // Ajuste básico para datas Excel (base 1900)
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
  }

  // Formato PT-BR (dd/mm/yyyy)
  if (value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3) {
      // Assume dia/mes/ano
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

// --- FETCH PRINCIPAL ---

const fetchCSV = async (url: string): Promise<string[][]> => {
  if (!url || url.length < 10) return [];
  
  // Adiciona timestamp para evitar cache do navegador/proxy
  const timestamp = new Date().getTime();
  let finalUrl = url.startsWith('http') 
    ? url 
    : `https://docs.google.com/spreadsheets/d/${url}/export?format=csv`;
  
  if (finalUrl.includes('?')) {
    finalUrl += `&t=${timestamp}`;
  } else {
    finalUrl += `?t=${timestamp}`;
  }

  try {
    const response = await fetch(finalUrl);
    if (!response.ok) return [];
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    return lines.map(parseCSVLine);
  } catch (error) {
    console.error("Erro ao buscar CSV:", url, error);
    return [];
  }
};

const findHeaderRow = (rows: string[][], keywords: string[]): { index: number, headers: string[] } => {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowLower = rows[i].map(c => c.toLowerCase().trim());
    if (keywords.every(k => rowLower.some(h => h.includes(k)))) {
      return { index: i, headers: rowLower };
    }
  }
  return { index: -1, headers: [] };
};

// --- CARREGAR MOVIMENTAÇÕES (ENTRADA / SAIDA) ---
export const fetchMovements = async (url: string, type: 'entrada' | 'saida'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];

  // Procura cabeçalho com Data e Código
  const { index: headerIdx, headers } = findHeaderRow(rows, ['cód']);
  // Se falhar com "data", tenta termos alternativos comuns
  if (headerIdx === -1) return [];

  const getIdx = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));
  
  const idxData = getIdx(['data', 'registro', 'dia', 'movimentação']);
  const idxCodigo = getIdx(['cód', 'cod', 'item', 'produto']);
  const idxQtd = getIdx(['quant', 'qtd', 'montante']);
  const idxForn = getIdx(['forn', 'fabricante', 'origem']); // Importante para Entradas
  const idxObs = getIdx(['obs', 'descri']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    if (!row[idxCodigo]) return null;
    
    let codigo = row[idxCodigo].trim();
    // Remove espaços extras que causam erro de "536" vs "536 "
    codigo = codigo.replace(/\s+/g, '');
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`;

    const data = idxData !== -1 ? parseDate(row[idxData]) : null;
    // Se não achou data válida, usa data atual como fallback
    const finalDate = data || new Date(); 

    return {
      id: `${type}-${i}`,
      tipo: type,
      data: finalDate,
      codigo: codigo,
      quantidade: idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0,
      fornecedor: idxForn !== -1 ? row[idxForn] : undefined,
      obs: idxObs !== -1 ? row[idxObs] : undefined
    };
  }).filter((m): m is Movement => m !== null);
};

// --- CARREGAR ESTOQUE (PRINCIPAL) ---
export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];

  // Header Hunting
  const { index: headerIdx, headers } = findHeaderRow(rows, ['cód']);
  if (headerIdx === -1) return []; // Não achou estrutura válida

  const getIdx = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));

  const idxCodigo = getIdx(['cód', 'cod']);
  const idxDesc = getIdx(['descri', 'nome']);
  const idxEquip = getIdx(['equip', 'máquina']);
  const idxLoc = getIdx(['local', 'prateleira', 'end']);
  const idxForn = getIdx(['forn']); 
  
  // --- LÓGICA DE QUANTIDADE AJUSTADA ---
  // 1. Prioridade absoluta para "Quantidade em Estoque" conforme solicitado
  let idxQtd = getIdx(['quantidade em estoque', 'estoque atual', 'saldo atual', 'total em estoque']);
  
  // 2. Fallback inteligente: se não achar o nome exato, procura por "quantidade",
  // mas EXCLUI colunas que tenham "entrada", "saida", "inicial" ou "minimo" no nome.
  if (idxQtd === -1) {
      idxQtd = headers.findIndex(h => {
          const t = h.toLowerCase();
          if (t.includes('min') || t.includes('mín') || t.includes('entrad') || t.includes('saíd') || t.includes('said') || t.includes('inicial')) return false;
          return t.includes('quant') || t.includes('qtd') || t.includes('estoque') || t.includes('saldo');
      });
  }
  // -------------------------------------

  const idxMin = getIdx(['mínim', 'minim', 'min']);
  const idxCat = getIdx(['categ', 'grupo']);
  const idxVal = getIdx(['unit', 'valor']);
  
  // Lendo Entradas e Saídas diretamente da planilha principal como fallback
  const idxEntradas = getIdx(['entradas', 'entrada', 'entrou', 'compra']);
  const idxSaidas = getIdx(['saídas', 'saidas', 'saída', 'saida', 'consumo', 'venda']);
  
  // Data de atualização ou última movimentação na planilha principal
  const idxData = getIdx(['data', 'última', 'ultima', 'movimentação', 'atualização']);

  return rows.slice(headerIdx + 1).map((row, index): InventoryItem | null => {
    let codigo = (idxCodigo !== -1 ? row[idxCodigo] : row[0])?.trim();
    if (!codigo) return null;
    // Remove espaços extras e normaliza zeros
    codigo = codigo.replace(/\s+/g, '');
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`;

    const qtd = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    const valUnit = idxVal !== -1 ? parseNumber(row[idxVal]) : 0;

    // Tenta ler data da planilha, se não existir, undefined
    const rawDate = idxData !== -1 ? parseDate(row[idxData]) : undefined;

    return {
      id: `item-${index}`,
      codigo,
      descricao: idxDesc !== -1 ? row[idxDesc] : '',
      equipamento: idxEquip !== -1 ? (row[idxEquip] || 'N/D') : 'N/D',
      localizacao: idxLoc !== -1 ? (row[idxLoc] || '') : '',
      fornecedor: idxForn !== -1 ? (row[idxForn] || '') : '', 
      quantidadeAtual: qtd,
      quantidadeMinima: idxMin !== -1 ? parseNumber(row[idxMin]) : 0,
      
      // Prioridade: O que está escrito na célula. Será sobrescrito pelo App.tsx se houver histórico calculado.
      entradas: idxEntradas !== -1 ? parseNumber(row[idxEntradas]) : 0,
      saidas: idxSaidas !== -1 ? parseNumber(row[idxSaidas]) : 0,
      
      categoria: idxCat !== -1 ? (row[idxCat] || 'Geral') : 'Geral',
      valorUnitario: valUnit,
      valorTotal: qtd * valUnit,
      dataAtualizacao: new Date().toISOString(),
      ultimaMovimentacao: rawDate
    };
  }).filter((i): i is InventoryItem => i !== null);
};