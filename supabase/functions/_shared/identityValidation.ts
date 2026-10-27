/** Limites d'entrée cohérentes pour les champs d'identité du parcours candidat. */
const LONGUEURS_MAXIMALES: Record<string, number> = {
  nom: 100,
  prenom: 100,
  date_naissance: 10,
  cin: 50,
  telephone: 30,
  email: 254,
  adresse: 500,
};

/**
 * Vérifie les types des champs connus lorsqu'ils sont fournis.
 * Les champs absents restent permis pour les mises à jour partielles ; une valeur
 * explicitement fournie doit être une chaîne, et non un objet, tableau, nombre ou null.
 */
export function identiteTypesValides(identite: Record<string, unknown>): boolean {
  for (const champ of Object.keys(LONGUEURS_MAXIMALES)) {
    if (Object.prototype.hasOwnProperty.call(identite, champ) && typeof identite[champ] !== 'string') {
      return false;
    }
  }
  return true;
}

/** Vérifie les longueurs sans remplacer la validation métier SQL. */
export function identiteRespecteLongueurs(identite: Record<string, unknown>): boolean {
  for (const [champ, maximum] of Object.entries(LONGUEURS_MAXIMALES)) {
    const valeur = identite[champ];
    if (typeof valeur === 'string' && valeur.length > maximum) return false;
  }
  return true;
}


/** Vérifie les formats textuels usuels sans remplacer les règles métier SQL. */
export function identiteRespecteFormats(identite: Record<string, unknown>): boolean {
  const email = identite.email;
  if (typeof email === 'string' && email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return false;
  }

  const date = identite.date_naissance;
  if (typeof date === 'string' && date.trim() !== '') {
    const valeur = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false;
    const [annee, mois, jour] = valeur.split('-').map(Number);
    const parsed = new Date(Date.UTC(annee, mois - 1, jour));
    if (parsed.getUTCFullYear() !== annee || parsed.getUTCMonth() !== mois - 1 || parsed.getUTCDate() !== jour) return false;
  }

  const telephone = identite.telephone;
  if (typeof telephone === 'string' && telephone.trim() !== '') {
    const valeur = telephone.trim();
    if (!/^\+261[0-9]{9}$/.test(valeur)) return false;
  }
  return true;
}


/**
 * Normalise les espaces en bordure des champs d'identité connus.
 * L'e-mail est également mis en minuscules pour éviter les variantes dues à la casse.
 * Cette fonction doit être appelée après identiteTypesValides afin de ne pas
 * convertir silencieusement des valeurs d'un type inattendu.
 */
export function normaliserChampsIdentite(identite: Record<string, unknown>): Record<string, unknown> {
  const resultat: Record<string, unknown> = { ...identite };
  for (const champ of Object.keys(LONGUEURS_MAXIMALES)) {
    const valeur = resultat[champ];
    if (typeof valeur === 'string') resultat[champ] = valeur.trim();
  }
  if (typeof resultat.email === 'string') resultat.email = resultat.email.toLowerCase();
  return resultat;
}
