import { describe, expect, it } from 'vitest';
import { ParametreManquantError, Parametres } from '../src';
import { chargerParametres } from './aide';

describe('lecteur de paramètres', () => {
  it('lit les valeurs 2026 publiées sans avertissement', () => {
    const p = new Parametres(chargerParametres());
    expect(p.annee).toBe(2026);
    expect(p.nombre('plafonds_securite_sociale.pmss_mensuel')).toBe(4005);
    expect(p.nombre('smic.horaire_brut')).toBe(12.02);
    expect(p.avertissements.size).toBe(0);
  });

  it('signale les valeurs À VÉRIFIER, y compris par héritage de section', () => {
    const p = new Parametres(chargerParametres());
    p.nombre('reduction_generale.Tmin');
    p.cotisation('ags');
    expect([...p.avertissements]).toEqual(['reduction_generale.Tmin', 'cotisations.ags']);
  });

  it('refuse de calculer avec une valeur null (jamais de valeur inventée)', () => {
    const p = new Parametres(chargerParametres());
    expect(() => p.nombre('smic.minimum_garanti')).toThrow(ParametreManquantError);
    expect(() => p.cotisation('accident_travail')).toThrow(/doit être saisi/);
  });

  it('refuse un chemin inconnu', () => {
    const p = new Parametres(chargerParametres());
    expect(() => p.nombre('smic.inexistant')).toThrow(/inconnu/);
  });

  it('refuse un fichier sans année', () => {
    expect(() => new Parametres({})).toThrow(ParametreManquantError);
  });

  it('chaque cotisation du fichier a un statut', () => {
    const json = chargerParametres();
    for (const [code, c] of Object.entries<any>(json.cotisations)) {
      if (code.startsWith('_') || code === 'base_csg') continue;
      expect(['publie', 'A_VERIFIER', 'stable'], code).toContain(c.statut);
    }
  });
});
