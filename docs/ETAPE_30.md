# Étape 30 — Validation du type de contenu HTTP

## Objectif

Refuser tôt les requêtes dont le type de contenu ne correspond pas au format attendu par les fonctions publiques du parcours candidat.

## Modifications

- Ajout de `estTypeContenu` et `reponseTypeContenuInvalide` dans `supabase/functions/_shared/requestBody.ts`.
- Les fonctions `candidat-creer-demande`, `candidat-modifier-demande`, `candidat-soumettre-demande` et `candidat-consulter-demande` exigent `Content-Type: application/json` (avec, au besoin, le paramètre `charset=utf-8`).
- La fonction `candidat-televerser-fichier` exige `Content-Type: multipart/form-data` accompagné d'une boundary valide.
- Une requête au format média incorrect reçoit HTTP `415` avec le code `TYPE_CONTENU_NON_AUTORISE`.
- Les méthodes HTTP, les plafonds de taille, les quotas anti-abus et les en-têtes de sécurité précédents sont conservés.

## Limites et suite

Le type de contenu annoncé par le client n'est pas une preuve de la nature du contenu. La validation métier, les contrôles de taille et de MIME, les contrôles de stockage et les règles SQL restent nécessaires. La recette devra confirmer que le client natif envoie les en-têtes attendus, notamment la boundary multipart générée automatiquement par `FormData`.

Aucun test applicatif, build, contrôle TypeScript ou appel Supabase distant n'a été exécuté, conformément à la consigne de ne tester qu'une fois le projet entièrement terminé.
