import { verifyFirebaseUser } from '../_utils/auth';
import {
  deleteUserAccountData,
  getServerUserSubscription,
} from '../_utils/firebaseAdmin';
import { asaasRequest } from '../_utils/asaas';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // 1. Valida o token do Firebase Auth enviado no header Authorization
    const authUser = await verifyFirebaseUser(req);
    if (!authUser?.uid) {
      return res.status(401).json({
        error: 'Não autorizado. Faça login novamente para continuar.',
      });
    }
    const { uid } = authUser;

    // 2. Verifica se o usuário possui assinatura no Asaas e CANCELA ANTES de apagar os dados,
    // garantindo que nenhuma cobrança recorrente fique ativa após a exclusão da conta
    const existingSub = await getServerUserSubscription(uid);

    if (existingSub?.asaasSubscriptionId) {
      try {
        await asaasRequest(`/subscriptions/${encodeURIComponent(existingSub.asaasSubscriptionId)}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        if (err?.status !== 404) {
          throw new Error(
            'Não foi possível cancelar sua assinatura ativa no Asaas antes de excluir a conta. Por segurança, sua conta não foi apagada para evitar cobranças futuras. Tente novamente.'
          );
        }
      }
    }

    // 3. Remove todas as subcoleções do usuário no Firestore e exclui a credencial no Firebase Auth
    await deleteUserAccountData(uid);

    return res.status(200).json({
      success: true,
      message: 'Sua assinatura no Asaas foi encerrada e sua conta e dados foram excluídos permanentemente.',
    });
  } catch (err: any) {
    const statusCode =
      typeof err?.status === 'number' && err.status >= 400 && err.status < 600
        ? err.status
        : 500;

    console.error('[api/asaas/delete-account] Erro:', {
      status: statusCode,
      message: err?.message || 'Erro interno ao excluir conta',
    });

    return res.status(statusCode).json({
      error:
        err?.message ||
        'Não foi possível concluir a exclusão da conta no momento. Tente novamente em instantes.',
    });
  }
}
