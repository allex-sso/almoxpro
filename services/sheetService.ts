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
  
  // Ajusta URL se for ID simples
  const finalUrl = url.startsWith('http') 
    ? url 
    : `https://docs.google.com/spreadsheets/d/${url}/export?format=csv`;

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
  const { index: headerIdx, headers } = findHeaderRow(rows, ['data', 'cód']);
  if (headerIdx === -1) return [];

  const getIdx = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));
  
  const idxData = getIdx(['data', 'registro']);
  const idxCodigo = getIdx(['cód', 'cod']);
  const idxQtd = getIdx(['quant', 'qtd']);
  const idxForn = getIdx(['forn', 'fabricante', 'origem']); // Importante para Entradas
  const idxObs = getIdx(['obs', 'descri']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    if (!row[idxCodigo]) return null;
    
    let codigo = row[idxCodigo].trim();
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`;

    const data = idxData !== -1 ? parseDate(row[idxData]) : null;
    if (!data) return null; // Sem data não serve para histórico

    return {
      id: `${type}-${i}`,
      tipo: type,
      data: data,
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
  // Note: Fornecedor removido da principal pelo usuário, mas mantemos lógica caso exista
  const idxForn = getIdx(['forn']); 
  const idxQtd = getIdx(['quant', 'qtd', 'atual', 'estoque']);
  const idxMin = getIdx(['mínim', 'minim', 'min']);
  const idxCat = getIdx(['categ', 'grupo']);
  const idxVal = getIdx(['unit', 'valor']);

  return rows.slice(headerIdx + 1).map((row, index): InventoryItem | null => {
    let codigo = (idxCodigo !== -1 ? row[idxCodigo] : row[0])?.trim();
    if (!codigo) return null;
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`;

    const qtd = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    const valUnit = idxVal !== -1 ? parseNumber(row[idxVal]) : 0;

    return {
      id: `item-${index}`,
      codigo,
      descricao: idxDesc !== -1 ? row[idxDesc] : '',
      equipamento: idxEquip !== -1 ? (row[idxEquip] || 'N/D') : 'N/D',
      localizacao: idxLoc !== -1 ? (row[idxLoc] || '') : '',
      fornecedor: idxForn !== -1 ? (row[idxForn] || '') : '', // Pode vir vazio agora
      quantidadeAtual: qtd,
      quantidadeMinima: idxMin !== -1 ? parseNumber(row[idxMin]) : 0,
      entradas: 0, // Será calculado via cruzamento com histórico
      saidas: 0,   // Será calculado via cruzamento com histórico
      categoria: idxCat !== -1 ? (row[idxCat] || 'Geral') : 'Geral',
      valorUnitario: valUnit,
      valorTotal: qtd * valUnit,
      dataAtualizacao: new Date().toISOString(),
    };
  }).filter((i): i is InventoryItem => i !== null);
};