# Étape 29 — En-têtes de sécurité des réponses candidat

## Objectif

Réduire les risques de mise en cache accidentelle de données personnelles et renforcer les protections de base des réponses HTTP des fonctions Edge publiques du parcours candidat.

## Modifications

Les fonctions `candidat-creer-demande`, `candidat-modifier-demande`, `candidat-televerser-fichier`, `candidat-soumettre-demande` et `candidat-consulter-demande` ajoutent les en-têtes suivants à leurs réponses, y compris les réponses de pré-vérification CORS, car ils sont regroupés dans `corsHeaders` :

- `Cache-Control: no-store, max-age=0` et `Pragma: no-cache` pour demander aux caches de ne pas conserver les réponses ;
- `X-Content-Type-Options: nosniff` pour empêcher l'interprétation automatique du type de contenu ;
- `Referrer-Policy: no-referrer` pour éviter l'envoi d'un référent ;
- `X-Frame-Options: DENY` pour interdire l'intégration dans un cadre navigateur ;
- `Permissions-Policy` désactivant caméra, microphone et géolocalisation pour ces réponses API.

Les en-têtes CORS existants et les méthodes autorisées ne sont pas modifiés. Aucun jeton ni aucune donnée personnelle n'est ajouté aux en-têtes.

## Limites et suite

- `Access-Control-Allow-Origin: *` reste inchangé pour préserver le comportement actuel du client ; CORS n'est pas une authentification et les fonctions publiques doivent continuer à valider chaque entrée côté serveur.
- Ces en-têtes ne remplacent ni le chiffrement TLS, ni les politiques de stockage, ni les limites anti-abus, ni la validation métier.
- Vérifier les en-têtes observés et le comportement du client lors de la recette sur appareil et en préproduction.
- Aucun test applicatif, build, contrôle TypeScript ou appel à Supabase distant n'a été exécuté, conformément à la consigne de tester uniquement lorsque le projet sera terminé.
