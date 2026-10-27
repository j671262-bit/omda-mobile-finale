# Étape 17 — Cycle de vie local du dossier candidat

## Changements

- Ajout du champ local `etat_envoi_local`, distinct du statut officiel du serveur : `SAISIE_LOCALE`, `BROUILLON_SERVEUR`, `ENVOI_INCERTAIN` ou `ENVOI_CONFIRME`.
- Les brouillons existants sont normalisés à la lecture. Les anciens brouillons avec numéro et code sont considérés comme des brouillons serveur, sauf si leur état local explicite indique qu'un envoi est incertain ou confirmé.
- L'accueil permet de reprendre un brouillon local ou un brouillon serveur connu. Si l'envoi est incertain, il propose de vérifier le dossier au lieu de relancer immédiatement une soumission potentiellement déjà acceptée.
- Après une réponse réseau/serveur ambiguë pendant la soumission, le contexte conserve l'état `ENVOI_INCERTAIN` et le récapitulatif propose la consultation du suivi.
- Si le suivi serveur confirme un statut autre que `BROUILLON`, l'état local devient `ENVOI_CONFIRME` et l'accueil propose de suivre le dossier, sans proposer de reprendre le formulaire comme un brouillon.
- Si le suivi confirme que le dossier est toujours `BROUILLON`, une action permet de revenir au récapitulatif et de retenter l'envoi.

## Limites

- `etat_envoi_local` est un indicateur de reprise sur l'appareil, pas une source d'autorité. Le statut serveur reste prioritaire.
- Le suivi dépend de l'implémentation actuellement sélectionnée par la fabrique (`mock` ou service réel). Le service candidat réel contient encore des opérations reposant sur l'API HTTP documentée ; le branchement complet du suivi sur Supabase doit être confirmé dans une étape dédiée.
- Le code de suivi est conservé localement pour permettre la vérification après une réponse réseau ambiguë. AsyncStorage n'est pas chiffré par cette étape.
- Aucun test applicatif, build ou contrôle TypeScript n'a été exécuté, conformément à la consigne de regrouper les tests à la fin du développement.
