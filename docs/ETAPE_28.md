# Étape 28 — Limiter la taille des corps de requête

## Objectif

Réduire le risque de consommation mémoire excessive lorsqu’une fonction Edge reçoit un JSON ou un formulaire de téléversement anormalement volumineux.

## Modifications

- Ajout de `supabase/functions/_shared/requestBody.ts` : lecture en flux du JSON, vérification préalable de `Content-Length` lorsqu’il est présent et plafond sur les octets effectivement lus.
- Création, modification et soumission : corps JSON limités à 64 Kio ; les corps trop volumineux reçoivent HTTP `413` (`CORPS_TROP_VOLUMINEUX`). Les JSON mal formés continuent de recevoir HTTP `400`.
- Téléversement : contrôle de `Content-Length` avec une marge d’un Mio au-dessus du plafond de fichier de 20 Mio, avant le parsing multipart. La vérification de taille réelle du fichier reste en place.
- Les limites anti-abus de l’étape 26 et leur ordre d’exécution de l’étape 27 sont conservés.

## Limites importantes

- Pour les téléversements dont `Content-Length` est absent ou non fiable, la passerelle Supabase doit imposer une limite de taille de requête ; le contrôle du fichier après `formData()` ne peut pas, à lui seul, empêcher le parseur multipart d’avoir déjà consommé de la mémoire.
- Le plafond de 64 Kio doit être comparé aux charges réelles du client pendant la recette ; augmenter la limite uniquement si le contrat de soumission le nécessite.
- Ce contrôle ne remplace ni l’analyse antivirus du contenu ni la validation du type réel du fichier.
- Aucun test applicatif, build, contrôle TypeScript ou appel à Supabase distant n’a été exécuté, conformément à la consigne de tester uniquement lorsque le projet sera terminé. Inspection statique uniquement.
