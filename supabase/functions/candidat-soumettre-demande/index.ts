import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifierLimiteOperation, reponseLimite } from '../_shared/rateLimit.ts';
import { estTypeContenu, reponseTypeContenuInvalide, lireJsonLimite, reponseCorpsTropVolumineux } from '../_shared/requestBody.ts';

const corsHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-numero-dossier, x-code-suivi',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function reponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });
}
function hex(buffer: ArrayBuffer) { return [...new Uint8Array(buffer)].map((v) => v.toString(16).padStart(2, '0')).join(''); }

type FichierSoumis = { chemin_stockage?: unknown };
type OeuvreSoumise = { fichier?: FichierSoumis; attestations?: unknown };

/** Vérifie que le chemin appartient au dossier et que l'objet existe dans le bucket privé. */
async function verifierObjetStockage(
  admin: ReturnType<typeof createClient>,
  chemin: unknown,
  numero: string,
  bucketAttendu: 'pieces' | 'oeuvres',
): Promise<'ok' | 'absent' | 'erreur'> {
  if (typeof chemin !== 'string') return 'absent';
  const segments = chemin.split('/');
  if (segments.length < 4 || segments[0] !== bucketAttendu || segments[1] !== numero ||
      segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
    return 'absent';
  }
  const nomFichier = segments[segments.length - 1];
  const dossier = segments.slice(1, -1).join('/');
  const { data, error } = await admin.storage.from(bucketAttendu).list(dossier, {
    search: nomFichier,
    limit: 100,
  });
  if (error) return 'erreur';
  return data?.some((objet) => objet.name === nomFichier) ? 'ok' : 'absent';
}

async function verifierFichiersSoumis(
  admin: ReturnType<typeof createClient>,
  numero: string,
  pieces: unknown[],
  oeuvres: unknown[],
): Promise<'ok' | 'absent' | 'erreur'> {
  for (const piece of pieces) {
    if (!piece || typeof piece !== 'object' || Array.isArray(piece)) return 'absent';
    const resultat = await verifierObjetStockage(admin, (piece as FichierSoumis).chemin_stockage, numero, 'pieces');
    if (resultat !== 'ok') return resultat;
  }
  for (const element of oeuvres) {
    if (!element || typeof element !== 'object' || Array.isArray(element)) return 'absent';
    const oeuvre = element as OeuvreSoumise;
    if (!oeuvre.fichier || typeof oeuvre.fichier !== 'object') return 'absent';
    const fichierResultat = await verifierObjetStockage(admin, oeuvre.fichier.chemin_stockage, numero, 'oeuvres');
    if (fichierResultat !== 'ok') return fichierResultat;
    if (!Array.isArray(oeuvre.attestations)) return 'absent';
    for (const elementAttestation of oeuvre.attestations) {
      if (!elementAttestation || typeof elementAttestation !== 'object' || Array.isArray(elementAttestation)) return 'absent';
      const attestationResultat = await verifierObjetStockage(admin, (elementAttestation as FichierSoumis).chemin_stockage, numero, 'pieces');
      if (attestationResultat !== 'ok') return attestationResultat;
    }
  }
  return 'ok';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reponse(405, { code: 'METHODE_NON_AUTORISEE', message: 'Utilisez une requête POST.' });
  if (!estTypeContenu(req, 'application/json')) return reponseTypeContenuInvalide(reponse, 'application/json');
  const numero = (req.headers.get('X-Numero-Dossier') ?? '').trim();
  const code = (req.headers.get('X-Code-Suivi') ?? '').trim().toUpperCase();
  if (!/^OMDA-\d{4}-\d{6,}$/.test(numero) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
    return reponse(401, { code: 'CODE_SUIVI_INVALIDE', message: 'Le numéro ou le code de suivi est invalide.' });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const limite = await verifierLimiteOperation(admin, req, 'SOUMISSION');
  const refusLimite = reponseLimite(limite, reponse);
  if (refusLimite) return refusLimite;
  const resultatJson = await lireJsonLimite(req, 65536);
  if (!resultatJson.ok) {
    if (resultatJson.raison === 'trop_volumineux') return reponseCorpsTropVolumineux(reponse);
    return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Le contenu envoyé est invalide.' });
  }
  const body: unknown = resultatJson.valeur;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Le dossier envoyé est invalide.' });
  const entree = body as { pieces?: unknown; oeuvres?: unknown };
  if (!Array.isArray(entree.pieces) || !Array.isArray(entree.oeuvres)) return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Les pièces et les œuvres sont obligatoires.' });
  const empreinte = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));
  const { data: demandeExistante, error: erreurDemande } = await admin.from('demande_adhesion')
    .select('statut, date_soumission')
    .eq('numero_dossier', numero)
    .eq('jeton_suivi_hash', empreinte)
    .maybeSingle();
  if (erreurDemande) {
    console.error('candidat-soumettre-demande dossier lookup failed', erreurDemande.message);
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  }
  if (!demandeExistante) {
    return reponse(401, { code: 'CODE_SUIVI_INVALIDE', message: 'Le numéro ou le code de suivi est invalide.' });
  }

  if (demandeExistante.statut === 'BROUILLON') {
    // Ne pas créer de métadonnées pour des fichiers inexistants, appartenant à un autre
    // dossier ou placés dans le mauvais bucket. Les chemins sont revalidés par la RPC.
    const stockage = await verifierFichiersSoumis(admin, numero, entree.pieces, entree.oeuvres);
    if (stockage === 'erreur') {
      return reponse(503, { code: 'STOCKAGE_INDISPONIBLE', message: 'Les documents ne peuvent pas être vérifiés pour le moment.' });
    }
    if (stockage === 'absent') {
      return reponse(422, { code: 'FICHIER_ABSENT', message: 'Un document est introuvable ou ne correspond pas au dossier.' });
    }
  }

  const { data, error } = await admin.rpc('soumettre_demande_candidat_securisee', {
    p_numero_dossier: numero, p_code_suivi_hash: empreinte, p_pieces: entree.pieces, p_oeuvres: entree.oeuvres,
  });
  if (error) {
    const map: Record<string, { status: number; message: string }> = {
      CODE_SUIVI_INVALIDE: { status: 401, message: 'Le numéro ou le code de suivi est invalide.' },
      DEMANDE_NON_MODIFIABLE: { status: 409, message: 'Ce dossier ne peut plus être modifié.' },
      DOSSIER_INCOMPLET: { status: 422, message: 'Le dossier doit contenir les pièces requises et au moins deux œuvres.' },
      PIECE_INVALIDE: { status: 422, message: 'Le type de pièce transmis est invalide.' },
      OEUVRE_INVALIDE: { status: 422, message: 'Les informations d’une œuvre sont invalides.' },
      ATTESTATION_REQUISE: { status: 422, message: 'Chaque œuvre doit avoir au moins une attestation de diffusion.' },
      CATEGORIE_INDISPONIBLE: { status: 422, message: 'Une catégorie sélectionnée n’est plus disponible.' },
      FICHIER_INVALIDE: { status: 422, message: 'Un fichier est invalide ou ne correspond pas au dossier.' },
      ENTREE_INVALIDE: { status: 422, message: 'Les informations transmises sont invalides.' },
    };
    const known = map[error.message];
    if (known) return reponse(known.status, { code: error.message, message: known.message });
    console.error('candidat-soumettre-demande RPC error', error.message);
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  }
  return reponse(200, { ...(data as Record<string, unknown>), code_suivi: code });
});
