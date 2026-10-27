# Étape 34 — Validation des formats des champs d’identité

## Changements

- Ajout de `identiteRespecteFormats` dans `supabase/functions/_shared/identityValidation.ts`.
- Création et modification d’un brouillon vérifient désormais les formats des champs textuels lorsqu’ils sont renseignés : e-mail, date de naissance ISO `AAAA-MM-JJ` avec contrôle calendaire réel, et téléphone malgache au format `+261` suivi de neuf chiffres.
- Un format incorrect reçoit HTTP `422` avec le code `FORMAT_CHAMP_INVALIDE`.
- Les contrôles de type et de longueur précédents restent actifs ; les règles métier SQL restent la source de vérité pour l’âge, l’unicité de la CIN et la disponibilité des catégories.

## Points à confirmer avant déploiement

- Confirmer avec l’OMDA que le format téléphonique `+261` suivi de neuf chiffres couvre tous les numéros acceptés. Si les numéros étrangers sont autorisés, cette règle devra être assouplie.
- Confirmer que le client envoie les dates au format ISO `AAAA-MM-JJ`.
- Les tests applicatifs, le build, le contrôle TypeScript et les appels Supabase distants ne sont pas exécutés à cette étape, conformément à la consigne de ne tester qu’une fois le projet entièrement terminé.
