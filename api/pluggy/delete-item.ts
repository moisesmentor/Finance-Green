// Serverless Function: POST /api/pluggy/delete-item
// Remove a conexão bancária na Pluggy

import { verifyFirebaseUser } from '../_utils/auth.js';
import { deletePluggyItem } from '../_utils/pluggy.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const user = await verifyFirebaseUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const itemId = body?.itemId;
    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "itemId" é obrigatório.' });
    }

    await deletePluggyItem(itemId.trim());

    return res.status(200).json({
      success: true,
    });
  } catch (err: any) {
    console.error('Erro em /api/pluggy/delete-item:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao excluir conexão bancária na Pluggy.',
    });
  }
}
