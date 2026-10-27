# Étape 14 — Fiabilisation du brouillon local

## Changements

- Le contenu relu depuis `AsyncStorage` est désormais traité comme une donnée non fiable : l'objet racine, l'identité, les pièces, les œuvres, les attestations et les champs de date sont contrôlés avant réutilisation.
- Les éléments de pièces/œuvres manifestement mal formés sont ignorés plutôt que transmis tels quels au formulaire.
- Un JSON illisible ou une structure racine incompatible est supprimé du stockage local pour éviter de répéter l'erreur à chaque ouverture.
- Les écritures et la suppression du brouillon sont sérialisées pour éviter qu'une sauvegarde antérieure termine après la réinitialisation et restaure des données supprimées.
- Le contexte expose un indicateur `erreurPersistance` et l'actualise en cas d'échec de lecture, de sauvegarde ou de suppression. Les écrans pourront l'afficher dans une prochaine étape.

## Limites

- Cette validation est une protection de robustesse locale, pas une validation métier serveur.
- Le brouillon contient des données personnelles : l'appareil doit rester protégé. Le stockage local n'est pas chiffré par cette étape.
- Les URI locales et les fichiers peuvent devenir indisponibles après déplacement ou suppression par le système.
- Aucun test applicatif, build ou contrôle TypeScript n'a été exécuté, conformément à la demande de regrouper les tests à la fin du développement.
