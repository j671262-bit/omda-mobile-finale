/** Limiteur commun aux opérations publiques du parcours candidat. */
export type OperationCandidat = 'CREATION' | 'MODIFICATION' | 'TELEVERSEMENT' | 'SOUMISSION';
export type ResultatLimite = 'ok' | 'limite' | 'indisponible';

async function empreinteReseau(req: Request): Promise<string | null> {
  // Ces en-têtes doivent être définis/normalisés par la passerelle de confiance.
  const brut = req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '';
  if (!brut || brut.length > 128 || /[\r\n]/.test(brut)) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(brut));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export async function verifierLimiteOperation(
  admin: any,
  req: Request,
  operation: OperationCandidat,
): Promise<ResultatLimite> {
  try {
    const hash = await empreinteReseau(req);
    if (!hash) return 'indisponible';
    const { data, error } = await admin.rpc('autoriser_operation_candidat', {
      p_cle_reseau_hash: hash,
      p_operation: operation,
    });
    if (error || typeof data !== 'boolean') return 'indisponible';
    return data ? 'ok' : 'limite';
  } catch {
    return 'indisponible';
  }
}

export function reponseLimite(resultat: ResultatLimite, reponse: (status: number, body: Record<string, unknown>) => Response): Response | null {
  if (resultat === 'ok') return null;
  if (resultat === 'limite') return reponse(429, {
    code: 'TROP_DE_TENTATIVES',
    message: 'Trop de tentatives ont été effectuées. Veuillez réessayer plus tard.',
  });
  return reponse(503, {
    code: 'PROTECTION_INDISPONIBLE',
    message: 'La protection temporaire est indisponible. Veuillez réessayer plus tard.',
  });
}
