/** Lecture défensive d’un corps JSON avec plafond mémoire explicite. */
export type ResultatJsonLimite =
  | { ok: true; valeur: unknown }
  | { ok: false; raison: 'trop_volumineux' | 'json_invalide' };

export async function lireJsonLimite(req: Request, limiteOctets: number): Promise<ResultatJsonLimite> {
  const annonce = req.headers.get('content-length');
  if (annonce !== null) {
    const taille = Number(annonce);
    if (!Number.isSafeInteger(taille) || taille < 0) return { ok: false, raison: 'json_invalide' };
    if (taille > limiteOctets) return { ok: false, raison: 'trop_volumineux' };
  }
  if (!req.body) return { ok: false, raison: 'json_invalide' };
  const lecteur = req.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > limiteOctets) {
        try { await lecteur.cancel(); } catch { /* Le corps est déjà interrompu. */ }
        return { ok: false, raison: 'trop_volumineux' };
      }
      morceaux.push(value);
    }
  } catch {
    return { ok: false, raison: 'json_invalide' };
  } finally {
    try { lecteur.releaseLock(); } catch { /* Le lecteur peut déjà être libéré. */ }
  }
  const concatene = new Uint8Array(total);
  let offset = 0;
  for (const morceau of morceaux) { concatene.set(morceau, offset); offset += morceau.byteLength; }
  try {
    const texte = new TextDecoder('utf-8', { fatal: true }).decode(concatene);
    return { ok: true, valeur: JSON.parse(texte) as unknown };
  } catch {
    return { ok: false, raison: 'json_invalide' };
  }
}

export function reponseCorpsTropVolumineux(reponse: (status: number, body: Record<string, unknown>) => Response): Response {
  return reponse(413, { code: 'CORPS_TROP_VOLUMINEUX', message: 'Les données envoyées dépassent la taille maximale autorisée.' });
}

/** Vérifie le type média sans se fier au type déclaré pour valider le contenu lui-même. */
export function estTypeContenu(req: Request, typeAttendu: 'application/json' | 'multipart/form-data'): boolean {
  const valeur = req.headers.get('content-type');
  if (!valeur) return false;
  const morceaux = valeur.split(';').map((partie) => partie.trim());
  if (morceaux[0]?.toLowerCase() !== typeAttendu) return false;
  if (typeAttendu === 'multipart/form-data') {
    return morceaux.slice(1).some((partie) => /^boundary\s*=\s*"?[^";\s]+"?$/i.test(partie));
  }
  return morceaux.slice(1).every((partie) => /^charset\s*=\s*("?utf-8"?)$/i.test(partie));
}

export function reponseTypeContenuInvalide(reponse: (status: number, body: Record<string, unknown>) => Response, attendu: string): Response {
  return reponse(415, {
    code: 'TYPE_CONTENU_NON_AUTORISE',
    message: `Le type de contenu doit être ${attendu}.`,
  });
}
