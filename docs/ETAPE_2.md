# Étape 2 — Opérations du membre

## Branché dans le code

- `mettreAJourProfil` : met à jour uniquement le téléphone du compte `utilisateur` connecté, puis relit le profil complet.
- `marquerNotificationLue` : marque comme lue une notification personnelle du membre connecté. Les notifications globales ne sont pas modifiées par cette action.
- `marquerToutesNotificationsLues` : marque comme lues les notifications personnelles non lues et renvoie le nombre de lignes modifiées.

Ces opérations utilisent la session Supabase et les politiques RLS existantes. Elles n'ont pas été testées contre le projet Supabase distant dans cette session.

## Toujours volontairement non branché

- `initierPaiement` et `obtenirPaiement` : restent en mock conformément à la décision de conserver le paiement simulé.
- `demanderCategorieSupplementaire` et `demanderCategorieSupplementaireAvecOeuvres` : ne pas les considérer comme fonctionnelles en mode réel avant d'avoir déplacé leurs écritures derrière une RPC SQL ou une Supabase Edge Function. La migration actuelle réserve les écritures de `membre_categorie` aux agents OMDA ; un appel direct depuis le client sera refusé par RLS. Il ne faut pas affaiblir cette politique pour faire fonctionner l'écran.

## Vérifications à effectuer localement

1. Installer les dépendances avec `npm ci`.
2. Exécuter `npm run typecheck`.
3. Tester avec un compte membre réel : mise à jour du téléphone, lecture du profil, lecture des notifications et marquage comme lu.
4. Vérifier dans Supabase que les notifications d'un autre utilisateur ne peuvent pas être modifiées.

La compilation et les tests distants n'ont pas pu être confirmés lors de la préparation de cette archive.
