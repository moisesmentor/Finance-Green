// Validação segura de Firebase ID Token para rotas serverless da Vercel
// Utiliza a API REST oficial do Google Identity Toolkit sem exigir chaves privadas extras

const FIREBASE_API_KEY = 
  process.env.VITE_FIREBASE_API_KEY || 
  process.env.FIREBASE_API_KEY || 
  'AIzaSyDpEq4LFdM2EpkqOKUnUYmJtP9vqvdkvpo';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

export async function verifyFirebaseUser(req: any): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return null;
    }

    const idToken = match[1].trim();
    if (!idToken) return null;

    // Validação direta via Google Identity Toolkit
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.users && Array.isArray(data.users) && data.users.length > 0) {
      const user = data.users[0];
      return {
        uid: user.localId,
        email: user.email,
      };
    }

    return null;
  } catch (err) {
    console.error('Erro na verificação do token Firebase:', err);
    return null;
  }
}
