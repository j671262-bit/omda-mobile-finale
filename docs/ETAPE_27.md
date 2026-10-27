# Étape 27 — Appliquer les limites avant de lire le contenu des requêtes

## Objectif

Réduire le travail effectué par les fonctions Edge lorsque le quota d'une adresse réseau est déjà dépassé. Le contrôle anti-abus doit intervenir le plus tôt possible dans le traitement de chaque opération publique.

## Modifications

- `candidat-creer-demande` : contrôle du quota de création après vérification de la méthode et de la configuration Supabase, avant la lecture et la validation du JSON.
- `candidat-modifier-demande` : contrôle du quota après validation du format des en-têtes de dossier/code, avant la lecture du JSON.
- `candidat-televerser-fichier` : contrôle du quota après validation du format des en-têtes de dossier/code, avant le traitement du formulaire multipart et du fichier.
- `candidat-soumettre-demande` : contrôle du quota après validation du format des en-têtes de dossier/code, avant la lecture du JSON et les consultations de dossier/Storage.
- Les seuils, les réponses `429`/`503` et la RPC de la migration `0012` ne sont pas modifiés.

## Effet attendu

Les requêtes excédentaires sont refusées avant que la fonction ne parse le corps de la requête ou n'effectue les opérations métier/Storage. Cela ne remplace pas les limites de taille configurées au niveau de la passerelle, et ne garantit pas à lui seul la prévention des dénis de service réseau.

## Déploiement et limites

- Appliquer d'abord `supabase/migrations/0012_limitation_tentatives_operations_candidat.sql`, puis déployer les quatre fonctions concernées.
- Vérifier en préproduction que la passerelle fournit un en-tête d'adresse réseau fiable. Les valeurs d'en-tête ne doivent pas pouvoir être librement falsifiées par le client.
- Les limites restent basées sur l'adresse réseau : plusieurs utilisateurs derrière la même adresse peuvent partager un quota, tandis que des attaquants utilisant plusieurs adresses peuvent contourner une limite par IP.
- Aucun test applicatif, build, contrôle TypeScript ou appel à Supabase distant n'a été exécuté, conformément à la consigne de ne tester qu'une fois le projet terminé. La modification a fait l'objet d'une inspection statique uniquement.
