# Étape 10 — Modification sécurisée du brouillon candidat

Cette étape ajoute `supabase/migrations/0009_modifier_brouillon_candidat.sql` et l'Edge Function `candidat-modifier-demande`.

- Le candidat fournit son numéro de dossier et son code de suivi, sans compte Supabase Auth.
- Le serveur calcule l'empreinte SHA-256 du code et la compare dans une RPC `SECURITY DEFINER`.
- Seul un dossier `BROUILLON` est modifiable.
- L'identité est fusionnée côté serveur avec les valeurs existantes ; une catégorie facultative est validée comme active.
- L'âge minimal et l'unicité de la CIN sont vérifiés avant l'enregistrement.
- La fonction SQL n'est exécutable que par `service_role`, conservé côté serveur.
- `HttpCandidateApi.mettreAJourDemande()` utilise cette Edge Function.

## Installation (à effectuer à la fin du développement)

1. Exécuter la migration `0009_modifier_brouillon_candidat.sql` après les migrations précédentes.
2. Déployer `supabase functions deploy candidat-modifier-demande --no-verify-jwt`.
3. Effectuer les tests de bout en bout lors de la phase finale, conformément à la consigne du projet.

Aucun test applicatif ni compilation n'a été lancé pour cette étape. Le déploiement et la validation sur le projet Supabase restent à faire.
