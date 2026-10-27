# Étape 22 — Audit des implémentations réelles membre

## Objectif

Distinguer les opérations réellement raccordées à Supabase des opérations volontairement simulées ou dépendantes d'une migration/RPC. Cet audit prépare la finalisation sans exécuter les tests, conformément à la consigne de les reporter à la fin du développement.

## Résultats de l'audit statique

### Implémentations présentes dans `SupabaseMemberRepository`

- Profil et mise à jour du téléphone.
- Tableau de bord, catégories du membre et œuvres.
- Création, modification et soumission d'œuvres.
- Téléversement de fichiers et génération de liens signés via la couche Storage.
- Lecture des cotisations.
- Lecture et marquage des notifications.
- Demandes de catégories via la RPC `demander_categorie_supplementaire` et annulation d'une demande en attente.

La présence de code client ne prouve pas que ces opérations fonctionnent sur l'environnement distant : elles dépendent des migrations, de la RPC, des politiques RLS, des buckets et des secrets effectivement déployés.

### Paiements membre

`initierPaiement()` et `obtenirPaiement()` dans `SupabaseMemberRepository` retournent encore `erreurNonBranche()`. C'est une lacune explicite de l'implémentation réelle, et non une intégration d'un prestataire. Le paiement d'adhésion candidat demeure simulé comme demandé.

Il ne faut pas simplement déléguer les paiements membre à `mockMemberRepository` depuis le repository réel : le mock s'appuie sur son propre contexte de session et ses propres données, qui ne sont pas automatiquement synchronisés avec la session Supabase. Une telle délégation pourrait produire des erreurs trompeuses ou des données incohérentes. Il faudra décider d'un mode de démonstration de paiement clairement isolé, ou garder le paiement indisponible en mode réel jusqu'à une intégration contrôlée.

### RPC de demande de catégorie

Le client appelle `demander_categorie_supplementaire`. Avant la recette, confirmer que la migration créant cette RPC est présente, qu'elle correspond à la signature appelée et qu'elle applique les validations métier dans une transaction. Ne pas considérer cette fonction comme déployée parce qu'elle est référencée dans le code.

## Limites de cette étape

- Aucun code de paiement réel ni aucun prestataire n'a été ajouté.
- Aucune migration n'a été appliquée à un projet distant.
- Aucun test applicatif, build, typecheck ou test Supabase distant n'a été lancé.
- Le statut « raccordé » désigne ici la présence d'une implémentation dans le dépôt, pas sa validation en production.

## Suite recommandée

1. Auditer les migrations et Edge Functions face aux appels réellement utilisés par les services.
2. Vérifier les règles RLS et les signatures RPC avant la recette.
3. Finaliser les lacunes non liées au paiement.
4. Conserver les paiements explicitement mockés sans les faire passer pour des paiements réels.
5. À la fin du développement, effectuer la compilation et les tests prévus dans `docs/TEST_PLAN.md`.
