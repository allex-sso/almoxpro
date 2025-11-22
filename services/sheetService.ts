import { InventoryItem, Movement } from '../types';

// --- UTILITÁRIOS DE PARSE ---

// Função de normalização para remover acentos e caracteres especiais
const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const parseNumber = (value: string): number => {
  if (!value) return 0;
  let str = value.toString().trim();
  
  // Remove símbolos de moeda e espaços
  str = str.replace(/R\$\s?/gi, '').trim();
  
  // Verifica formato brasileiro (1.000,00)
  // Se tem vírgula no final (decimal) e pontos no meio (milhar) ou apenas vírgula
  if (str.includes(',') && !str.includes('.')) {
     // Ex: 199,79 -> 199.79
     str = str.replace(',', '.');
  } else if (str.includes('.') && str.includes(',')) {
     // Ex: 1.000,00
     if (str.indexOf('.') < str.indexOf(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
     }
  }
  
  // Limpeza final para garantir que sobraram apenas números e ponto
  str = str.replace(/[^0-9.-]/g, '');

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// Converte unidades extensas para siglas
const formatUnit = (raw: string): string => {
  const val = normalizeStr(raw);
  
  if (!val) return 'uni'; // Padrão
  
  if (val.startsWith('unid') || val === 'und' || val === 'un') return 'uni';
  if (val.startsWith('metr') || val === 'm' || val === 'mts') return 'mt';
  if (val.startsWith('pec') || val.startsWith('pc') || val === 'pç') return 'pç';
  if (val.startsWith('caix') || val === 'cx') return 'cx';
  if (val.startsWith('kilo') || val === 'kg') return 'kg';
  if (val.startsWith('litr') || val === 'l' || val === 'lt') return 'lt';
  if (val.startsWith('paco') || val === 'pct') return 'pct';
  if (val.startsWith('rolo') || val === 'rl') return 'rl';
  if (val.startsWith('par') || val === 'pr') return 'pr';
  if (val.startsWith('jogo') || val === 'jg') return 'jg';
  if (val.startsWith('lata') || val === 'lat') return 'lt';
  if (val.startsWith('gal') || val === 'gl') return 'gl';

  return raw.substring(0, 3).toLowerCase(); // Fallback: retorna as 3 primeiras letras
};

// Detecta se o CSV usa vírgula ou ponto e vírgula analisando várias linhas
const detectDelimiter = (text: string): string => {
  const lines = text.split('\n').slice(0, 10); // Analisa até 10 linhas
  let commaCount = 0;
  let semicolonCount = 0;

  lines.forEach(line => {
      commaCount += (line.match(/,/g) || []).length;
      semicolonCount += (line.match(/;/g) || []).length;
  });

  return semicolonCount > commaCount ? ';' : ',';
};

const parseCSVLine = (text: string, delimiter: string): string[] => {
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
    } else if (char === delimiter && !inQuotes) {
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
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
  }

  // Formato PT-BR (dd/mm/yyyy)
  if (value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3) {
      // Mês em JS começa em 0
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

// --- FETCH PRINCIPAL ---

const fetchCSV = async (url: string): Promise<string[][]> => {
  // LIMPEZA AGRESSIVA DA URL: Remove espaços, quebras de linha e caracteres invisíveis
  let targetUrl = url ? url.replace(/[\n\r\s]+/g, '').trim() : '';
  
  if (!targetUrl || targetUrl.length < 5) return [];
  
  // Se for apenas o ID, constrói a URL
  if (!targetUrl.startsWith('http')) {
    targetUrl = `https://docs.google.com/spreadsheets/d/${targetUrl}/export?format=csv`;
  }
  
  // Cache busting para evitar dados antigos
  const timestamp = Date.now();
  const separator = targetUrl.includes('?') ? '&' : '?';
  const finalUrl = `${targetUrl}${separator}t=${timestamp}`;

  try {
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.warn(`Falha ao buscar CSV [${response.status}]: ${targetUrl}`);
      return [];
    }
    
    const text = await response.text();
    
    // Verifica se o Google retornou uma página de Login (HTML) em vez de CSV
    if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('<html')) {
      console.error("Erro: O link retornou HTML em vez de CSV. Verifique as permissões de compartilhamento (Publicar na Web).");
      return [];
    }
    
    const delimiter = detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    
    return lines.map(line => parseCSVLine(line, delimiter));
  } catch (error) {
    console.error("Erro de rede ao buscar CSV:", error);
    return [];
  }
};

const findHeaderRow = (rows: string[][], keywords: string[]): { index: number, headers: string[] } => {
  // Analisa até 20 linhas procurando o cabeçalho
  for (let i = 0; i < Math.min(rows.length, 20); i++) { 
    const rowNormalized = rows[i].map(c => normalizeStr(c));
    // Verifica se TODOS os keywords estão presentes na linha
    if (keywords.every(k => rowNormalized.some(h => h.includes(normalizeStr(k))))) {
      return { index: i, headers: rowNormalized };
    }
  }
  // Fallback: Tenta achar pelo menos UM keyword forte
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const rowNormalized = rows[i].map(c => normalizeStr(c));
      if (rowNormalized.some(h => h === normalizeStr(keywords[0]))) { 
          return { index: i, headers: rowNormalized };
      }
  }

  return { index: -1, headers: [] };
};

// --- CARREGAR MOVIMENTAÇÕES (ENTRADA / SAIDA) ---
export const fetchMovements = async (url: string, type: 'entrada' | 'saida'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];

  // Header Hunting Reforçado
  let headerIdx = -1;
  let headers: string[] = [];

  // Procura linha que tenha CODIGO e DATA simultaneamente
  const checkRow = (row: string[]) => {
      const normalized = row.map(c => normalizeStr(c));
      const hasCode = normalized.some(h => h.includes('cod') || h.includes('item') || h.includes('produto'));
      const hasData = normalized.some(h => h.includes('data') || h.includes('dia') || h.includes('moviment') || h.includes('emissao'));
      return { match: hasCode && hasData, headers: normalized };
  };

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const { match, headers: h } = checkRow(rows[i]);
    if (match) {
        headerIdx = i;
        headers = h;
        break;
    }
  }

  if (headerIdx === -1) return [];

  // Helpers de busca de coluna
  const findCol = (terms: string[], avoidTerms: string[] = []) => {
      return headers.findIndex(h => {
          const normalizedH = normalizeStr(h);
          const matchesTerm = terms.some(t => normalizedH.includes(normalizeStr(t)));
          const matchesAvoid = avoidTerms.some(t => normalizedH.includes(normalizeStr(t)));
          return matchesTerm && !matchesAvoid;
      });
  };

  const idxData = findCol(['data', 'dia', 'registro', 'emissao']);
  const idxCodigo = findCol(['cód', 'cod', 'item']);
  
  const qtdTerms = type === 'entrada' 
    ? ['recebida', 'entrada', 'qtd', 'quant'] 
    : ['retirada', 'saída', 'saida', 'qtd', 'quant'];
  const idxQtd = findCol(qtdTerms);
  
  const idxForn = findCol(['fornecedor', 'fabricante']);
  
  // Lógica estrita para Valor Unitário: DEVE ter unit/preco/valor e NÃO PODE ter Total
  const idxVal = findCol(['unit', 'vl. unit', 'vlr', 'preco'], ['total', 'bruto']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    let codigo = (idxCodigo !== -1 ? row[idxCodigo] : row[0])?.trim();
    if (!codigo) return null;
    
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`;

    const data = idxData !== -1 ? parseDate(row[idxData]) : null;
    const finalDate = data || new Date(); 
    
    const rawQtd = idxQtd !== -1 ? row[idxQtd] : '0';
    const qtd = parseNumber(rawQtd);

    if (qtd === 0 && rawQtd === '') return null;
    
    let val = 0;
    if (idxVal !== -1) {
        val = parseNumber(row[idxVal]);
    }

    return {
      id: `${type}-${i}`,
      tipo: type,
      data: finalDate,
      codigo: codigo,
      quantidade: qtd,
      fornecedor: idxForn !== -1 ? row[idxForn] : undefined,
      valorUnitario: val,
    };
  }).filter((m): m is Movement => m !== null);
};

// --- CARREGAR ESTOQUE (PRINCIPAL) ---
export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];

  const { index: headerIdx, headers } = findHeaderRow(rows, ['cód']);
  if (headerIdx === -1) return []; 

  const findCol = (priorityTerms: string[], avoidTerms: string[] = []) => {
      return headers.findIndex(h => {
          const normalizedH = normalizeStr(h);
          const matchesTerm = priorityTerms.some(t => normalizedH.includes(normalizeStr(t)));
          const matchesAvoid = avoidTerms.some(t => normalizedH.includes(normalizeStr(t)));
          return matchesTerm && !matchesAvoid;
      });
  };

  const idxCodigo = findCol(['cód', 'cod']);
  const idxDesc = findCol(['descri', 'nome']);
  const idxEquip = findCol(['equip', 'máquina']);
  const idxLoc = findCol(['local', 'prateleira']);
  const idxForn = findCol(['fornecedor']); 
  const idxUnd = findCol(['medida', 'unidade', 'und', 'u.m.']);
  
  // Procura explicitamente por "Estoque" ou "Saldo"
  let idxQtd = findCol(['quantidade em estoque', 'estoque atual', 'saldo atual']);
  if (idxQtd === -1) {
      idxQtd = findCol(['quant', 'qtd', 'estoque'], ['min', 'entrad', 'saíd', 'inicial']);
  }

  const idxMin = findCol(['mínim', 'minim', 'min']);
  const idxCat = findCol(['categ', 'grupo']);

  return rows.slice(headerIdx + 1).map((row, index): InventoryItem | null => {
    let codigo = (idxCodigo !== -1 ? row[idxCodigo] : row[0])?.trim();
    if (!codigo) return null;
    
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`;

    const qtd = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    
    // Leitura e formatação da unidade
    const rawUnd = idxUnd !== -1 ? (row[idxUnd] || 'un.') : 'un.';
    const unidadeFormatada = formatUnit(rawUnd);

    return {
      id: `item-${index}`,
      codigo,
      descricao: idxDesc !== -1 ? row[idxDesc] : '',
      equipamento: idxEquip !== -1 ? (row[idxEquip] || 'N/D') : 'N/D',
      localizacao: idxLoc !== -1 ? (row[idxLoc] || '') : '',
      fornecedor: idxForn !== -1 ? (row[idxForn] || '') : '', 
      quantidadeAtual: qtd,
      quantidadeMinima: idxMin !== -1 ? parseNumber(row[idxMin]) : 0,
      unidade: unidadeFormatada,
      entradas: 0, // Será calculado no App.tsx
      saidas: 0,   // Será calculado no App.tsx
      categoria: idxCat !== -1 ? (row[idxCat] || 'Geral') : 'Geral',
      valorUnitario: 0,
      valorTotal: 0,
      dataAtualizacao: new Date().toISOString()
    };
  }).filter((i): i is InventoryItem => i !== null);
};