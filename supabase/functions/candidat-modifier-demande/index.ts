import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifierLimiteOperation, reponseLimite } from '../_shared/rateLimit.ts';
import { estTypeContenu, reponseTypeContenuInvalide, lireJsonLimite, reponseCorpsTropVolumineux } from '../_shared/requestBody.ts';
import { identiteRespecteFormats, identiteRespecteLongueurs, identiteTypesValides, normaliserChampsIdentite } from '../_shared/identityValidation.ts';

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
function empreinte(code: string) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)).then((b) => [...new Uint8Array(b)].map((v) => v.toString(16).padStart(2, '0')).join('')); }
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reponse(405, { code: 'METHODE_NON_AUTORISEE', message: 'Utilisez une requête POST.' });
  if (!estTypeContenu(req, 'application/json')) return reponseTypeContenuInvalide(reponse, 'application/json');
  const numero = (req.headers.get('X-Numero-Dossier') ?? '').trim();
  const code = (req.headers.get('X-Code-Suivi') ?? '').trim().toUpperCase();
  if (!/^OMDA-\d{4}-\d{6,}$/.test(numero) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) return reponse(401, { code: 'CODE_SUIVI_INVALIDE', message: 'Le numéro ou le code de suivi est invalide.' });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const limite = await verifierLimiteOperation(admin, req, 'MODIFICATION');
  const refusLimite = reponseLimite(limite, reponse);
  if (refusLimite) return refusLimite;
  const resultatJson = await lireJsonLimite(req, 65536);
  if (!resultatJson.ok) {
    if (resultatJson.raison === 'trop_volumineux') return reponseCorpsTropVolumineux(reponse);
    return reponse(400, { code: 'JSON_INVALIDE', message: 'Le contenu envoyé est invalide.' });
  }
  const body: unknown = resultatJson.valeur;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Les informations sont invalides.' });
  const entree = body as { identite?: unknown; categorie_id?: unknown };
  const identiteBrute = entree.identite ?? {};
  if (!identiteBrute || typeof identiteBrute !== 'object' || Array.isArray(identiteBrute) || (entree.categorie_id != null && (typeof entree.categorie_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entree.categorie_id)))) return reponse(422, { code: 'ENTREE_INVALIDE', message: 'Les informations sont invalides.' });
  if (!identiteTypesValides(identiteBrute as Record<string, unknown>)) return reponse(422, { code: 'TYPE_CHAMP_INVALIDE', message: 'Un ou plusieurs champs d’identité ont un format invalide.' });
  const identite = normaliserChampsIdentite(identiteBrute as Record<string, unknown>);
  if (!identiteRespecteLongueurs(identite)) return reponse(422, { code: 'CHAMP_TROP_LONG', message: 'Un ou plusieurs champs dépassent la longueur maximale autorisée.' });
  if (!identiteRespecteFormats(identite)) return reponse(422, { code: 'FORMAT_CHAMP_INVALIDE', message: 'L’adresse e-mail, la date de naissance ou le téléphone est invalide.' });
  const hash = await empreinte(code);
  const { data, error } = await admin.rpc('modifier_brouillon_candidat_securise', {
    p_numero_dossier: numero, p_code_suivi_hash: hash, p_identite: identite, p_categorie_id: entree.categorie_id ?? null,
  });
  if (error) {
    const map: Record<string, { status: number; code: string; message: string }> = {
      CODE_SUIVI_INVALIDE: { status: 401, code: 'CODE_SUIVI_INVALIDE', message: 'Le numéro ou le code de suivi est incorrect.' },
      DEMANDE_NON_MODIFIABLE: { status: 409, code: 'DEMANDE_NON_MODIFIABLE', message: 'Ce dossier n’est plus modifiable.' },
      AGE_INSUFFISANT: { status: 422, code: 'AGE_INSUFFISANT', message: 'Une demande est possible à partir de 15 ans.' },
      CIN_DEJA_UTILISE: { status: 409, code: 'CIN_DEJA_UTILISE', message: 'Ce numéro de CIN est déjà utilisé.' },
      CATEGORIE_INDISPONIBLE: { status: 422, code: 'CATEGORIE_INDISPONIBLE', message: 'La catégorie choisie n’est pas disponible.' },
      DATE_NAISSANCE_INVALIDE: { status: 422, code: 'DATE_NAISSANCE_INVALIDE', message: 'La date de naissance est invalide.' },
      ENTREE_INVALIDE: { status: 422, code: 'ENTREE_INVALIDE', message: 'Les informations fournies sont invalides.' },
    };
    const known = map[error.message];
    if (known) return reponse(known.status, { code: known.code, message: known.message });
    console.error('candidat-modifier-demande RPC error', error.message);
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  }
  return reponse(200, { ...(data as Record<string, unknown>), code_suivi: code });
});
