
import { InventoryItem, Movement, ServiceOrder, ProductionEntry, PreventiveEntry, AddressItem } from '../types';

const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

const formatCodigo = (code: any): string => {
  if (code === null || code === undefined) return "";
  let str = String(code).trim();
  if (str === "" || str === "0") return str;
  
  if (/^\d$/.test(str)) {
    return "0" + str;
  }
  
  return str;
}

const parseNumber = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  let str = value.toString().trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!str || str === '-' || str === '.') return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    str = str.replace(',', '.');
  } else if (hasDot) {
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const parseDurationToHours = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  const str = value.toString().trim();
  if (str.includes(':')) {
    const parts = str.split(':').map(p => {
      const clean = p.replace(/[^0-9]/g, '');
      return parseFloat(clean) || 0;
    });
    if (parts.length >= 2) {
      const h = parts[0];
      const m = parts[1];
      const s = parts.length > 2 ? parts[2] : 0;
      return h + (m / 60) + (s / 3600);
    }
  }
  return parseNumber(value);
};

const detectDelimiter = (text: string): string => {
  const lines = text.split('\n').slice(0, 20).filter(l => l.trim().length > 0);
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
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
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
  const trimmedValue = value.trim();
  if (!isNaN(Number(trimmedValue)) && !trimmedValue.includes('/') && !trimmedValue.includes('-')) {
    const serial = Number(trimmedValue);
    if (serial > 30000) return new Date(Math.round((serial - 25569) * 86400 * 1000));
  }
  const dateTimeParts = trimmedValue.split(' ');
  const datePart = dateTimeParts[0];
  const timePart = dateTimeParts.length > 1 ? dateTimeParts[1] : '00:00:00';
  const separator = datePart.includes('/') ? '/' : '-';
  const parts = datePart.split(separator);
  let d, m, y;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]);
    } else {
      d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]);
    }
    if (y < 100) y += 2000;
    const [hh, min, ss] = timePart.split(':').map(x => parseInt(x) || 0);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(y, m - 1, d, hh, min, ss || 0);
      return isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
};

const fetchCSV = async (url: string): Promise<string[][]> => {
  let targetUrl = url ? url.trim() : '';
  if (!targetUrl || targetUrl.length < 5) return [];
  if (!targetUrl.startsWith('http')) targetUrl = `https://docs.google.com/spreadsheets/d/${targetUrl}/export?format=csv`;
  try {
    const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}cache=${Date.now()}`, { method: 'GET', cache: 'no-store' });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE html>')) return [];
    const delimiter = detectDelimiter(text);
    return text.split(/\r?\n/).filter(l => l.trim().length > 0).map(line => parseCSVLine(line, delimiter));
  } catch (error) { return []; }
};

const findHeaderRow = (rows: string[][], keywords: string[]): { index: number, headers: string[] } => {
  for (let i = 0; i < Math.min(rows.length, 100); i++) { 
    const rowNormalized = rows[i].map(c => normalizeStr(c));
    let matches = 0;
    keywords.forEach(k => { 
        const kNorm = normalizeStr(k);
        if (rowNormalized.some(h => h === kNorm || h.includes(kNorm))) matches++; 
    });
    if (matches >= 2) return { index: i, headers: rowNormalized };
  }
  return { index: -1, headers: [] };
};

const findBestCol = (headers: string[], terms: string[]) => {
  for (const term of terms) {
    const tNorm = normalizeStr(term);
    for (let i = 0; i < headers.length; i++) {
        const hNorm = normalizeStr(headers[i]);
        if (hNorm === tNorm || hNorm.includes(tNorm)) return i;
    }
  }
  return -1;
};

/**
 * Lógica de persistência para datas ausentes.
 * Gera um timestamp fixo baseado na impressão digital do registro.
 */
const getPersistentFallbackDate = (fingerprint: string): Date => {
  const storageKey = 'alumasa_fallback_timestamps';
  let timestamps: Record<string, string> = {};
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) timestamps = JSON.parse(stored);
  } catch (e) {}

  if (timestamps[fingerprint]) {
    const date = new Date(timestamps[fingerprint]);
    if (!isNaN(date.getTime())) return date;
  }

  const now = new Date();
  timestamps[fingerprint] = now.toISOString();
  try {
    localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch (e) {}
  
  return now;
};

export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['codigo', 'descricao', 'quantidade em estoque']);
  if (headerIdx === -1) return []; 
  
  const idxCodigo = findBestCol(headers, ['codigo', 'cod', 'id']);
  const idxDesc = findBestCol(headers, ['descricao', 'item', 'nome']);
  const idxQtdEstoque = findBestCol(headers, ['quantidade em estoque', 'estoque', 'reserva', 'pulmao']);
  const idxQtdPicking = findBestCol(headers, ['quantidade em picking', 'picking']);
  const idxQtdTotal = findBestCol(headers, ['quantidade total', 'saldo total', 'estoque total', 'saldo']);
  const idxMin = findBestCol(headers, ['quantidade minima', 'minimo']);
  const idxMax = findBestCol(headers, ['quantidade maxima', 'maximo']);
  const idxLead = findBestCol(headers, ['tempo de entrega', 'lead time', 'entrega', 'prazo']);
  const idxSit = findBestCol(headers, ['situacao', 'status']);
  const idxCat = findBestCol(headers, ['categoria', 'tipo']);
  const idxMedida = findBestCol(headers, ['medida', 'unidade']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'vinculo']);
  const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento']);
  const idxValUni = findBestCol(headers, ['valor unitario', 'preco unitario', 'custo unit', 'vlr unit']);
  const idxValTot = findBestCol(headers, ['valor total', 'total', 'vlr total']);

  return rows.slice(headerIdx + 1).map((row) => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return null;
    
    const qtyEstoque = parseNumber(row[idxQtdEstoque]);
    const qtyPicking = idxQtdPicking !== -1 ? parseNumber(row[idxQtdPicking]) : 0;
    const qtyTotal = idxQtdTotal !== -1 ? parseNumber(row[idxQtdTotal]) : (qtyEstoque + qtyPicking);
    
    const unitPrice = idxValUni !== -1 ? parseNumber(row[idxValUni]) : 0;
    const totalPrice = idxValTot !== -1 ? parseNumber(row[idxValTot]) : (qtyTotal * unitPrice);
    
    return {
        id: codigo, 
        codigo, 
        descricao: row[idxDesc] || 'Sem Descrição', 
        quantidadeEstoque: qtyEstoque,
        quantidadePicking: qtyPicking,
        quantidadeAtual: qtyTotal,
        quantidadeMinima: parseNumber(row[idxMin]),
        quantidadeMaxima: parseNumber(row[idxMax]),
        tempoEntrega: parseNumber(row[idxLead]),
        valorUnitario: unitPrice, 
        valorTotal: totalPrice, 
        categoria: row[idxCat] || 'Geral', 
        unidade: row[idxMedida] || 'un',
        situacao: row[idxSit] || 'OK',
        equipamento: row[idxEquip] || 'Geral',
        setor: row[idxSetor] || 'N/D',
        dataAtualizacao: new Date().toISOString()
    } as InventoryItem;
  }).filter((i): i is InventoryItem => i !== null);
};

export const fetchMovements = async (url: string, type: 'entrada' | 'saida' | 'transferencia'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  
  const { index: headerIdx, headers } = findHeaderRow(rows, ['peça', 'equipamento', 'codigo', 'data', 'quantidade', 'movimentada', 'colaborador']);
  if (headerIdx === -1) return [];
  
  const idxData = findBestCol(headers, ['data/hora', 'data de entrada', 'data de saida', 'data lançamento', 'data mov', 'data', 'dia', 'abertura']);
  const idxCodigo = findBestCol(headers, ['peça', 'peca', 'item', 'codigo', 'cod']);
  const idxQtd = findBestCol(headers, ['quantidade recebida', 'quantidade retirada', 'quantidade movimentada', 'quantidade', 'qtd']);
  const idxValUni = findBestCol(headers, ['valor unitario', 'preco unitario', 'custo unit']);
  const idxValTot = findBestCol(headers, ['valor total', 'total']);
  const idxResp = findBestCol(headers, ['colaborador', 'responsavel', 'solicitante', 'quem', 'profissional', 'operador']);
  const idxForn = findBestCol(headers, ['fornecedor', 'forn', 'empresa']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'destino', 'ativo']);
  const idxMovTipo = findBestCol(headers, ['tipo movimentação', 'tipo movimentacao', 'tipo mov', 'tipo']);

  const seenFingerprints: Record<string, number> = {};

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const rawPiece = row[idxCodigo];
    if (!rawPiece && !row[idxEquip]) return null;
    const codigo = formatCodigo(rawPiece || 'Não especificada');
    const equip = String(row[idxEquip] || '').trim();
    const qty = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 1;
    const uPrice = parseNumber(row[idxValUni]);
    const resp = row[idxResp] || 'N/D';
    const movTipo = row[idxMovTipo] || (type === 'transferencia' ? 'MUDAR ENDEREÇO' : type.toUpperCase());
    
    const parsedDate = parseDate(row[idxData]);
    
    let finalDate: Date;
    let isDateFallback = false;

    if (parsedDate) {
      finalDate = parsedDate;
    } else {
      const rawFp = `mov_${type}_${codigo}_${qty}_${resp}_${equip}_${movTipo}`;
      const occurrence = (seenFingerprints[rawFp] || 0) + 1;
      seenFingerprints[rawFp] = occurrence;
      
      const finalFp = `${rawFp}_occ${occurrence}`;
      finalDate = getPersistentFallbackDate(finalFp);
      isDateFallback = true;
    }
    
    return {
      id: `${type}-${i}-${Date.now()}`,
      tipo: type,
      data: finalDate,
      isDateFallback: isDateFallback,
      codigo,
      quantidade: qty,
      responsavel: resp,
      fornecedor: row[idxForn] || 'DIVERSOS',
      equipamento: equip,
      valorUnitario: uPrice,
      valorTotal: parseNumber(row[idxValTot]) || (qty * uPrice),
      localizacaoOrigem: '',
      localizacaoDestino: '',
      movimentoTipo: movTipo
    };
  }).filter((m): m is Movement => m !== null && m.quantidade > 0);
};

export const fetchAddressData = async (url: string): Promise<AddressItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['endereco', 'quantidade atual no local']);
  if (headerIdx === -1) return [];
  const idxEnd = findBestCol(headers, ['endereco', 'cod']);
  const idxQtd = findBestCol(headers, ['quantidade atual no local', 'quantidade atual', 'atual', 'quantidade', 'saldo']);
  return rows.slice(headerIdx + 1).map((row, i) => ({
    id: `addr-${i}-${Date.now()}`,
    endereco: row[idxEnd] || 'N/D',
    rua: row[findBestCol(headers, ['rua'])] || '',
    predio: row[findBestCol(headers, ['predio'])] || '',
    andar: row[findBestCol(headers, ['andar'])] || '',
    sala: row[findBestCol(headers, ['sala'])] || '',
    quantidadeInicial: 0,
    quantidadeAtual: parseNumber(row[idxQtd])
  })).filter(a => a.endereco !== 'N/D');
};

export const fetchPreventiveData = async (url: string): Promise<PreventiveEntry[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['equipamento', 'atividade']);
  if (headerIdx === -1) return [];
  return rows.slice(headerIdx + 1).map((row, i): PreventiveEntry | null => {
    const equip = row[findBestCol(headers, ['equipamento', 'maquina'])]?.trim();
    if (!equip) return null;
    return {
      id: `prev-${i}-${Date.now()}`,
      dataPrevista: parseDate(row[findBestCol(headers, ['prevista'])]),
      dataExecucao: parseDate(row[findBestCol(headers, ['execucao', 'realizada'])]),
      setor: row[findBestCol(headers, ['setor'])]?.trim() || 'N/D',
      equipamento: equip,
      atividade: row[findBestCol(headers, ['atividade'])]?.trim() || '',
      natureza: row[findBestCol(headers, ['natureza', 'tipo'])]?.trim() || 'preventiva',
      status: row[findBestCol(headers, ['status'])]?.trim() || 'Concluído',
      descricaoTrabalho: row[findBestCol(headers, ['descricao'])]?.trim() || '',
      tempo: parseDurationToHours(row[findBestCol(headers, ['tempo', 'horas'])]),
      profissional: row[findBestCol(headers, ['colaborador', 'profissional', 'tecnico'])]?.trim() || 'N/D'
    };
  }).filter((p): p is PreventiveEntry => p !== null);
};

export const fetchProductionData = async (url: string): Promise<ProductionEntry[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['dia', 'produzido']);
  if (headerIdx !== -1) {
    return rows.slice(headerIdx + 1).map((row, i): ProductionEntry | null => {
      const dataParsed = parseDate(row[findBestCol(headers, ['dia', 'data'])]);
      if (!dataParsed) return null;
      return {
        id: `prod-${i}-${Date.now()}`,
        data: dataParsed,
        tipologia: row[findBestCol(headers, ['tipologia', 'modelo'])] || 'N/D',
        metaDia: parseNumber(row[findBestCol(headers, ['meta'])]),
        pecasHoraAlvo: parseNumber(row[findBestCol(headers, ['alvo'])]),
        mesa: row[findBestCol(headers, ['mesa', 'posto'])] || 'N/D',
        horasTrabalhadas: parseDurationToHours(row[findBestCol(headers, ['horas'])]),
        produzido: parseNumber(row[findBestCol(headers, ['produzido', 'total'])]),
        percentual: parseNumber(row[findBestCol(headers, ['percentual', 'eficiencia'])]),
        turno: row[findBestCol(headers, ['turno'])] || 'Geral',
        semana: row[findBestCol(headers, ['semana'])] || ''
      };
    }).filter((p): p is ProductionEntry => p !== null);
  }
  return [];
};

export const fetchServiceOrders = async (url: string): Promise<ServiceOrder[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['ordem', 'equipamento']);
  if (headerIdx === -1) return [];
  return rows.slice(headerIdx + 1).map((row, i): ServiceOrder | null => {
    return {
      id: `os-${i}-${Date.now()}`,
      numero: row[findBestCol(headers, ['ordem', 'os', 'numero'])] || '',
      dataAbertura: parseDate(row[findBestCol(headers, ['abertura', 'data'])]) || new Date(),
      dataInicio: parseDate(row[findBestCol(headers, ['inicio', 'start'])]),
      dataFim: parseDate(row[findBestCol(headers, ['fim', 'conclusao', 'termino'])]),
      professional: row[findBestCol(headers, ['colaborador', 'profissional', 'tecnico'])] || 'N/D',
      equipamento: row[findBestCol(headers, ['equipamento', 'maquina'])] || 'Geral',
      setor: row[findBestCol(headers, ['setor'])] || 'Manutenção',
      status: row[findBestCol(headers, ['status'])] || 'Concluído',
      horas: parseDurationToHours(row[findBestCol(headers, ['tempo', 'horas'])]),
      descricao: row[findBestCol(headers, ['atividade', 'descricao'])] || '',
      peca: row[findBestCol(headers, ['peça', 'peca', 'pecas'])] || '',
      motivo: row[findBestCol(headers, ['motivo', 'causa'])] || '',
      parada: row[findBestCol(headers, ['parada', 'maq parada'])] || 'Não'
    };
  }).filter((os): os is ServiceOrder => os !== null);
};

export const fetchCentralData = async (url: string): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  
  // Cabeçalhos específicos da planilha de perfis conforme imagem
  const { index: headerIdx, headers } = findHeaderRow(rows, ['perfil', 'solicitante', 'quantidade']);
  if (headerIdx === -1) return [];

  const idxTurno = findBestCol(headers, ['turno']);
  const idxData = findBestCol(headers, ['data']);
  const idxSolicitante = findBestCol(headers, ['solicitante', 'responsavel']);
  const idxSetor = findBestCol(headers, ['setor']);
  const idxPerfil = findBestCol(headers, ['perfil', 'material']);
  const idxQuantidade = findBestCol(headers, ['quantidade', 'qtd']);
  const idxCor = findBestCol(headers, ['cor']);
  const idxMotivo = findBestCol(headers, ['motivo']);
  const idxLiberador = findBestCol(headers, ['pessoa que liberou', 'liberou', 'quem liberou']);

  // Explicitly typing the map return value as Movement | null to avoid type predicate errors
  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const qty = parseNumber(row[idxQuantidade]);
    if (qty <= 0) return null;

    const dataParsed = parseDate(row[idxData]);
    
    return {
      id: `c-${i}-${Date.now()}`,
      data: dataParsed || new Date(),
      codigo: row[idxPerfil] || 'N/D',
      perfil: row[idxPerfil] || 'N/D',
      quantidade: qty,
      tipo: 'saida',
      turno: row[idxTurno] || 'Geral',
      responsavel: row[idxSolicitante] || 'N/D',
      liberador: row[idxLiberador] || 'N/D',
      motivo: row[idxMotivo] || 'Geral',
      setor: row[idxSetor] || 'Outros',
      cor: row[idxCor] || 'N/D'
    };
  }).filter((x): x is Movement => x !== null);
};
