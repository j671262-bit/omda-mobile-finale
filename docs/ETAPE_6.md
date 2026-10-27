# Étape 6 — Premier endpoint sécurisé du parcours candidat

Cette étape ajoute le socle serveur de **création d'un brouillon de demande** sans créer d'utilisateur Supabase Auth.

## Fichiers ajoutés

- `supabase/functions/candidat-creer-demande/index.ts` : endpoint POST, validation des champs, appel RPC et erreurs métier françaises.
- `supabase/migrations/0007_creation_demande_candidat_securisee.sql` : transaction SQL atomique, contrôle d'âge et de catégorie active, génération du numéro de dossier et du code de suivi, stockage du hash uniquement.
- `supabase/config.toml` : désactive la vérification JWT pour cet endpoint public, puisque le candidat n'a pas de compte.

## Installation

1. Vérifier que les migrations `0001` à `0006` ont été appliquées.
2. Exécuter `0007_creation_demande_candidat_securisee.sql` dans Supabase SQL Editor.
3. Déployer la fonction avec la CLI Supabase : `supabase functions deploy candidat-creer-demande --no-verify-jwt`.
4. Tester avec une catégorie réellement active et une identité de test, puis vérifier la création dans `candidat` et `demande_adhesion`.

La fonction utilise `SUPABASE_SERVICE_ROLE_KEY` uniquement côté Edge Function. Cette clé ne doit jamais être ajoutée à `.env` mobile ni à une variable `EXPO_PUBLIC_*`.

## Limites avant production

- Cette étape n'implémente que la création du brouillon ; elle ne remplace pas encore toute l'API CandidateApi et n'est pas encore branchée à l'écran mobile.
- Ajouter une limitation de débit persistante et une protection anti-abus (par exemple CAPTCHA ou mécanisme équivalent) avant d'ouvrir l'endpoint en production.
- Tester le comportement sur Supabase réel avant usage : aucune migration ni fonction n'a été déployée depuis cet environnement.
- La contrainte `candidat.cin` unique empêche de créer deux candidats avec le même CIN. Si le métier doit autoriser plusieurs dossiers par personne, la règle doit être précisée avant de changer cette contrainte.
