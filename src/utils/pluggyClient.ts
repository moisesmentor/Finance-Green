// Cliente frontend para comunicação com os endpoints serverless da Pluggy (/api/pluggy/*)
// Todas as credenciais secretas residem exclusivamente no servidor.

import { getCurrentUserToken } from './firebase';

const PLUGGY_WIDGET_CDN_URL = 'https://cdn.pluggy.ai/pluggy-connect/v2.5.0/pluggy-connect.js';

declare global {
  interface Window {
    PluggyConnect?: any;
  }
}

/**
 * Monta cabeçalhos autenticados com o token JWT do Firebase Auth
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getCurrentUserToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Carrega dinamicamente o script do widget Pluggy Connect via CDN oficial
 */
export function loadPluggyConnectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    if (window.PluggyConnect) {
      return resolve();
    }

    const existingScript = document.querySelector(`script[src="${PLUGGY_WIDGET_CDN_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = PLUGGY_WIDGET_CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error('Falha ao carregar o script do widget da Pluggy. Verifique sua conexão.'));
    document.head.appendChild(script);
  });
}

/**
 * Solicita um Connect Token temporário ao servidor (/api/pluggy/connect-token)
 */
export async function fetchPluggyConnectToken(itemId?: string): Promise<string> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/pluggy/connect-token', {
    method: 'POST',
    headers,
    body: JSON.stringify(itemId ? { itemId } : {}),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao gerar token de conexão com a Pluggy.');
  }

  return data.connectToken;
}

/**
 * Lista as conexões existentes na aplicação Pluggy (/api/pluggy/items)
 */
export async function fetchExistingPluggyItems(): Promise<any[]> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/pluggy/items', {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao consultar conexões na Pluggy.');
  }

  return data.items || [];
}

/**
 * Consulta os detalhes de um item específico na Pluggy (/api/pluggy/item-details)
 */
export async function fetchPluggyItemDetails(itemId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/pluggy/item-details?id=${encodeURIComponent(itemId)}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erro ao consultar detalhes da conexão ${itemId}.`);
  }

  return data.item;
}

/**
 * Desconecta/Exclui um item na Pluggy (/api/pluggy/delete-item)
 */
export async function requestDeletePluggyItem(itemId: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/pluggy/delete-item', {
    method: 'POST',
    headers,
    body: JSON.stringify({ itemId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erro ao excluir conexão ${itemId} na Pluggy.`);
  }

  return true;
}

/**
 * Abre o widget oficial da Pluggy dentro do app
 */
export async function openPluggyConnectWidget(options: {
  connectToken: string;
  onSuccess: (itemData: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
  updateItem?: string;
  includeSandbox?: boolean;
}): Promise<void> {
  await loadPluggyConnectScript();

  if (!window.PluggyConnect) {
    throw new Error('Widget da Pluggy não pôde ser inicializado.');
  }

  const widgetConfig: any = {
    connectToken: options.connectToken,
    onSuccess: options.onSuccess,
    onError: options.onError || ((err: any) => console.error('Pluggy Connect Error:', err)),
    onClose: options.onClose || (() => {}),
  };

  if (options.updateItem) {
    widgetConfig.updateItem = options.updateItem;
  }

  if (options.includeSandbox) {
    widgetConfig.includeSandbox = true;
  }

  const pluggyConnect = new window.PluggyConnect(widgetConfig);
  pluggyConnect.init();
}
