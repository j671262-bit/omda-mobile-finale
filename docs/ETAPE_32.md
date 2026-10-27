# Étape 32 — Limitation de longueur des champs d'identité

## Objectif

Refuser tôt les valeurs de champs d'identité anormalement longues, avant l'appel aux fonctions SQL, tout en conservant les validations métier en base.

## Modifications

- Ajout de `supabase/functions/_shared/identityValidation.ts` avec des plafonds communs : nom 100 caractères, prénom 100, date de naissance 10, CIN 50, téléphone 30, e-mail 254 et adresse 500.
- `candidat-creer-demande` applique les plafonds avant l'appel RPC de création.
- `candidat-modifier-demande` applique les mêmes plafonds aux champs textuels fournis, sans rendre obligatoires les champs qui peuvent être omis lors d'une modification partielle.
- Un dépassement renvoie HTTP 422 avec le code `CHAMP_TROP_LONG` et un message générique qui ne répète pas les données personnelles transmises.
- Les règles de validation SQL restent la source de vérité pour les contraintes métier, notamment l'âge, le CIN déjà utilisé et la date de naissance.

## Limites et recette

- Les plafonds sont des garde-fous applicatifs ; ils doivent être comparés aux exigences réelles de l'OMDA avant déploiement, notamment pour les noms, les numéros de CIN et les adresses.
- La validation de longueur ne valide pas à elle seule la syntaxe d'un e-mail ou d'un numéro de téléphone.
- Aucun test applicatif, build, contrôle TypeScript ni appel Supabase distant n'a été exécuté, conformément à la consigne de ne tester qu'une fois le projet entièrement terminé.
