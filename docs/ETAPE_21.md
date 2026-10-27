# Étape 21 — Audit des écrans et sélection effective des services

## Objectif

Supprimer les contournements directs de mocks dans les écrans métier et rendre l’écran de diagnostic cohérent avec la fabrique réelle.

## Modifications

- `app/(membre)/paiement-membre.tsx` utilise désormais `memberRepository` pour l’initiation et la consultation du paiement, y compris pendant le polling et la vérification manuelle. Le mode mock/réel du membre est donc déterminé par la fabrique, sans imposer `mockMemberRepository` depuis l’écran. Le paiement reste simulé lorsque le repository mock est sélectionné ; en mode réel, le résultat dépend de l’implémentation du repository et de la configuration Supabase.
- `app/dev/env.tsx` identifie le parcours candidat réel comme `SupabaseCandidateApi`, et non `HttpCandidateApi` / API Express. Le libellé de l’ancienne variable `EXPO_PUBLIC_API_BASE_URL` précise qu’elle est historique et non nécessaire aux opérations de dossier utilisant les Edge Functions.
- Le commentaire de `src/services/factory.ts` est aligné sur le service réellement instancié.

## Limites

- Les imports de mocks dans la fabrique et dans l’écran de diagnostic sont intentionnels : ils servent à sélectionner ou identifier le mode, pas à contourner la fabrique dans un écran métier. `CODES_MOCK` reste également utilisé comme catalogue de données de démonstration dans certains écrans ; ce n’est pas un repository.
- Cette étape ne prouve pas que tous les services réels sont complets ni que Supabase est déployé. Le paiement de cotisation membre en mode réel dépend encore des capacités effectivement implémentées par `SupabaseMemberRepository`. Le paiement d’adhésion candidat reste explicitement mock.

## Vérifications

Aucun test applicatif, build, typecheck ou test Supabase distant n’a été exécuté, conformément à la consigne de reporter les tests à la fin du développement. Seule l’intégrité du ZIP est vérifiée après archivage.
