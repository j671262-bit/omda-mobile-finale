# Étape 5 — Branchement des écrans sur la fabrique de services

## Modifications

- Les écrans publics et d’adhésion qui lisaient directement `mockPublicContentService` utilisent désormais `publicContentService` depuis `src/services/factory.ts`.
- Les écrans de l’espace membre qui lisaient directement `mockMemberRepository` utilisent désormais `memberRepository` depuis la fabrique.
- `AuthContext` utilise `authService` depuis la fabrique au lieu d’imposer `mockAuthService`.
- Les services effectivement utilisés dépendent donc des variables `EXPO_PUBLIC_USE_MOCKS_MEMBER` et `EXPO_PUBLIC_USE_MOCKS_CANDIDATE`, sans devoir modifier chaque écran à nouveau.
- L’écran de paiement du membre conserve explicitement le mock pour `initierPaiement` et `obtenirPaiement`, conformément à la décision de laisser le paiement simulé. Les données de cotisation, d’œuvre et les opérateurs/estimations utilisent les services sélectionnés par la fabrique.

## Configuration

Le mode réel du membre reste activé avec `EXPO_PUBLIC_USE_MOCKS_MEMBER=false`, si les variables Supabase sont renseignées. Le parcours candidat reste gouverné séparément par `EXPO_PUBLIC_USE_MOCKS_CANDIDATE` ; il ne faut pas le passer en réel tant que son API sécurisée n’est pas disponible.

## Vérifications et limites

- Recherche statique effectuée : les écrans applicatifs ne référencent plus directement les mocks membre/contenu public/auth, sauf les trois appels de paiement explicitement maintenus en mock et l’écran de diagnostic des modes.
- `npm run typecheck` n’a pas pu servir de validation : les dépendances sont absentes/incomplètes dans l’environnement de travail (`expo/tsconfig.base`, React, Expo et plusieurs types manquent). Les erreurs générées ne permettent pas de conclure à la compilation du projet.
- Aucun test n’a été exécuté contre le projet Supabase distant.
- Cette étape ne remplace pas encore l’API candidat par des fonctions Edge sécurisées. Le candidat ne doit pas pouvoir créer un compte Auth avant l’adhésion ; les opérations de candidat doivent être implémentées côté serveur avant de désactiver les mocks candidats.
