// Serverless Function: GET /api/pluggy/item-details?id={itemId}
// Obtém dados e status atualizados de um Item específico

import { verifyFirebaseUser } from '../_utils/auth.js';
import { getPluggyItem } from '../_utils/pluggy.js';

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

    const itemId = req.query?.id || new URL(req.url, 'http://localhost').searchParams.get('id');
    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "id" do item é obrigatório.' });
    }

    const item = await getPluggyItem(itemId.trim());

    return res.status(200).json({
      item,
    });
  } catch (err: any) {
    console.error('Erro em /api/pluggy/item-details:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao consultar detalhes da conexão.',
    });
  }
}
