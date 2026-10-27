# Étape 16 — Récupération du brouillon après interruption

## Changements

- Ajout d'une clé de sauvegarde secondaire versionnée (`omda_adhesion_draft_v1_backup`) pour conserver la dernière version valide avant le remplacement du brouillon principal.
- Au démarrage, le contexte essaie de lire et valider le brouillon principal. Si celui-ci est absent ou invalide, il tente de restaurer la copie de secours.
- Si aucune des deux versions n'est exploitable, les entrées locales corrompues sont nettoyées plutôt que de bloquer le parcours.
- La restauration asynchrone n'écrase pas une saisie commencée pendant le chargement initial.
- La réinitialisation supprime le brouillon principal et sa copie de secours, afin qu'une ancienne version ne réapparaisse pas après une remise à zéro.

## Limites

- AsyncStorage n'est pas une base transactionnelle : cette stratégie réduit le risque de perte mais ne garantit pas la récupération dans tous les scénarios de panne ou de corruption.
- La copie de secours contient les mêmes données personnelles que le brouillon principal et n'ajoute pas de chiffrement. Il faut traiter ce stockage comme local non chiffré.
- Les chemins de fichiers conservés dans le brouillon peuvent devenir invalides si le système supprime ou déplace les fichiers concernés.
- Aucun test applicatif, build ou contrôle TypeScript n'a été exécuté, conformément à la consigne de regrouper les tests à la fin du développement.
