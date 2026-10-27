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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reponse(405, { code: 'METHODE_NON_AUTORISEE', message: 'Utilisez une requête POST.' });
  if (!estTypeContenu(req, 'application/json')) return reponseTypeContenuInvalide(reponse, 'application/json');

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const limite = await verifierLimiteOperation(admin, req, 'CREATION');
  const refusLimite = reponseLimite(limite, reponse);
  if (refusLimite) return refusLimite;

  const resultatJson = await lireJsonLimite(req, 65536);
  if (!resultatJson.ok) {
    if (resultatJson.raison === 'trop_volumineux') return reponseCorpsTropVolumineux(reponse);
    return reponse(400, { code: 'JSON_INVALIDE', message: 'Le contenu envoyé est invalide.' });
  }
  const body: unknown = resultatJson.valeur;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Les informations du dossier sont invalides.' });
  }
  const entree = body as { identite?: Record<string, unknown>; categorie_id?: unknown };
  const identiteBrute = entree.identite;
  if (!identiteBrute || typeof identiteBrute !== 'object' || Array.isArray(identiteBrute) || typeof entree.categorie_id !== 'string') {
    return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Les informations du dossier sont incomplètes.' });
  }
  if (!identiteTypesValides(identiteBrute)) {
    return reponse(422, { code: 'TYPE_CHAMP_INVALIDE', message: 'Un ou plusieurs champs d’identité ont un format invalide.' });
  }
  const identite = normaliserChampsIdentite(identiteBrute);
  if (!identiteRespecteLongueurs(identite)) {
    return reponse(422, { code: 'CHAMP_TROP_LONG', message: 'Un ou plusieurs champs dépassent la longueur maximale autorisée.' });
  }
  if (!identiteRespecteFormats(identite)) {
    return reponse(422, { code: 'FORMAT_CHAMP_INVALIDE', message: 'L’adresse e-mail, la date de naissance ou le téléphone est invalide.' });
  }
  const champs = ['nom', 'prenom', 'date_naissance', 'cin', 'telephone', 'email', 'adresse'];
  if (champs.some((c) => typeof identite[c] !== 'string' || !(identite[c] as string).trim())) {
    return reponse(400, { code: 'ENTREE_INVALIDE', message: 'Veuillez renseigner tous les champs obligatoires.' });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entree.categorie_id)) {
    return reponse(400, { code: 'CATEGORIE_INDISPONIBLE', message: 'La catégorie choisie est invalide.' });
  }

  const { data, error } = await admin.rpc('creer_demande_candidat_securisee', {
    p_identite: identite,
    p_categorie_id: entree.categorie_id,
  });
  if (error) {
    const map: Record<string, { status: number; code: string; message: string }> = {
      AGE_INSUFFISANT: { status: 422, code: 'AGE_INSUFFISANT', message: 'Une demande d’adhésion est possible à partir de 15 ans.' },
      CIN_DEJA_UTILISE: { status: 409, code: 'CIN_DEJA_UTILISE', message: 'Une demande existe déjà avec ce numéro de CIN.' },
      CATEGORIE_INDISPONIBLE: { status: 422, code: 'CATEGORIE_INDISPONIBLE', message: 'La catégorie choisie n’est pas disponible.' },
      DATE_NAISSANCE_INVALIDE: { status: 422, code: 'DATE_NAISSANCE_INVALIDE', message: 'La date de naissance est invalide.' },
      ENTREE_INVALIDE: { status: 422, code: 'ENTREE_INVALIDE', message: 'Les informations fournies sont invalides.' },
    };
    const known = map[error.message];
    if (known) return reponse(known.status, { code: known.code, message: known.message });
    console.error('candidat-creer-demande RPC error', error.message);
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  }
  return reponse(201, data as Record<string, unknown>);
});
