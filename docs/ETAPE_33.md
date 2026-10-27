# Étape 33 — Validation du type des champs d'identité

## Objectif

Refuser les valeurs JSON qui ne correspondent pas au type attendu pour les champs textuels d'identité, avant l'appel aux fonctions SQL.

## Modifications

- `supabase/functions/_shared/identityValidation.ts` expose désormais `identiteTypesValides` en plus du contrôle de longueur existant.
- Pour les champs connus (`nom`, `prenom`, `date_naissance`, `cin`, `telephone`, `email`, `adresse`), une valeur fournie doit être une chaîne de caractères.
- Les champs omis restent autorisés lors d'une modification partielle ; une valeur explicitement fournie comme nombre, booléen, objet, tableau ou `null` est refusée.
- Les fonctions `candidat-creer-demande` et `candidat-modifier-demande` renvoient HTTP 422 avec `TYPE_CHAMP_INVALIDE` en cas de type incorrect.
- Les plafonds de longueur de l'étape 32 et les validations métier SQL sont conservés. Cette vérification ne remplace pas la validation de syntaxe des dates, e-mails ou téléphones.

## Vérifications et limites

- Contrôle statique des fichiers modifiés uniquement ; aucun test applicatif, build, contrôle TypeScript ni appel Supabase distant n'a été exécuté, conformément à la consigne de tester lorsque le projet sera entièrement terminé.
- Les cas limites devront être inclus dans la recette finale, notamment les champs absents, les chaînes vides et les valeurs `null` lors d'une modification partielle.
