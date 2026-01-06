import { InventoryItem, Movement, ServiceOrder } from '../types';

const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

const formatCodigo = (code: any): string => {
  if (code === null || code === undefined) return "";
  let str = String(code).trim();
  if (str === "" || str === "0") return str;
  
  // Verifica se o código é puramente numérico para aplicar a formatação
  if (/^\d+$/.test(str)) {
    // Normaliza removendo zeros à esquerda e transformando em número para garantir o dígito base
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      return '0' + num;
    }
    return String(num); // Para números > 9, remove os zeros extras se houver (ex: 0010 -> 10)
  }
  
  return str;
};

const parseNumber = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  let str = value.toString().trim();
  str = str.replace(/R\$/gi, '').replace(/\s/g, '').replace(/[^-0-9,.]/g, '');
  
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  
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
  if (val.startsWith('unid') || val === 'und' || val === 'un') return 'un';
  if (val.startsWith('metr') || val === 'm') return 'mt';
  if (val.startsWith('pec') || val.startsWith('pc') || val === 'pç') return 'pç';
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

  if (!isNaN(Number(trimmedValue)) && !trimmedValue.includes('/') && !trimmedValue.includes('-')) {
    const serial = Number(trimmedValue);
    if (serial > 30000) {
      date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    }
  } 
  else if (trimmedValue.includes('/') || trimmedValue.includes('-')) {
    const separator = trimmedValue.includes('/') ? '/' : '-';
    const parts = trimmedValue.split(' ');
    const datePart = parts[0];
    const dParts = datePart.split(separator);
    if (dParts.length === 3) {
      let d, m, y;
      if (dParts[0].length === 4) {
        y = parseInt(dParts[0]); m = parseInt(dParts[1]); d = parseInt(dParts[2]);
      } else {
        d = parseInt(dParts[0]); m = parseInt(dParts[1]); y = parseInt(dParts[2]);
      }
      if (y < 100) y += 2000;
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        if (parts.length > 1) {
            const tParts = parts[1].split(':');
            const hh = parseInt(tParts[0]) || 0;
            const mm = parseInt(tParts[1]) || 0;
            const ss = parseInt(tParts[2]) || 0;
            date = new Date(y, m - 1, d, hh, mm, ss);
        } else {
            date = new Date(y, m - 1, d);
        }
      }
    }
  } 

  if (!date || isNaN(date.getTime())) return null;
  return date;
};

const fetchCSV = async (url: string): Promise<string[][]> => {
  let targetUrl = url ? url.trim() : '';
  if (!targetUrl || targetUrl.length < 5) return [];
  if (!targetUrl.startsWith('http')) {
    targetUrl = `https://docs.google.com/spreadsheets/d/${targetUrl}/export?format=csv`;
  }
  try {
    const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}cache=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store'
    });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE html>')) return [];
    
    const delimiter = detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    return lines.map(line => parseCSVLine(line, delimiter));
  } catch (error) {
    return [];
  }
};

const findHeaderRow = (rows: string[][], keywords: string[]): { index: number, headers: string[] } => {
  for (let i = 0; i < Math.min(rows.length, 50); i++) { 
    const rowNormalized = rows[i].map(c => normalizeStr(c));
    let matches = 0;
    keywords.forEach(k => {
      const knorm = normalizeStr(k);
      if (rowNormalized.some(h => h === knorm || h.includes(knorm))) matches++;
    });
    
    if (matches >= 1) {
      const hasSecurityKeyword = rowNormalized.some(h => 
        h.includes('cod') || h.includes('data') || h.includes('item') || h.includes('equipamento') || h.includes('ordem')
      );
      if (hasSecurityKeyword) {
        return { index: i, headers: rowNormalized };
      }
    }
  }
  return { index: -1, headers: [] };
};

const findBestCol = (headers: string[], terms: string[]) => {
  for (const term of terms) {
    const tNorm = normalizeStr(term);
    const foundIndex = headers.findIndex(h => {
      const hNorm = normalizeStr(h);
      return hNorm === tNorm || hNorm.includes(tNorm);
    });
    if (foundIndex !== -1) return foundIndex;
  }
  return -1;
};

export const fetchMovements = async (url: string, type: 'entrada' | 'saida'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  
  const { index: headerIdx, headers } = findHeaderRow(rows, ['cod', 'codigo', 'data', 'quantidade', 'material', 'descricao']);
  if (headerIdx === -1) return [];

  const idxData = findBestCol(headers, ['data de entrada', 'data de saida', 'data', 'dia', 'registro']);
  const idxCodigo = findBestCol(headers, ['codigo', 'cod', 'item', 'referencia', 'material', 'ref']);
  const idxQtd = findBestCol(headers, ['quantidade recebida', 'quantidade retirada', 'quantidade', 'qtd', 'qtde', 'volume', 'movimentado']);
  const idxValUnit = findBestCol(headers, ['valor unitario', 'unitario', 'vlr unit', 'custo unit', 'preco unit', 'unit']);
  const idxValTotal = findBestCol(headers, ['valor total', 'vl total', 'total', 'vlr total', 'vl. total']);
  const idxResp = findBestCol(headers, ['responsavel', 'solicitante', 'quem', 'mecanico', 'funcionario']);
  const idxSetor = findBestCol(headers, ['setor solicitante', 'setor', 'area', 'departamento']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const rawCode = idxCodigo !== -1 ? row[idxCodigo] : row[1];
    const codigo = formatCodigo(rawCode);
    if (!codigo) return null;
    
    const qtd = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    let vUnit = idxValUnit !== -1 ? parseNumber(row[idxValUnit]) : 0;
    let vTotal = idxValTotal !== -1 ? parseNumber(row[idxValTotal]) : 0;

    if (vUnit === 0 && vTotal > 0 && qtd > 0) {
        vUnit = vTotal / qtd;
    } else if (vUnit > 0 && vTotal === 0 && qtd > 0) {
        vTotal = vUnit * qtd;
    }

    return {
      id: `${type}-${i}-${Date.now()}`,
      tipo: type,
      data: idxData !== -1 ? (parseDate(row[idxData]) || new Date()) : new Date(),
      codigo,
      quantidade: qtd,
      valorUnitario: vUnit,
      valorTotal: vTotal,
      fornecedor: row[findBestCol(headers, ['fornecedor', 'origem', 'marca'])] || undefined,
      responsavel: idxResp !== -1 ? row[idxResp] : undefined,
      setor: idxSetor !== -1 ? row[idxSetor] : undefined
    };
  }).filter((m): m is Movement => m !== null && m.quantidade > 0);
};

export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['cod', 'descricao', 'estoque', 'item', 'codigo']);
  if (headerIdx === -1) return []; 
  
  const idxCodigo = findBestCol(headers, ['codigo', 'cod', 'item', 'referencia', 'material', 'ref']);
  const idxDesc = findBestCol(headers, ['descricao', 'descri', 'nome', 'material', 'produto']);
  const idxQtd = findBestCol(headers, ['quantidade em estoque', 'estoque atual', 'saldo atual', 'saldo', 'estoque', 'quantidade', 'qtd']);
  const idxValUnit = findBestCol(headers, ['valor unitario', 'unitario', 'vlr unit', 'custo', 'preco', 'v.unit']);
  const idxValTotal = findBestCol(headers, ['valor total', 'vl total', 'total', 'vlr total']);
  const idxMin = findBestCol(headers, ['estoque minimo', 'minimo', 'minim', 'reserva']);
  const idxLoc = findBestCol(headers, ['localizacao', 'local', 'posicao', 'endereco']);
  const idxCat = findBestCol(headers, ['categoria', 'categ', 'grupo', 'tipo']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'ativo']);

  return rows.slice(headerIdx + 1).map((row) => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return null;
    
    const qAtual = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    let vUnit = idxValUnit !== -1 ? parseNumber(row[idxValUnit]) : 0;
    const vTotalCol = idxValTotal !== -1 ? parseNumber(row[idxValTotal]) : 0;
    
    if (vUnit === 0 && vTotalCol > 0 && qAtual > 0) vUnit = vTotalCol / qAtual;

    return {
        id: codigo,
        codigo,
        descricao: idxDesc !== -1 ? row[idxDesc] : '',
        quantidadeAtual: qAtual,
        quantidadeMinima: idxMin !== -1 ? parseNumber(row[idxMin]) : 0,
        unidade: formatUnit(row[findBestCol(headers, ['unidade', 'unid', 'und', 'medida'])] || 'un'),
        localizacao: idxLoc !== -1 ? row[idxLoc] : '',
        fornecedor: row[findBestCol(headers, ['fornecedor', 'marca'])] || '',
        categoria: idxCat !== -1 ? row[idxCat] : 'Geral',
        equipamento: idxEquip !== -1 ? row[idxEquip] : '',
        valorUnitario: vUnit,
        valorTotal: vTotalCol || (qAtual * vUnit),
        entradas: 0,
        saidas: 0,
        dataAtualizacao: new Date().toISOString()
    } as InventoryItem;
  }).filter((i): i is InventoryItem => i !== null);
};

export const fetchServiceOrders = async (url: string): Promise<ServiceOrder[]> => {
    const rows = await fetchCSV(url);
    if (rows.length === 0) return [];
    
    const { index: headerIdx, headers } = findHeaderRow(rows, ['abertura', 'os', 'profissional', 'equipamento']);
    if (headerIdx === -1) return [];

    const idxAbertura = findBestCol(headers, ['abertura', 'data abertura', 'criado em']);
    const idxInicio = findBestCol(headers, ['inicio', 'comeco']);
    const idxFim = findBestCol(headers, ['fim', 'conclusao', 'data/hora fim']);
    const idxProf = findBestCol(headers, ['profissional', 'tecnico', 'responsavel', 'mecanico']);
    const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'ativo']);
    const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento']);
    const idxPeca = findBestCol(headers, ['peca', 'material', 'trocada']);
    const idxParada = findBestCol(headers, ['parada', 'maquina parou']);
    const idxMotivo = findBestCol(headers, ['motivo', 'falha', 'problema']);
    const idxAtiv = findBestCol(headers, ['atividade', 'servico', 'descricao']);
    const idxHoras = findBestCol(headers, ['horas', 'tempo', 'duracao', 'tempo servico']);
    const idxNum = findBestCol(headers, ['os', 'numero', 'ordem de servico']);
    
    return rows.slice(headerIdx + 1).map((row, i): ServiceOrder | null => {
        if (!row[idxAbertura] && !row[idxNum]) return null;

        const dataAbertura = parseDate(row[idxAbertura]) || new Date();
        const dataInicio = idxInicio !== -1 ? parseDate(row[idxInicio]) : undefined;
        const dataFim = idxFim !== -1 ? parseDate(row[idxFim]) : undefined;

        return {
            id: `os-${i}`,
            numero: idxNum !== -1 ? row[idxNum] : `OS-${i}`,
            dataAbertura: dataAbertura,
            dataInicio: dataInicio,
            dataFim: dataFim,
            professional: idxProf !== -1 ? row[idxProf] : 'Não Atribuído',
            equipamento: idxEquip !== -1 ? row[idxEquip] : 'Geral',
            setor: idxSetor !== -1 ? row[idxSetor] : 'Outros',
            status: 'Concluído',
            horas: idxHoras !== -1 ? parseDurationToHours(row[idxHoras]) : 0,
            descricao: idxAtiv !== -1 ? row[idxAtiv] : '',
            parada: idxParada !== -1 ? row[idxParada] : 'Não',
            peca: idxPeca !== -1 ? row[idxPeca] : '',
            motivo: idxMotivo !== -1 ? row[idxMotivo] : ''
        };
    }).filter(os => os !== null) as ServiceOrder[];
};

export const fetchCentralData = async (url: string): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['material', 'solicitante', 'data']);
  if (headerIdx === -1) return [];

  const idxData = findBestCol(headers, ['data', 'dia', 'registro']);
  const idxDesc = findBestCol(headers, ['material', 'descricao', 'item']);
  const idxQtd = findBestCol(headers, ['quantidade', 'qtd', 'saida']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    if (!row[idxDesc]) return null;
    return {
      id: `central-${i}`,
      data: idxData !== -1 ? (parseDate(row[idxData]) || new Date()) : new Date(),
      codigo: formatCodigo(row[idxDesc]),
      quantidade: idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0,
      tipo: 'saida',
      responsavel: row[findBestCol(headers, ['solicitante', 'responsavel'])] || 'N/D',
      setor: row[findBestCol(headers, ['setor', 'area'])] || 'Outros'
    } as Movement;
  }).filter(x => x !== null && x.quantidade > 0) as Movement[];
};