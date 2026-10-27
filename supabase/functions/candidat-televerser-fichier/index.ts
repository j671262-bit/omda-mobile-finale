import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifierLimiteOperation, reponseLimite } from '../_shared/rateLimit.ts';
import { estTypeContenu, reponseTypeContenuInvalide } from '../_shared/requestBody.ts';

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
const MAX_BYTES = 20 * 1024 * 1024;
const MIME: Record<string, string[]> = {
  pieces: ['image/jpeg', 'image/png', 'application/pdf'],
  oeuvres: ['audio/mpeg', 'audio/wav', 'application/pdf', 'image/jpeg', 'image/png'],
};
function reponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });
}
function hex(buffer: ArrayBuffer) { return [...new Uint8Array(buffer)].map((v) => v.toString(16).padStart(2, '0')).join(''); }
function nettoyerNom(nom: string) { return nom.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 120) || 'fichier'; }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reponse(405, { code: 'METHODE_NON_AUTORISEE', message: 'Utilisez une requête POST.' });
  if (!estTypeContenu(req, 'multipart/form-data')) return reponseTypeContenuInvalide(reponse, 'multipart/form-data avec une boundary valide');

  const numero = (req.headers.get('X-Numero-Dossier') ?? '').trim();
  const code = (req.headers.get('X-Code-Suivi') ?? '').trim().toUpperCase();
  if (!/^OMDA-\d{4}-\d{6,}$/.test(numero) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
    return reponse(401, { code: 'CODE_SUIVI_INVALIDE', message: 'Le numéro ou le code de suivi est invalide.' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const limite = await verifierLimiteOperation(admin, req, 'TELEVERSEMENT');
  const refusLimite = reponseLimite(limite, reponse);
  if (refusLimite) return refusLimite;

  // 20 Mio pour le fichier + marge multipart ; la passerelle doit aussi plafonner les corps sans Content-Length.
  const longueurAnnoncee = req.headers.get('content-length');
  if (longueurAnnoncee !== null) {
    const longueur = Number(longueurAnnoncee);
    if (!Number.isSafeInteger(longueur) || longueur < 0) return reponse(400, { code: 'CORPS_INVALIDE', message: 'La taille de la requête est invalide.' });
    if (longueur > MAX_BYTES + 1024 * 1024) return reponse(413, { code: 'FICHIER_TROP_VOLUMINEUX', message: 'La requête dépasse la taille maximale autorisée.' });
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return reponse(400, { code: 'FORMULAIRE_INVALIDE', message: 'Le fichier transmis est invalide.' }); }
  const bucket = form.get('bucket');
  const mime = form.get('mime_type');
  const tailleAnnoncee = Number(form.get('taille_octets'));
  const cheminAnnonce = form.get('chemin_stockage');
  const fichier = form.get('fichier');
  if (typeof bucket !== 'string' || !(bucket in MIME) || typeof mime !== 'string' || !MIME[bucket].includes(mime) ||
      typeof cheminAnnonce !== 'string' || typeof fichier !== 'object' || fichier === null || !('arrayBuffer' in fichier)) {
    return reponse(422, { code: 'FICHIER_INVALIDE', message: 'Le type ou les informations du fichier ne sont pas acceptés.' });
  }
  const file = fichier as File;
  if (!Number.isSafeInteger(tailleAnnoncee) || tailleAnnoncee <= 0 || tailleAnnoncee > MAX_BYTES || file.size <= 0 || file.size > MAX_BYTES || file.size !== tailleAnnoncee) {
    return reponse(413, { code: 'FICHIER_TROP_VOLUMINEUX', message: 'Le fichier doit faire au maximum 20 Mo.' });
  }
  if (file.type && file.type !== mime) return reponse(422, { code: 'TYPE_FICHIER_NON_AUTORISE', message: 'Le type réel du fichier ne correspond pas au type déclaré.' });

  const empreinte = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));
  const { data: demande, error: erreurDemande } = await admin.from('demande_adhesion')
    .select('numero_dossier, jeton_suivi_hash, statut').eq('numero_dossier', numero).maybeSingle();
  if (erreurDemande) {
    console.error('candidat-televerser-fichier lookup error', erreurDemande.message);
    return reponse(503, { code: 'SERVICE_INDISPONIBLE', message: 'Le service est momentanément indisponible.' });
  }
  if (!demande || demande.jeton_suivi_hash !== empreinte) return reponse(401, { code: 'CODE_SUIVI_INVALIDE', message: 'Le numéro ou le code de suivi est invalide.' });
  if (demande.statut !== 'BROUILLON') return reponse(409, { code: 'DEMANDE_NON_MODIFIABLE', message: 'Les documents ne peuvent être déposés que sur un dossier brouillon.' });

  // Ne jamais faire confiance au chemin envoyé par le téléphone : il doit viser le bon bucket et dossier.
  const cheminNettoye = cheminAnnonce.replace(/^\/+/, '');
  if (!cheminNettoye.startsWith(`${bucket}/`) || cheminNettoye.split('/').some((s) => !s || s === '.' || s === '..')) {
    return reponse(422, { code: 'CHEMIN_INVALIDE', message: 'Le chemin de stockage demandé est invalide.' });
  }
  // Les écrans historiques utilisent parfois `pieces/CIN/...` sans numéro de dossier.
  // Le serveur ajoute toujours le numéro vérifié, jamais fourni comme source d'autorité.
  const segmentsAnnonce = cheminNettoye.slice(bucket.length + 1).split('/');
  if (segmentsAnnonce[0] === numero) segmentsAnnonce.shift();
  if (segmentsAnnonce.length < 2 || segmentsAnnonce.length > 4) return reponse(422, { code: 'CHEMIN_INVALIDE', message: 'Le chemin de stockage demandé est invalide.' });
  const nomFinal = nettoyerNom(segmentsAnnonce.pop() ?? file.name);
  const sousDossier = segmentsAnnonce.map(nettoyerNom).join('/');
  const relatif = `${numero}/${sousDossier}/${crypto.randomUUID()}-${nomFinal}`;
  const octets = new Uint8Array(await file.arrayBuffer());
  const { error: erreurUpload } = await admin.storage.from(bucket).upload(relatif, octets, {
    contentType: mime, upsert: false, cacheControl: '3600',
  });
  if (erreurUpload) {
    console.error('candidat-televerser-fichier storage error', erreurUpload.message);
    return reponse(503, { code: 'TELEVERSEMENT_ECHOUE', message: 'Le document n’a pas pu être enregistré. Réessayez.' });
  }
  return reponse(201, { chemin_stockage: `${bucket}/${relatif}`, mime_type: mime, taille_octets: octets.byteLength });
});
