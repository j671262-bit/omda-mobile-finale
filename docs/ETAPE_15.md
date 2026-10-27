# Étape 15 — Signalement visible des erreurs de sauvegarde du brouillon

## Changements

- Création de `BrouillonPersistanceAlerte`, un composant partagé qui lit l'indicateur `erreurPersistance` du contexte et affiche un bandeau d'erreur explicite lorsque le stockage local n'a pas confirmé une opération.
- Affichage du bandeau sur l'accueil public et dans les écrans principaux du parcours d'adhésion : identité, catégorie, documents et œuvres, récapitulatif.
- Le message précise que les dernières modifications ne sont pas confirmées comme enregistrées sur l'appareil et conseille de vérifier l'espace disponible et de réessayer avant de quitter.
- Le bandeau disparaît automatiquement quand une opération de persistance ultérieure réussit, selon le comportement du contexte existant.

## Limites

- L'indicateur signale une erreur de stockage, mais ne peut pas récupérer les données qu'AsyncStorage n'a pas enregistrées.
- La sauvegarde locale n'est pas chiffrée par cette étape.
- Aucun test applicatif, build ou contrôle TypeScript n'a été exécuté, conformément à la consigne de regrouper les tests à la fin du développement.
