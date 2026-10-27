# Étape 35 — Normalisation des champs d’identité

## Changements

- Ajout de `normaliserChampsIdentite` dans `supabase/functions/_shared/identityValidation.ts`.
- Après validation des types, les champs d’identité textuels connus sont débarrassés des espaces en début et en fin.
- L’adresse e-mail est normalisée en minuscules afin d’éviter des variantes dues uniquement à la casse.
- La création et la modification d’un brouillon appliquent cette normalisation avant les contrôles de longueur et de format et avant l’appel de la RPC.
- Les champs inconnus du payload sont conservés tels quels ; les règles métier SQL ne sont pas remplacées.

## Points d’attention

- La normalisation ne remplace pas la validation métier ni la contrainte d’unicité de la CIN.
- Le téléphone reste soumis au format configuré à l’étape 34 (`+261` suivi de neuf chiffres), à confirmer avec l’OMDA.
- Aucun test applicatif, build, contrôle TypeScript ou appel Supabase distant n’est exécuté à cette étape, conformément à la consigne de tester lorsque le projet sera entièrement terminé.
