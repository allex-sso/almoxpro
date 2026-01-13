
import { InventoryItem, Movement, ServiceOrder } from '../types';

const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

const formatCodigo = (code: any): string => {
  if (code === null || code === undefined) return "";
  let str = String(code).trim();
  if (str === "" || str === "0") return str;
  
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      return '0' + num;
    }
    return String(num);
  }
  
  return str;
}

const parseNumber = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  let str = value.toString().trim();
  str = str.replace(/R\$/gi, '').replace(/\s/g, '').replace(/[^-0-9,.]/g, '');
  
  if (str === "" || str === "-") return 0;

  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
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
    const timePart = parts[1] || '00:00:00';
    const dParts = datePart.split(separator);
    
    if (dParts.length === 3) {
      let d, m, y;
      if (dParts[0].length === 4) {
        y = parseInt(dParts[0]); m = parseInt(dParts[1]); d = parseInt(dParts[2]);
      } else {
        d = parseInt(dParts[0]); m = parseInt(dParts[1]); y = parseInt(dParts[2]);
      }
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

  const idxData = findBestCol(headers, ['data', 'dia', 'registro', 'data de entrada', 'data de saida']);
  const idxCodigo = findBestCol(headers, ['codigo', 'cod', 'item', 'referencia', 'material', 'ref']);
  const idxQtd = findBestCol(headers, ['quantidade', 'qtd', 'qtde', 'quant', 'saida', 'volume', 'movimentado']);
  const idxValUnit = findBestCol(headers, ['valor unitario', 'unitario', 'vlr unit', 'custo unit', 'preco unit', 'valor unit', 'vlr unitario', 'preco', 'preço', 'valor', 'vlr']);
  const idxResp = findBestCol(headers, ['responsavel', 'solicitante', 'quem', 'funcionario', 'usuario']);
  const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento']);
  const idxForn = findBestCol(headers, ['fornecedor', 'forn', 'empresa', 'origem', 'vendor']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return null;
    
    const qtd = parseNumber(row[idxQtd]);
    const valUnit = idxValUnit !== -1 ? parseNumber(row[idxValUnit]) : 0;
    
    return {
      id: `${type}-${i}-${Date.now()}`,
      tipo: type,
      data: idxData !== -1 ? (parseDate(row[idxData]) || new Date()) : new Date(),
      codigo,
      quantidade: qtd,
      valorUnitario: valUnit,
      valorTotal: qtd * valUnit,
      responsavel: idxResp !== -1 ? row[idxResp] : undefined,
      setor: idxSetor !== -1 ? row[idxSetor] : undefined,
      fornecedor: idxForn !== -1 ? row[idxForn] : undefined
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
  
  // Prioridade total para o termo exato solicitado pelo usuário: "Quantidade em Estoque"
  const idxQtd = findBestCol(headers, ['quantidade em estoque', 'quantidade', 'estoque', 'saldo', 'atual', 'qtd', 'estoque atual', 'balanço', 'balanço atual']);
  
  const idxValUnit = findBestCol(headers, ['valor unitario', 'unitario', 'vlr unit', 'custo', 'preco', 'preço', 'valor', 'vlr', 'unitário', 'vlr. unit.']);
  const idxMin = findBestCol(headers, ['minimo', 'minim', 'reserva', 'estoque minimo']);
  const idxLoc = findBestCol(headers, ['localizacao', 'local', 'posicao', 'endereco']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'ativo', 'equips']);

  return rows.slice(headerIdx + 1).map((row) => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return null;
    
    const qAtual = parseNumber(row[idxQtd]);
    const vUnit = parseNumber(row[idxValUnit]);

    return {
        id: codigo,
        codigo,
        descricao: idxDesc !== -1 ? row[idxDesc] : '',
        quantidadeAtual: qAtual,
        quantidadeMinima: idxMin !== -1 ? parseNumber(row[idxMin]) : 0,
        unidade: (row[findBestCol(headers, ['unidade', 'unid', 'und', 'medida'])] || 'un'),
        localizacao: idxLoc !== -1 ? row[idxLoc] : '',
        equipamento: idxEquip !== -1 ? row[idxEquip] : '',
        valorUnitario: vUnit,
        valorTotal: (qAtual * vUnit),
        entradas: 0,
        saidas: 0,
        categoria: 'Geral',
        fornecedor: '',
        dataAtualizacao: new Date().toISOString()
    } as InventoryItem;
  }).filter((i): i is InventoryItem => i !== null);
};

export const fetchServiceOrders = async (url: string): Promise<ServiceOrder[]> => {
    const rows = await fetchCSV(url);
    if (rows.length === 0) return [];
    
    const { index: headerIdx, headers } = findHeaderRow(rows, ['abertura', 'os', 'profissional', 'equipamento']);
    if (headerIdx === -1) return [];

    const idxNum = findBestCol(headers, ['os', 'numero', 'ordem']);
    const idxAbertura = findBestCol(headers, ['abertura', 'data']);
    const idxInicio = findBestCol(headers, ['inicio', 'data inicio', 'atendimento']);
    const idxFim = findBestCol(headers, ['fim', 'conclusao', 'data fim']);
    const idxProf = findBestCol(headers, ['profissional', 'tecnico', 'responsavel']);
    const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'ativo']);
    const idxSetor = findBestCol(headers, ['setor', 'area']);
    const idxHoras = findBestCol(headers, ['horas', 'tempo', 'duracao']);
    const idxParada = findBestCol(headers, ['parada', 'maquina parada']);
    const idxPeca = findBestCol(headers, ['peca', 'itens', 'materiais']);
    const idxMotivo = findBestCol(headers, ['motivo', 'falha', 'problema']);
    
    return rows.slice(headerIdx + 1).map((row, i): ServiceOrder | null => {
        if (!row[idxAbertura] && !row[idxNum]) return null;
        
        return {
            id: `os-${i}`,
            numero: idxNum !== -1 ? row[idxNum] : `OS-${i}`,
            dataAbertura: parseDate(row[idxAbertura]) || new Date(),
            dataInicio: idxInicio !== -1 ? parseDate(row[idxInicio]) || undefined : undefined,
            dataFim: idxFim !== -1 ? parseDate(row[idxFim]) || undefined : undefined,
            professional: idxProf !== -1 ? row[idxProf] : 'Não Atribuído',
            equipamento: idxEquip !== -1 ? row[idxEquip] : 'Geral',
            setor: idxSetor !== -1 ? row[idxSetor] : 'Outros',
            status: 'Concluído',
            horas: idxHoras !== -1 ? parseNumber(row[idxHoras]) : 0,
            parada: idxParada !== -1 ? row[idxParada] : undefined,
            peca: idxPeca !== -1 ? row[idxPeca] : undefined,
            motivo: idxMotivo !== -1 ? row[idxMotivo] : undefined,
            descricao: ''
        };
    }).filter(os => os !== null) as ServiceOrder[];
};

export const fetchCentralData = async (url: string): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  
  const keywords = [
    'material', 'item', 'solicitante', 'responsavel', 'data', 'dia', 
    'quantidade', 'saida', 'perfil', 'etapa', 'codigo', 'cod', 'descricao', 'motivo', 'cor', 'turno'
  ];

  const { index: headerIdx, headers } = findHeaderRow(rows, keywords);
  if (headerIdx === -1) return [];

  const idxData = findBestCol(headers, ['data', 'dia', 'data saida', 'registro', 'data entrada']);
  const idxDesc = findBestCol(headers, ['etapa', 'material', 'descricao', 'item', 'produto', 'codigo', 'cod']);
  const idxQtd = findBestCol(headers, ['quantidade', 'qtd', 'qtde', 'quant', 'saida', 'volume']);
  const idxResp = findBestCol(headers, ['solicitante', 'responsavel', 'pessoa que liberou', 'quem', 'funcionario']);
  const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento']);
  const idxPerfil = findBestCol(headers, ['perfil']); 
  const idxMotivo = findBestCol(headers, ['motivo', 'razao', 'causa', 'justificativa']);
  const idxCor = findBestCol(headers, ['cor', 'coloracao', 'pintura']);
  const idxTurno = findBestCol(headers, ['turno', 'periodo', 'horario']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const materialKey = idxDesc !== -1 ? row[idxDesc] : '';
    if (!materialKey && idxPerfil === -1) return null;
    
    const qtd = parseNumber(row[idxQtd]);
    const dataMov = idxData !== -1 ? parseDate(row[idxData]) : new Date();

    return {
      id: `central-${i}-${Date.now()}`,
      data: dataMov || new Date(),
      codigo: formatCodigo(materialKey || (idxPerfil !== -1 ? row[idxPerfil] : '')),
      quantidade: qtd,
      tipo: 'saida',
      responsavel: idxResp !== -1 ? row[idxResp] : 'N/D',
      setor: idxSetor !== -1 ? row[idxSetor] : 'Outros',
      perfil: idxPerfil !== -1 ? row[idxPerfil] : (materialKey || 'Não especificado'),
      motivo: idxMotivo !== -1 ? row[idxMotivo] : undefined,
      cor: idxCor !== -1 ? row[idxCor] : 'N/D',
      turno: idxTurno !== -1 ? row[idxTurno] : undefined
    } as Movement;
  }).filter(x => x !== null && x.quantidade > 0) as Movement[];
};
