/* Configuration du site — seul fichier à modifier pour activer les comptes utilisateurs.
 *
 * Comptes (facultatif) : renseignez l'URL du projet Supabase et sa clé « anon » PUBLIQUE
 * (Supabase › Project Settings › API). Cette clé est faite pour être publiée : la sécurité
 * repose sur les règles Row Level Security (voir supabase/migrations/0002_progression_sync.sql).
 * Ne mettez JAMAIS ici la clé « service_role ».
 *
 * Laissés vides, le site fonctionne sans compte : la progression reste dans le navigateur
 * (localStorage) avec export / import JSON.
 */
window.CONFIG = {
  supabaseUrl: '',          // ex. 'https://abcdefghijkl.supabase.co'
  supabaseCleAnon: '',      // ex. 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

  // Date de l'épreuve du Titre professionnel Gestionnaire de paie (RNCP37948).
  dateExamen: '2027-01-27',
  heureExamen: '00:00',     // à remplacer par l'heure de votre convocation (ex. '08:30')
  libelleExamen: 'Titre professionnel Gestionnaire de paie',

  // Objectif quotidien proposé par défaut (modifiable dans le tableau de bord).
  objectifParDefaut: { minutes: 45, questions: 20, cartes: 20 }
};
