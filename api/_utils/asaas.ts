/**
 * Utilitário compartilhado de comunicação com a API v3 do Asaas (Serverless / Node.js)
 * Documentação oficial: https://docs.asaas.com/reference
 */

export type PaidPlanTier = 'basic' | 'pro';

export const ASAAS_PLAN_CONFIG: Record<
  PaidPlanTier,
  {
    name: string;
    value: number;
    description: string;
  }
> = {
  basic: {
    name: 'Basic',
    value: 19.9,
    description: 'Assinatura Mensal - Green Finance Basic',
  },
  pro: {
    name: 'Pro',
    value: 29.9,
    description: 'Assinatura Mensal - Green Finance Pro',
  },
};

export function getAsaasBaseUrl(): string {
  const env = (process.env.ASAAS_ENVIRONMENT || 'sandbox').trim().toLowerCase();
  if (env === 'production' || env === 'prod') {
    return 'https://api.asaas.com/v3';
  }
  return 'https://sandbox.asaas.com/api/v3';
}

export function getAsaasApiKey(): string {
  const key = process.env.ASAAS_API_KEY?.trim();
  if (!key) {
    throw new Error('Variável de ambiente ASAAS_API_KEY não configurada no servidor.');
  }
  return key;
}

/**
 * Executa uma chamada HTTP autenticada para a API v3 do Asaas
 * Nunca registra chaves de API ou dados sensíveis em logs.
 */
export async function asaasRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, any>;
  } = {}
): Promise<T> {
  const baseUrl = getAsaasBaseUrl();
  const apiKey = getAsaasApiKey();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      access_token: apiKey,
      'User-Agent': 'GreenFinancePro/1.0',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawText = await response.text();
  let parsed: any = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { raw: rawText };
    }
  }

  if (!response.ok) {
    const firstErrorDesc =
      parsed?.errors && Array.isArray(parsed.errors) && parsed.errors[0]?.description
        ? String(parsed.errors[0].description)
        : `Erro na comunicação com o gateway de pagamento (HTTP ${response.status}).`;
    const err = new Error(firstErrorDesc) as Error & { statusCode?: number };
    err.statusCode = response.status;
    throw err;
  }

  return parsed as T;
}

/**
 * Remove caracteres não numéricos de CPF ou CNPJ
 */
export function sanitizeCpfCnpj(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

/**
 * Validação matemática oficial de CPF (11 dígitos) ou CNPJ (14 dígitos)
 */
export function isValidCpfCnpj(raw: string): boolean {
  const digits = sanitizeCpfCnpj(raw);

  if (digits.length === 11) {
    // Rejeita sequências repetidas (ex: 111.111.111-11)
    if (/^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits.charAt(i), 10) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(digits.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits.charAt(i), 10) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    return rev === parseInt(digits.charAt(10), 10);
  }

  if (digits.length === 14) {
    if (/^(\d)\1{13}$/.test(digits)) return false;

    const calcCnpjDigit = (base: string, weights: number[]) => {
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += parseInt(base.charAt(i), 10) * weights[i];
      }
      const rem = sum % 11;
      return rem < 2 ? 0 : 11 - rem;
    };

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const d1 = calcCnpjDigit(digits, weights1);
    if (d1 !== parseInt(digits.charAt(12), 10)) return false;

    const d2 = calcCnpjDigit(digits, weights2);
    return d2 === parseInt(digits.charAt(13), 10);
  }

  return false;
}

/**
 * Formata data YYYY-MM-DD no fuso de Brasília (America/Sao_Paulo)
 */
export function getTodayDateStrBrazil(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}
