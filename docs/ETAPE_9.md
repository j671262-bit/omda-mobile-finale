# Étape 9 — Enregistrement des métadonnées et soumission du dossier candidat

## Objectif

Lorsqu'un candidat soumet son dossier, les métadonnées des pièces, des œuvres et des attestations sont désormais destinées à être enregistrées dans les tables métier, dans une transaction SQL unique. Le code de suivi est vérifié côté serveur sans créer de compte Supabase Auth.

## Fichiers ajoutés

- `supabase/migrations/0008_soumission_dossier_candidat.sql`
- `supabase/functions/candidat-soumettre-demande/index.ts`

## Branchement mobile

`HttpCandidateApi.soumettreDemande()` appelle l'Edge Function `candidat-soumettre-demande`. La fonction valide le numéro de dossier et le code de suivi, calcule l'empreinte SHA-256 du code puis appelle la RPC SQL avec le rôle serveur. La clé `service_role` ne doit jamais être embarquée dans l'application mobile.

## Règles prévues

- Le dossier doit toujours être au statut `BROUILLON`.
- Au moins deux œuvres et une pièce doivent être fournies.
- Chaque œuvre doit avoir au moins une attestation de diffusion.
- Les chemins de fichiers doivent pointer vers le numéro de dossier vérifié et vers le bucket prévu.
- Les fichiers et métadonnées sont insérés puis le dossier passe à `ENVOYEE` dans la même transaction.
- Aucun paiement n'est déclenché par la soumission.

## Déploiement (à faire à la fin, avec les tests)

1. Appliquer les migrations précédentes puis `0008_soumission_dossier_candidat.sql`.
2. Déployer : `supabase functions deploy candidat-soumettre-demande --no-verify-jwt`.
3. Vérifier les variables Supabase de l'environnement serveur.
4. Tester le dossier complet, les codes invalides, les dossiers déjà envoyés, les chemins de fichiers d'un autre dossier et les dossiers incomplets.

## Limites connues

Cette étape ajoute l'enregistrement atomique au moment de la soumission. Elle ne constitue pas à elle seule un parcours candidat complet : la reprise/édition du brouillon, l'affichage du suivi et les opérations d'administration restent des tâches distinctes. Les tests sont volontairement reportés à la fin, selon la consigne du projet.
