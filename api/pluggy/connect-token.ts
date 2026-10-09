// Serverless Function: POST /api/pluggy/connect-token
// Gera um connectToken temporário seguro para o Widget Pluggy Connect no frontend

import { verifyFirebaseUser } from '../_utils/auth.js';
import { createConnectToken } from '../_utils/pluggy.js';

export default async function handler(req: any, res: any) {
  // Configuração de CORS se necessário
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
    // 1. Validar autenticação do usuário Firebase
    const user = await verifyFirebaseUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autorizado. Token de sessão Firebase inválido ou expirado.' });
    }

    // 2. Extrair parâmetros opcionais (itemId para reconexão)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const itemId = body?.itemId;

    // 3. Gerar o connectToken na Pluggy com o clientUserId do usuário autenticado
    const connectToken = await createConnectToken(user.uid, itemId);

    return res.status(200).json({
      connectToken,
      uid: user.uid,
    });
  } catch (err: any) {
    console.error('Erro em /api/pluggy/connect-token:', err);
    return res.status(500).json({
      error: err.message || 'Erro interno ao gerar Connect Token na Pluggy.',
    });
  }
}
