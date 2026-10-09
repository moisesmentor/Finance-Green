// Utilitário de integração com a API da Pluggy (Open Finance)
// Todas as chamadas autenticadas com CLIENT_ID e CLIENT_SECRET acontecem exclusivamente aqui no servidor

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

let cachedApiKey: string | null = null;
let apiKeyExpiresAt: number = 0;

/**
 * Localiza de forma flexível as credenciais da Pluggy em process.env,
 * aceitando variações de nomenclatura e maiúsculas/minúsculas.
 */
export function getPluggyCredentials() {
  const env = process.env;
  const allKeys = Object.keys(env);

  const findValue = (candidates: string[]) => {
    for (const cand of candidates) {
      if (env[cand]) return { key: cand, val: env[cand] };
      const lower = cand.toLowerCase();
      const match = allKeys.find(k => k.toLowerCase() === lower);
      if (match && env[match]) return { key: match, val: env[match] };
    }
    return null;
  };

  const clientIdCandidate = findValue([
    'PLUGGY_CLIENT_ID',
    'VITE_PLUGGY_CLIENT_ID',
    'PLUGGY_CLIENTID',
    'PLUGGY_ID',
    'PLUGGY_CLIENT',
    'CLIENT_ID',
    'PLUGGY_KEY',
    'PLUGGY_CLIENT_ID_PROD'
  ]);

  const clientSecretCandidate = findValue([
    'PLUGGY_CLIENT_SECRET',
    'VITE_PLUGGY_CLIENT_SECRET',
    'PLUGGY_CLIENTSECRET',
    'PLUGGY_SECRET',
    'CLIENT_SECRET',
    'PLUGGY_SECRET_KEY',
    'PLUGGY_CLIENT_SECRET_PROD'
  ]);

  const rawClientId = clientIdCandidate?.val;
  const rawClientSecret = clientSecretCandidate?.val;

  const clientId = rawClientId?.trim().replace(/^["']|["']$/g, '');
  const clientSecret = rawClientSecret?.trim().replace(/^["']|["']$/g, '');

  const pluggyRelatedKeys = allKeys.filter(k => 
    k.toUpperCase().includes('PLUGGY') || 
    (!k.startsWith('npm_') && (k.toUpperCase().includes('CLIENT') || k.toUpperCase().includes('SECRET')))
  );

  return {
    clientId,
    clientSecret,
    clientIdKey: clientIdCandidate?.key,
    clientSecretKey: clientSecretCandidate?.key,
    pluggyRelatedKeys,
    vercelEnv: env.VERCEL_ENV,
  };
}

/**
 * Obtém a chave de API temporária da Pluggy (POST /auth)
 * Cacheada em memória por 1h45 (duração de 2h na Pluggy)
 */
export async function getPluggyApiKey(): Promise<string> {
  const creds = getPluggyCredentials();
  const { clientId, clientSecret, pluggyRelatedKeys, vercelEnv } = creds;

  if (!clientId || !clientSecret) {
    const envInfo = vercelEnv ? ` (Ambiente Vercel detectado: ${vercelEnv})` : '';
    const detectedStr = pluggyRelatedKeys.length > 0
      ? `Variáveis detectadas em process.env: [${pluggyRelatedKeys.join(', ')}].`
      : 'Nenhuma variável contendo PLUGGY/CLIENT/SECRET foi encontrada em process.env.';

    throw new Error(
      `Credenciais da Pluggy não encontradas no servidor${envInfo}. ${detectedStr} Certifique-se de salvar PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET em Vercel > Settings > Environment Variables com as 3 opções (Production, Preview, Development) marcadas, e depois faça um Redeploy na aba Deployments.`
    );
  }

  // Reutiliza se faltarem mais de 10 minutos para expirar
  if (cachedApiKey && Date.now() < apiKeyExpiresAt - 10 * 60 * 1000) {
    return cachedApiKey;
  }


  const response = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha de autenticação na Pluggy (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  cachedApiKey = data.apiKey;
  // Expira em 2 horas
  apiKeyExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
  return cachedApiKey!;
}

/**
 * Cria um Connect Token para inicializar o Widget Pluggy Connect no frontend
 * (POST /connect_token)
 */
export async function createConnectToken(clientUserId?: string, itemId?: string): Promise<string> {
  const apiKey = await getPluggyApiKey();

  const payload: any = {
    options: {},
  };

  if (clientUserId) {
    payload.options.clientUserId = clientUserId;
  }

  if (itemId) {
    payload.itemId = itemId;
  }

  const response = await fetch(`${PLUGGY_BASE_URL}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao gerar Connect Token na Pluggy (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.accessToken;
}

/**
 * Lista todos os items (conexões bancárias) associados à aplicação / usuário
 * (GET /items)
 */
export async function listPluggyItems(clientUserId?: string): Promise<any[]> {
  const apiKey = await getPluggyApiKey();

  let url = `${PLUGGY_BASE_URL}/items`;
  if (clientUserId) {
    url += `?clientUserId=${encodeURIComponent(clientUserId)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao listar conexões na Pluggy (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  // A API da Pluggy pode retornar { results: [...] } ou array direto
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Obtém os detalhes de um Item específico (conexão bancária) por ID
 * (GET /items/{id})
 */
export async function getPluggyItem(itemId: string): Promise<any> {
  const apiKey = await getPluggyApiKey();

  const response = await fetch(`${PLUGGY_BASE_URL}/items/${encodeURIComponent(itemId)}`, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao obter item ${itemId} na Pluggy (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

/**
 * Remove uma conexão bancária na Pluggy
 * (DELETE /items/{id})
 */
export async function deletePluggyItem(itemId: string): Promise<{ success: boolean }> {
  const apiKey = await getPluggyApiKey();

  const response = await fetch(`${PLUGGY_BASE_URL}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: {
      'X-API-KEY': apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.text();
    throw new Error(`Erro ao excluir item ${itemId} na Pluggy (${response.status}): ${errorBody}`);
  }

  return { success: true };
}
