import { Transaction, TransactionType, PaymentMethod, Category } from '../types';

export interface ParsedBankTransaction {
  id: string; // ID temporário para o fluxo de revisão
  rawId?: string; // FITID do OFX ou ID do banco
  date: string; // YYYY-MM-DD
  description: string;
  originalDescription: string;
  amount: number; // Sempre positivo para consistência
  type: TransactionType; // 'expense' | 'income'
  paymentMethod: PaymentMethod;
  categoryId: string;
  selected: boolean;
  isDuplicate?: boolean;
  isInvoicePayment?: boolean;
  bankName?: string;
  notes?: string;
}

export interface BankParseResult {
  transactions: ParsedBankTransaction[];
  bankName?: string;
  format: 'ofx' | 'csv' | 'unknown';
  totalFound: number;
  duplicateCount: number;
  invoicePaymentCount: number;
  totalIncome: number;
  totalExpense: number;
}

/* =========================================================================
   1. MAPA INTELIGENTE DE CATEGORIZAÇÃO BRASILEIRA
   ========================================================================= */

interface KeywordCategoryMap {
  categoryId: string;
  keywords: string[];
}

const DEFAULT_CATEGORY_KEYWORDS: KeywordCategoryMap[] = [
  {
    categoryId: 'lazer', // Lazer & Restaurantes
    keywords: [
      'ifood', 'ubereats', 'rappi', 'mcdonald', 'mc donald', 'burger king', 'bk', 'subway',
      'habib', 'outback', 'restaurante', 'lanchonete', 'bar', 'chopp', 'cervejaria',
      'pizzaria', 'pizza', 'hamburguer', 'sushi', 'churrascaria', 'sorveteria', 'acai'
    ],
  },
  {
    categoryId: 'alimentacao', // Alimentação & Mercado
    keywords: [
      'supermercado', 'mercado', 'carrefour', 'pao de acucar', 'extra', 'assai', 'atacadao',
      'sams club', 'atacadista', 'hortifruti', 'sacolao', 'oxxo', 'dia brasil', 'st marche',
      'padaria', 'panificadora', 'cafe', 'cafeteria', 'starbucks', 'acougue', 'mercearia'
    ],
  },
  {
    categoryId: 'transporte', // Transporte & Combustível
    keywords: [
      'uber', '99app', '99pop', '99 taxi', 'taxi', 'combustivel', 'posto', 'ipiranga',
      'shell', 'petrobras', 'auto posto', 'estacionamento', 'estapar', 'pedagio', 'sem parar',
      'veloe', 'conectcar', 'bilhete unico', 'metro', 'cptm', 'onibus', 'tarifa transporte',
      'aluguel de carro', 'localiza', 'movida', 'unidas'
    ],
  },
  {
    categoryId: 'saude', // Saúde & Farmácia
    keywords: [
      'farmacia', 'drogaria', 'drogasil', 'droga raia', 'raia drogasil', 'pague menos',
      'drogaria sao paulo', 'panvel', 'hospital', 'clinica', 'medico', 'dentista', 'odont',
      'consulta', 'laboratorio', 'fleury', 'lavoisier', 'dasa', 'otica', 'psicolog',
      'fisioterapia', 'exames', 'plano de saude', 'unimed', 'notredame', 'amil'
    ],
  },
  {
    categoryId: 'moradia', // Moradia & Contas
    keywords: [
      'enel', 'cpfl', 'eletropaulo', 'cemig', 'copel', 'sabesp', 'sanepar', 'copasa',
      'compesa', 'energia', 'agua e esgoto', 'aluguel', 'condominio', 'quintoandar',
      'imobiliaria', 'gas natural', 'comgas', 'supergasbras', 'iptu'
    ],
  },
  {
    categoryId: 'servicos', // Serviços & Assinaturas
    keywords: [
      'netflix', 'spotify', 'amazon prime', 'prime video', 'apple.com', 'apple bill',
      'itunes', 'google storage', 'google play', 'youtube', 'hbo max', 'max.com',
      'disney', 'star plus', 'globoplay', 'deezer', 'openai', 'chatgpt', 'claude.ai',
      'canva', 'adobe', 'vivo', 'claro', 'tim', 'oi fibra', 'telefonia', 'internet',
      'banda larga', 'amazon aws', 'github', 'notion'
    ],
  },
  {
    categoryId: 'compras', // Compras & Vestuário
    keywords: [
      'shopping', 'lojas renner', 'renner', 'c&a', 'riachuelo', 'zara', 'centauro',
      'decathlon', 'shein', 'shopee', 'mercado livre', 'mercadolivre', 'amazon brasil',
      'magalu', 'magazine luiza', 'casas bahia', 'kabum', 'ponto frio', 'fast shop',
      'cinema', 'cinemark', 'cinepolis', 'ingresso.com', 'sympla', 'show', 'teatro',
      'boticario', 'natura', 'sephora', 'polishop', 'livraria', 'saraiva'
    ],
  },
  {
    categoryId: 'educacao', // Educação & Cursos
    keywords: [
      'escola', 'colegio', 'faculdade', 'universidade', 'pos graduacao', 'udemy',
      'hotmart', 'alura', 'coursera', 'edx', 'curso', 'idiomas', 'cultura inglesa',
      'wizard', 'cna', 'livros', 'apostila', 'matricula', 'mensalidade escolar'
    ],
  },
  {
    categoryId: 'pets', // Pets
    keywords: [
      'petz', 'cobasi', 'pet shop', 'veterinario', 'vet', 'petlove', 'banho e tosa',
      'racao', 'clinica veterinaria', 'hospital veterinario'
    ],
  },
  {
    categoryId: 'salario', // Salário Principal
    keywords: [
      'salario', 'proventos', 'folha de pagamento', 'remuneracao', 'rendimento',
      'adiantamento salarial', '13 salario', 'ferias', 'bonus', 'plr', 'reembolso',
      'dividendos', 'jcp'
    ],
  },
];

/**
 * Sugere a melhor categoria para uma transação com base na descrição e tipo
 */
export function suggestCategory(
  description: string,
  type: TransactionType,
  availableCategories: Category[]
): string {
  const normalized = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Se for receita e contiver palavras de salário/renda
  if (type === 'income') {
    for (const kw of ['salario', 'remuneracao', 'folha', 'proventos', 'dividendos', 'rendimento']) {
      if (normalized.includes(kw)) {
        const salaryCat = availableCategories.find(c => c.id === 'salary' || c.name.toLowerCase().includes('salário'));
        if (salaryCat) return salaryCat.id;
      }
    }
    // Categoria padrão de receita
    const defaultIncome = availableCategories.find(c => c.type === 'income' || c.type === 'both');
    if (defaultIncome) return defaultIncome.id;
  }

  // 2. Busca pelas palavras-chave cadastradas
  for (const mapping of DEFAULT_CATEGORY_KEYWORDS) {
    for (const kw of mapping.keywords) {
      if (normalized.includes(kw)) {
        const cat = availableCategories.find(c => c.id === mapping.categoryId || c.name.toLowerCase().includes(kw));
        if (cat) return cat.id;
      }
    }
  }

  // 3. Fallback: categoria Outros Gastos ou primeira categoria de despesa
  const otherExpense = availableCategories.find(c => c.id === 'other_expense' || c.name.toLowerCase().includes('outros'));
  if (otherExpense) return otherExpense.id;

  const firstValid = availableCategories.find(c => c.type === type || c.type === 'both');
  return firstValid?.id || 'other_expense';
}

/* =========================================================================
   2. DETECTOR DE PAGAMENTO DE FATURA (DEDUPLICAÇÃO DE CONTAS)
   ========================================================================= */

export function isInvoicePaymentDescription(description: string): boolean {
  const norm = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (
    norm.includes('pagamento de fatura') ||
    norm.includes('pgto fatura') ||
    norm.includes('pagto fatura') ||
    norm.includes('pagamento fatura') ||
    norm.includes('fatura cartao') ||
    norm.includes('pagamento recebido') || // fatura Nubank
    norm.includes('deb.aut.fatura') ||
    norm.includes('deb aut cartao')
  );
}

/* =========================================================================
   3. DETECTOR DE BANCO
   ========================================================================= */

export function detectBankFromText(content: string, fileName?: string): string | undefined {
  const combined = `${fileName || ''} ${content.slice(0, 2000)}`.toLowerCase();

  if (combined.includes('nubank') || combined.includes('nu pagamentos') || combined.includes('nu financeira')) {
    return 'Nubank';
  }
  if (combined.includes('santander') || combined.includes('banco santander')) {
    return 'Santander';
  }
  if (combined.includes('itau') || combined.includes('itaú') || combined.includes('itaucard')) {
    return 'Itaú';
  }
  if (combined.includes('bradesco') || combined.includes('bradescard')) {
    return 'Bradesco';
  }
  if (combined.includes('inter') || combined.includes('banco inter')) {
    return 'Banco Inter';
  }
  if (combined.includes('c6') || combined.includes('c6 bank')) {
    return 'C6 Bank';
  }
  if (combined.includes('caixa') || combined.includes('cef')) {
    return 'Caixa Econômica';
  }
  if (combined.includes('banco do brasil') || combined.includes('bb')) {
    return 'Banco do Brasil';
  }

  return undefined;
}

/* =========================================================================
   4. PARSER DE ARQUIVOS OFX (SGML & XML)
   ========================================================================= */

export function parseOFX(
  content: string,
  fileName: string = '',
  availableCategories: Category[],
  existingTransactions: Transaction[] = []
): BankParseResult {
  const bankName = detectBankFromText(content, fileName);
  const isCreditCardOFX = content.includes('<CCSTMTTRN>') || content.includes('<CREDITCARDMSGSRSV1>') || content.includes('<CCSTMTRS>');

  // Extrai blocos de transações (<STMTTRN>...</STMTTRN> ou <CCSTMTTRN>...</CCSTMTTRN>)
  // OFX SGML frequentemente não possui tags de fechamento </STMTTRN>, então dividimos por tag de abertura
  const rawBlocks = content.split(/<(?:STMTTRN|CCSTMTTRN)>/i);
  // O primeiro elemento é o header do arquivo, descartamos
  const transactionBlocks = rawBlocks.slice(1);

  const transactions: ParsedBankTransaction[] = [];

  for (const block of transactionBlocks) {
    // Regex segura para tags SGML que capturam até o próximo '<' ou quebra de linha
    const getTag = (tagName: string): string => {
      const match = block.match(new RegExp(`<${tagName}>([^<\r\n]+)`, 'i'));
      return match ? match[1].trim() : '';
    };

    const trnType = getTag('TRNTYPE').toUpperCase();
    const dtPostedRaw = getTag('DTPOSTED');
    const trnAmtRaw = getTag('TRNAMT');
    const fitId = getTag('FITID');
    const name = getTag('NAME');
    const memo = getTag('MEMO');

    if (!dtPostedRaw || !trnAmtRaw) continue;

    // Formata Data: YYYYMMDD... -> YYYY-MM-DD
    const dateMatch = dtPostedRaw.match(/(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) continue;
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

    // Formata Valor (suporta negativo e positivo)
    const amountVal = parseFloat(trnAmtRaw.replace(',', '.'));
    if (isNaN(amountVal) || amountVal === 0) continue;

    // Determina descrição: prefere MEMO, senão NAME
    let description = memo || name || 'Transação Bancária';
    // Remove códigos comuns e espaços extras
    description = description.replace(/\s+/g, ' ').trim();

    // Determina tipo (Despesa vs Receita)
    // No padrão OFX: valores negativos (< 0) representam débitos/saídas; positivos (> 0) representam créditos/entradas
    let type: TransactionType = amountVal < 0 ? 'expense' : 'income';
    let absAmount = Math.abs(amountVal);

    // Método de pagamento sugerido
    const paymentMethod: PaymentMethod = isCreditCardOFX ? 'credit_card' : 'debit_card';

    // Checa se é pagamento de fatura
    const isInvoice = isInvoicePaymentDescription(description);

    // Sugere Categoria
    const categoryId = suggestCategory(description, type, availableCategories);

    const tempId = `imp-${date}-${fitId || Math.random().toString(36).substr(2, 9)}`;

    transactions.push({
      id: tempId,
      rawId: fitId || undefined,
      date,
      description,
      originalDescription: description,
      amount: absAmount,
      type,
      paymentMethod,
      categoryId,
      selected: !isInvoice, // Fatura vem desmarcada por padrão
      isInvoicePayment: isInvoice,
      bankName: bankName || (isCreditCardOFX ? 'Cartão de Crédito' : 'Extrato Bancário'),
      notes: fitId ? `Importado via OFX (FITID: ${fitId})` : 'Importado via OFX',
    });
  }

  // Verifica duplicatas contra transações existentes no app
  applyDuplicateDetection(transactions, existingTransactions);

  return buildParseResult(transactions, bankName, 'ofx');
}

/* =========================================================================
   5. PARSER DE ARQUIVOS CSV (NUBANK, SANTANDER E GENÉRICOS)
   ========================================================================= */

export function parseCSV(
  content: string,
  fileName: string = '',
  availableCategories: Category[],
  existingTransactions: Transaction[] = []
): BankParseResult {
  const bankName = detectBankFromText(content, fileName);
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) {
    return buildParseResult([], bankName, 'csv');
  }

  // Detecta delimitador (, ; ou \t) analisando as primeiras 5 linhas
  const sample = lines.slice(0, Math.min(5, lines.length)).join('\n');
  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  // Divide linha em colunas respeitando aspas
  const splitLine = (line: string): string[] => {
    const pattern = new RegExp(
      `(?:^|${delimiter === '\t' ? '\\t' : delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter === '\t' ? '\\t' : delimiter}]*))`,
      'g'
    );
    const result: string[] = [];
    let match;
    while ((match = pattern.exec(line)) !== null) {
      let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      result.push(val ? val.trim() : '');
      if (pattern.lastIndex >= line.length) break;
    }
    return result;
  };

  const header = splitLine(lines[0]).map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  // Encontra índices das colunas
  let dateIdx = header.findIndex(h => h === 'date' || h === 'data' || h.startsWith('data'));
  let titleIdx = header.findIndex(h => 
    h === 'title' || h === 'titulo' || h === 'descricao' || h === 'description' || 
    h === 'estabelecimento' || h === 'historico' || h === 'memo' || h === 'lancamento'
  );
  let amountIdx = header.findIndex(h => h === 'amount' || h === 'valor' || h === 'quantia');
  let categoryIdx = header.findIndex(h => h === 'category' || h === 'categoria');

  // Fallback posicional se os headers forem atípicos
  if (dateIdx === -1) dateIdx = 0;
  if (titleIdx === -1) titleIdx = 1;
  if (amountIdx === -1) amountIdx = header.length > 2 ? 2 : 1;

  const isNubankCardCSV = (header.includes('category') || header.includes('title')) && (bankName === 'Nubank' || fileName.toLowerCase().includes('nubank'));

  const transactions: ParsedBankTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx] || '';
    const rawTitle = cols[titleIdx] || '';
    const rawAmount = cols[amountIdx] || '';
    const rawCat = categoryIdx !== -1 ? cols[categoryIdx] : '';

    if (!rawDate || !rawAmount) continue;

    // Normalização de Data (DD/MM/YYYY ou YYYY-MM-DD)
    let date = '';
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY -> YYYY-MM-DD
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD -> YYYY-MM-DD
          date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    } else if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          date = rawDate; // Já está YYYY-MM-DD
        } else if (parts[2].length === 4) {
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    if (!date) continue;

    // Normalização de Valor
    // Trata moedas brasileiras: "1.234,56" ou "-45,50" ou "1234.56"
    let cleanAmountStr = rawAmount
      .replace(/R\$/gi, '')
      .replace(/\s/g, '');

    let isNegative = cleanAmountStr.startsWith('-') || cleanAmountStr.endsWith('D') || cleanAmountStr.includes('-');
    let isPositive = cleanAmountStr.startsWith('+') || cleanAmountStr.endsWith('C');

    cleanAmountStr = cleanAmountStr.replace(/[+\-DC]/gi, '').trim();

    // Se tiver vírgula, converte formato brasileiro para numérico JS
    if (cleanAmountStr.includes(',')) {
      cleanAmountStr = cleanAmountStr.replace(/\./g, '').replace(',', '.');
    }

    const parsedNum = parseFloat(cleanAmountStr);
    if (isNaN(parsedNum) || parsedNum === 0) continue;

    let absAmount = Math.abs(parsedNum);
    let type: TransactionType = 'expense';

    // Regras específicas do Nubank Cartão: compras vêm positivas, pagamentos de fatura vêm negativos
    if (isNubankCardCSV) {
      if (isNegative) {
        type = 'income'; // Estorno ou Pagamento de fatura
      } else {
        type = 'expense'; // Compra normal
      }
    } else {
      // Extrato padrão de conta bancária: negativo = despesa, positivo = receita
      if (isPositive) type = 'income';
      else if (isNegative) type = 'expense';
      else type = parsedNum < 0 ? 'expense' : 'income';
    }

    const description = rawTitle.replace(/\s+/g, ' ').trim() || 'Lançamento';
    const isInvoice = isInvoicePaymentDescription(description);

    // Sugere Categoria (tenta usar categoria do arquivo se existir)
    let suggestedCatId = suggestCategory(description, type, availableCategories);
    if (rawCat) {
      const matchingCat = availableCategories.find(c => 
        c.name.toLowerCase() === rawCat.toLowerCase() ||
        c.id.toLowerCase() === rawCat.toLowerCase()
      );
      if (matchingCat) suggestedCatId = matchingCat.id;
    }

    const paymentMethod: PaymentMethod = isNubankCardCSV || fileName.toLowerCase().includes('cartao')
      ? 'credit_card'
      : 'debit_card';

    const tempId = `imp-csv-${date}-${Math.random().toString(36).substr(2, 9)}`;

    transactions.push({
      id: tempId,
      date,
      description,
      originalDescription: description,
      amount: absAmount,
      type,
      paymentMethod,
      categoryId: suggestedCatId,
      selected: !isInvoice,
      isInvoicePayment: isInvoice,
      bankName: bankName || 'Extrato CSV',
      notes: 'Importado via CSV',
    });
  }

  // Verifica duplicatas contra transações existentes no app
  applyDuplicateDetection(transactions, existingTransactions);

  return buildParseResult(transactions, bankName, 'csv');
}

/* =========================================================================
   6. DEDUPLICAÇÃO INTELIGENTE
   ========================================================================= */

export function applyDuplicateDetection(
  parsed: ParsedBankTransaction[],
  existing: Transaction[]
) {
  if (!existing || existing.length === 0) return;

  for (const item of parsed) {
    // Normaliza descrição
    const normItemDesc = item.description.toLowerCase().replace(/[^a-z0-9]/g, '');

    const foundMatch = existing.find(ex => {
      // Mesma data
      if (ex.date !== item.date) return false;
      // Mesmo tipo (despesa vs receita)
      if (ex.type !== item.type) return false;
      // Mesmo valor com tolerância de 1 centavo
      if (Math.abs(ex.amount - item.amount) > 0.01) return false;

      // Descrição idêntica ou contida
      const normExDesc = ex.description.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normItemDesc.includes(normExDesc) || normExDesc.includes(normItemDesc)) {
        return true;
      }
      return false;
    });

    if (foundMatch) {
      item.isDuplicate = true;
      item.selected = false; // Duplicatas vêm desmarcadas por segurança
    }
  }
}

/* =========================================================================
   7. DETECTOR AUTOMÁTICO DE FORMATO (OFX OU CSV)
   ========================================================================= */

export function parseBankFile(
  content: string,
  fileName: string = '',
  availableCategories: Category[],
  existingTransactions: Transaction[] = []
): BankParseResult {
  const trimmed = content.trim();

  // Verifica se é OFX
  if (
    trimmed.startsWith('OFXHEADER') || 
    trimmed.includes('<OFX>') || 
    trimmed.includes('<STMTTRN>') || 
    trimmed.includes('<CCSTMTTRN>') ||
    fileName.toLowerCase().endsWith('.ofx')
  ) {
    return parseOFX(content, fileName, availableCategories, existingTransactions);
  }

  // Caso padrão: processa como CSV
  return parseCSV(content, fileName, availableCategories, existingTransactions);
}

function buildParseResult(
  transactions: ParsedBankTransaction[],
  bankName?: string,
  format: 'ofx' | 'csv' | 'unknown' = 'unknown'
): BankParseResult {
  let totalIncome = 0;
  let totalExpense = 0;
  let duplicateCount = 0;
  let invoicePaymentCount = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;

    if (tx.isDuplicate) duplicateCount++;
    if (tx.isInvoicePayment) invoicePaymentCount++;
  }

  return {
    transactions,
    bankName,
    format,
    totalFound: transactions.length,
    duplicateCount,
    invoicePaymentCount,
    totalIncome,
    totalExpense,
  };
}
