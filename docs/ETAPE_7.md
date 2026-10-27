# Étape 7 — Brancher la création du dossier candidat à Supabase

## Changements

- `HttpCandidateApi.creerDemande()` appelle désormais l'Edge Function `candidat-creer-demande` de Supabase au lieu de l'ancienne route REST `/v1/demandes`.
- L'application envoie uniquement l'URL Supabase et la clé publique anon (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). La clé `service_role` n'est jamais exposée au mobile.
- La réponse est vérifiée contre le contrat `DemandeBrouillon`, puis le numéro et le code de suivi sont conservés dans le contexte du client.
- Les erreurs métier renvoyées par l'Edge Function sont conservées pour être affichées par l'écran.

## Configuration nécessaire plus tard

1. Dans `.env` local, renseigner `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. Dans Supabase, appliquer les migrations `0001` à `0007` dans l'ordre et déployer `candidat-creer-demande`.
3. Activer `EXPO_PUBLIC_USE_MOCKS_CANDIDATE=false` seulement lorsque l'Edge Function est déployée. Attention : les autres méthodes de `CandidateApi` utilisent encore l'ancienne API REST et ne sont pas toutes implémentées dans cette étape.

## Hors périmètre de cette étape

- Mise à jour et soumission du dossier, téléversement de documents candidat et suivi serveur complet.
- Tests et validation finale : selon la consigne du projet, ils seront réalisés lorsque l'application sera entièrement terminée.

Aucune migration ni fonction n'a été déployée sur le projet Supabase distant depuis cette étape.
