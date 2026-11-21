import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));

/** Charge le vrai fichier parametres/AAAA.json du dépôt (pas de copie dans les tests). */
export function chargerParametres(annee = 2026): any {
  return JSON.parse(readFileSync(resolve(ici, `../../../parametres/${annee}.json`), 'utf8'));
}
