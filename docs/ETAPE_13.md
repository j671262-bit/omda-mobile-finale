# Étape 13 — Reprise du brouillon local

## Changements

- `AdhesionDraftProvider` est désormais monté au niveau racine de l’application, au lieu d’être limité au groupe de routes d’adhésion. Le même état de brouillon est ainsi partagé entre l’accueil et les écrans du formulaire.
- L’accueil affiche « Reprendre mon brouillon » lorsqu’un brouillon local non soumis contient des informations et que son chargement est terminé.
- L’action ouvre à nouveau le formulaire d’identité ; les valeurs déjà persistées dans `AsyncStorage` sont réutilisées.
- Les dossiers ayant déjà un numéro de dossier enregistré ne sont pas présentés comme des brouillons à reprendre.

## Limites

- Il s’agit de la reprise du brouillon local sur le même appareil. Cette étape ne transforme pas un dossier distant consulté avec le numéro et le code de suivi en brouillon modifiable.
- Les chemins locaux des fichiers peuvent devenir invalides si les fichiers sources sont déplacés ou supprimés par le système.
- Aucun test applicatif, build ou vérification TypeScript n’a été exécuté conformément à la consigne de reporter les tests jusqu’à la fin du projet.
