// Serverless Function: GET /api/pluggy/items
// Lista as conexões bancárias existentes na aplicação Pluggy

import { verifyFirebaseUser } from '../_utils/auth.js';
import { listPluggyItems } from '../_utils/pluggy.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    const user = await verifyFirebaseUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    }

    // Busca items associados. Primeiro tenta filtrar por clientUserId
    let items = await listPluggyItems(user.uid);

    // Se não encontrar nenhum item com clientUserId específico (ex: items criados antes pelo Meu Pluggy),
    // busca todos os items criados sob a aplicação da Pluggy
    if (!items || items.length === 0) {
      items = await listPluggyItems();
    }

    return res.status(200).json({
      items: items || [],
    });
  } catch (err: any) {
    console.error('Erro em /api/pluggy/items:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao listar conexões da Pluggy.',
    });
  }
}
