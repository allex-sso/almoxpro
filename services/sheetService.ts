import { InventoryItem, Movement, ServiceOrder } from '../types';

const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

const formatCodigo = (code: string | undefined): string => {
  if (!code) return "";
  const trimmed = code.toString().trim();
  if (trimmed.length === 1 && trimmed >= '0' && trimmed <= '9') {
    return `0${trimmed}`;
  }
  return trimmed;
};

const parseNumber = (value: string): number => {
  if (!value) return 0;
  let str = value.toString().trim();
  str = str.replace(/R\$\s?/gi, '').replace(/\u00A0/g, '').replace(/\s/g, '').trim();
  if (str.includes(',') && !str.includes('.')) {
     str = str.replace(',', '.');
  } else if (str.includes('.') && str.includes(',')) {
     if (str.indexOf('.') < str.indexOf(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
     }
  }
  str = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const parseDurationToHours = (value: string): number => {
  if (!value) return 0;
  const str = value.toString().trim();
  if (str.includes(':')) {
    const parts = str.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length >= 2) {
      const h = parts[0];
      const m = parts[1];
      const s = parts[2] || 0;
      return h + (m / 60) + (s / 3600);
    }
  }
  return parseNumber(value);
};

const formatUnit = (raw: string): string => {
  const val = normalizeStr(raw);
  if (!val) return 'un';
  if (val.startsWith('unid') || val === 'und' || val === 'un' || val === 'unidade') return 'un';
  if (val.startsWith('metr') || val === 'm' || val === 'mts') return 'mt';
  if (val.startsWith('pec') || val.startsWith('pc') || val === 'pç' || val === 'peca') return 'pç';
  if (val.startsWith('quilo') || val === 'kg') return 'kg';
  if (val.startsWith('litro') || val === 'lt' || val === 'l') return 'lt';
  return raw.substring(0, 2).toLowerCase();
};

const detectDelimiter = (text: string): string => {
  const lines = text.split('\n').slice(0, 15).filter(l => l.trim().length > 0);
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

const parseDate = (value: string): Date | null => {
  if (!value || value.trim() === '') return null;
  
  let date: Date | null = null;
  const trimmedValue = value.trim();

  if (!isNaN(Number(trimmedValue)) && !trimmedValue.includes('/')) {
    const serial = Number(trimmedValue);
    if (serial < 1000) return null; 
    date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  } 
  else if (trimmedValue.includes('/')) {
    const parts = trimmedValue.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    
    const dParts = datePart.split('/');
    if (dParts.length === 3) {
      const d = parseInt(dParts[0]);
      const m = parseInt(dParts[1]);
      let yStr = dParts[2].trim();
      
      if (yStr.length === 5 && yStr.startsWith('202')) {
          yStr = yStr[0] + yStr[1] + yStr[2] + yStr[4];
      } else if (yStr.length > 4) {
          yStr = yStr.substring(0, 4);
      }
      
      let y = parseInt(yStr);
      if (y < 100) y += 2000;

      const tParts = timePart.split(':');
      const hh = parseInt(tParts[0] || '0');
      const mm = parseInt(tParts[1] || '0');
      const ss = parseInt(tParts[2] || '0');

      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        date = new Date(y, m - 1, d, hh, mm, ss);
      }
    }
  } 
  else {
    const d = new Date(trimmedValue);
    if (!isNaN(d.getTime())) date = d;
  }

  if (!date || isNaN(date.getTime()) || date.getFullYear() < 1990 || date.getFullYear() > 2100) {
    return null;
  }
  
  return date;
};

const fetchCSV = async (url: string): Promise<string[][]> => {
  let targetUrl = url ? url.trim() : '';
  if (!targetUrl || targetUrl.length < 5) return [];
  if (!targetUrl.startsWith('http')) {
    targetUrl = `https://docs.google.com/spreadsheets/d/${targetUrl}/export?format=csv`;
  }
  try {
    const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit'
    });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) return [];
    if (!text.trim()) return [];

    const delimiter = detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    return lines.map(line => parseCSVLine(line, delimiter));
  } catch (error) {
    return [];
  }
};

const findHeaderRow = (rows: string[][], keywords: string[]): { index: number, headers: string[] } => {
  for (let i = 0; i < Math.min(rows.length, 20); i++) { 
    const rowNormalized = rows[i].map(c => normalizeStr(c));
    if (keywords.some(k => rowNormalized.some(h => h.includes(normalizeStr(k))))) {
      return { index: i, headers: rowNormalized };
    }
  }
  return { index: -1, headers: [] };
};

const findBestCol = (headers: string[], terms: string[]) => {
  for (const term of terms) {
    const tNorm = normalizeStr(term);
    const foundIndex = headers.findIndex(h => {
      const hNorm = normalizeStr(h);
      if (tNorm.length <= 2) return hNorm === tNorm;
      return hNorm === tNorm || hNorm.includes(tNorm);
    });
    if (foundIndex !== -1) return foundIndex;
  }
  return -1;
};

export const fetchMovements = async (url: string, type: 'entrada' | 'saida'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['cod', 'data']);
  if (headerIdx === -1) return [];

  const idxData = findBestCol(headers, ['data', 'dia', 'registro']);
  const idxCodigo = findBestCol(headers, ['cod', 'item']);
  const idxQtd = findBestCol(headers, type === 'entrada' ? ['recebida', 'qtd'] : ['retirada', 'qtd']);
  const idxForn = findBestCol(headers, ['fornecedor']);
  const idxResp = findBestCol(headers, ['responsavel', 'solicitante', 'retirado por', 'funcionario']);
  const idxValUnit = findBestCol(headers, ['unitario']);
  const idxValTotal = findBestCol(headers, ['valor total', 'vl. total']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const rawDate = idxData !== -1 ? parseDate(row[idxData]) : null;
    if (!rawDate) return null;
    const rawCode = idxCodigo !== -1 ? row[idxCodigo] : row[0];
    const codigo = formatCodigo(rawCode);
    
    const qtd = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    if (qtd === 0) return null;
    return {
      id: `${type}-${i}`,
      tipo: type,
      data: rawDate,
      codigo,
      quantidade: qtd,
      fornecedor: idxForn !== -1 ? row[idxForn] : undefined,
      responsavel: idxResp !== -1 ? row[idxResp] : undefined,
      valorUnitario: idxValUnit !== -1 ? parseNumber(row[idxValUnit]) : 0,
      valorTotal: idxValTotal !== -1 ? parseNumber(row[idxValTotal]) : 0
    };
  }).filter((m): m is Movement => m !== null);
};

export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['cod']);
  if (headerIdx === -1) return []; 
  
  const idxCodigo = findBestCol(headers, ['cod']);
  const idxDesc = findBestCol(headers, ['descri']);
  const idxEquip = findBestCol(headers, ['equip', 'maquina']);
  const idxLoc = findBestCol(headers, ['local']);
  const idxForn = findBestCol(headers, ['fornecedor']); 
  const idxUnd = findBestCol(headers, ['unid', 'und', 'medida']);
  const idxQtd = findBestCol(headers, ['quantidade em estoque', 'estoque atual', 'saldo atual', 'saldo', 'estoque', 'quantidade']);
  const idxMin = findBestCol(headers, ['minim']);
  const idxCat = findBestCol(headers, ['categ', 'grupo']);

  const itemMap = new Map<string, InventoryItem>();
  rows.slice(headerIdx + 1).forEach((row) => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return;
    
    const item: InventoryItem = {
        id: codigo,
        codigo,
        descricao: row[idxDesc] || '',
        equipamento: row[idxEquip] || 'N/D',
        localizacao: row[idxLoc] || '',
        fornecedor: row[idxForn] || '',
        quantidadeAtual: parseNumber(row[idxQtd]),
        quantidadeMinima: parseNumber(row[idxMin]),
        unidade: formatUnit(row[idxUnd]),
        entradas: 0, 
        saidas: 0,   
        categoria: row[idxCat] || 'Geral',
        valorUnitario: 0,
        valorTotal: 0,
        dataAtualizacao: new Date().toISOString()
    };
    itemMap.set(codigo, item);
  });
  return Array.from(itemMap.values());
};

export const fetchServiceOrders = async (url: string): Promise<ServiceOrder[]> => {
    const rows = await fetchCSV(url);
    if (rows.length === 0) return [];
    const { index: headerIdx, headers } = findHeaderRow(rows, ['abertura', 'os', 'profissional', 'setor']);
    if (headerIdx === -1) return [];

    const idxNum = findBestCol(headers, ['ordem de servico', 'numero os', 'numero', 'os']);
    const idxAbertura = findBestCol(headers, ['abertura', 'criado em', 'data']);
    const idxInicio = findBestCol(headers, ['inicio', 'atendimento', 'inicio manutencao']);
    const idxFim = findBestCol(headers, ['fim', 'conclusao', 'fechamento', 'fim manutencao']);
    const idxProf = findBestCol(headers, ['profissional', 'tecnico', 'responsavel', 'nome']);
    const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'ativo']);
    const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento']);
    const idxStatus = findBestCol(headers, ['status', 'situacao']);
    const idxHoras = findBestCol(headers, ['horas', 'tempo gasto', 'duracao', 'tempo servico']);
    const idxDesc = findBestCol(headers, ['atividade', 'descricao', 'problema', 'obs']);
    const idxParada = findBestCol(headers, ['parada', 'equipamento parado']);

    return rows.slice(headerIdx + 1).map((row, i): ServiceOrder | null => {
        const dataAbertura = parseDate(row[idxAbertura]);
        if (!dataAbertura) return null;

        const rawParada = row[idxParada] || 'Não';
        const nParada = normalizeStr(rawParada);
        const normalizedParada = (nParada.includes('sim') || nParada === 's' || nParada === '1') ? 'Sim' : 'Não';

        return {
            id: `os-${i}`,
            numero: row[idxNum] || `OS-${i}`,
            dataAbertura: dataAbertura,
            dataInicio: idxInicio !== -1 ? parseDate(row[idxInicio]) || undefined : undefined,
            dataFim: idxFim !== -1 ? parseDate(row[idxFim]) || undefined : undefined,
            profissional: row[idxProf] || 'Não Atribuído',
            equipamento: row[idxEquip] || 'Geral',
            setor: row[idxSetor] || 'Outros',
            status: row[idxStatus] || 'N/D',
            horas: idxHoras !== -1 ? parseDurationToHours(row[idxHoras]) : 0,
            descricao: row[idxDesc] || '',
            parada: normalizedParada
        };
    }).filter((os): os is ServiceOrder => os !== null);
};