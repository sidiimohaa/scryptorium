# SCRYPTORIUM

> « Chaque livre est une porte vers un autre monde. »

Bibliothèque personnelle, fiches de lecture et (bientôt) club littéraire — avec une salle de lecture en 3D que l'on parcourt rayonnage par rayonnage.

Deux façons d'entrer, une seule base de données :

- **Mode Immersion** (`/bibliotheque`) : la salle 3D, ses bibliothèques sculptées, ses volumes que l'on tire du rayonnage.
- **Mode Catalogue** (`/catalogue`) : registre rapide, filtrable, accessible, sans WebGL.

---

## Sommaire

1. [Démarrage rapide](#démarrage-rapide)
2. [Architecture](#architecture)
3. [Variables d'environnement](#variables-denvironnement)
4. [Gérer la bibliothèque](#gérer-la-bibliothèque)
5. [Google Drive & assistant IA](#google-drive--assistant-ia)
6. [Passer à Supabase](#passer-à-supabase)
7. [Déploiement (Vercel)](#déploiement-vercel)
8. [État d'avancement](#état-davancement)

---

## Démarrage rapide

Prérequis : Node.js 20+.

```bash
npm install
cp .env.example .env.local   # puis renseigner ADMIN_PASSWORD et SESSION_SECRET
npm run seed                 # crée data/library.json (rayonnages + première fiche)
npm run dev
```

- Site : http://localhost:3000
- Bureau du Bibliothécaire : http://localhost:3000/bureau

Sans Supabase, toutes les données vivent dans `data/library.json` (archive locale versionnable). C'est le mode par défaut en développement.

> **Données et dépôt Git.** `data/library.json` est versionné : il contient la bibliothèque telle qu'elle est publiée (fiches, notes, avis). Le texte brut des documents importés et les brouillons IA sont rangés dans `data/private/`, et les secrets dans `data/.secrets.json` ; ces deux emplacements sont ignorés par git. Attention : les notes marquées « privées » restent dans `library.json` — dans un dépôt public, utilisez Supabase pour les garder réellement privées.

---

## Architecture

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions), TypeScript | Rendu serveur, SEO, actions sécurisées côté serveur |
| Styles | Tailwind CSS 4 + jetons de design (`src/app/globals.css`) | Palette et typographie centralisées |
| 3D | three.js · React Three Fiber · Drei | Salle procédurale, sans modèle externe à télécharger |
| Données | Interface `Repository` à deux pilotes : **archive JSON locale** ou **Supabase/PostgreSQL** | Fonctionne immédiatement, évolue sans réécriture |
| Validation | Zod (`src/lib/types.ts`) | Chaque écriture est validée |
| Métadonnées | Open Library (+ Google Books) | Proposition, jamais publication automatique |
| Extraction | `mammoth` (DOCX), `unpdf` (PDF) | Import des notes personnelles |
| IA | SDK Anthropic (Claude) | Brouillons à partir des notes, toujours relus |

### Arborescence

```
src/
  app/
    page.tsx                  Accueil : ouverture cinématographique + Livre du jour
    bibliotheque/             Mode Immersion (salle 3D)
    catalogue/                Mode Catalogue
    livres/[slug]/            Fiche détaillée (présentation, résumé, avis, citations, connexions)
    rayonnages/[slug]/        Un rayonnage
    coups-de-coeur/           Cabinet des Coups de Cœur
    cabinet/                  Statistiques personnelles + chronologie
    archives/                 Historique des avis (relectures)
    club/                     Club de lecture (en préparation — rien de fictif)
    bureau/                   Le Bureau du Bibliothécaire (admin protégé)
      actions.ts              Toutes les Server Actions (chacune vérifie la session)
    api/                      Recherche, métadonnées, OAuth Google Drive
  components/
    library3d/                Scène 3D (salle, rayonnages, livres, caméra)
    bureau/                   Formulaires d'administration
  lib/
    types.ts                  Modèle de données + schémas Zod
    store/                    Pilotes de stockage (local, supabase)
    auth.ts                   Session admin signée (HMAC, cookie httpOnly)
    metadata.ts · extract.ts · drive.ts · ai.ts · stats.ts · library.ts
supabase/schema.sql           Schéma PostgreSQL complet + RLS (inclut les tables du club)
scripts/                      seed.mjs · push-to-supabase.mjs
data/library.json             Archive locale
```

### Modèle de données

`books` · `categories` (+ `book_categories`, un livre peut appartenir à plusieurs rayonnages) · `notes` (note / citation / annotation, privée ou publique, page) · `reviews` (avis **versionnés** : chaque relecture crée une version, les précédentes vont aux Archives) · `imports` (source, texte extrait, empreinte anti-doublon, brouillon IA) · `settings` · `app_secrets` (serveur uniquement). Tables du club prêtes : `profiles` (rôles admin/membre), `discussions`, `comments` (modération, spoilers), `votes`, `bookmarks`.

### Sécurité

- Pages et actions du Bureau protégées **côté serveur** (`requireAdmin()` dans le layout, chaque page et chaque action).
- Mot de passe comparé en temps constant, limitation des tentatives, cookie `httpOnly` / `SameSite=Lax` / `Secure` en production, expiration 12 h.
- Aucun secret côté client : clés Supabase service-role, Google et Anthropic ne sont lues que dans des modules `server-only`.
- OAuth Google : paramètre `state` anti-CSRF, portée **lecture seule**, jeton de rafraîchissement stocké côté serveur, révocable depuis le Bureau. Les imports sont restreints au dossier autorisé.
- RLS Supabase activée sur toutes les tables ; le rôle anonyme ne lit que le contenu publié.
- Entrées validées par Zod ; Markdown rendu sans HTML brut ; en-têtes de sécurité HTTP.

---

## Variables d'environnement

Voir `.env.example`.

| Variable | Requise | Rôle |
|---|---|---|
| `ADMIN_PASSWORD` | oui (admin) | Mot de passe du Bureau |
| `SESSION_SECRET` | oui (admin) | Clé de signature des sessions (≥ 32 caractères) |
| `NEXT_PUBLIC_SITE_URL` | prod | URL publique (SEO, sitemap, retour OAuth) |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | prod | Active le pilote Supabase |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | non | Intégration Google Drive |
| `GOOGLE_BOOKS_API_KEY` | non | Quota Google Books étendu |
| `ANTHROPIC_API_KEY` | non | Assistant de lecture IA |

Toute intégration absente est signalée dans **Bureau → Réglages** ; le site fonctionne sans elle.

---

## Gérer la bibliothèque

Tout se fait depuis **/bureau**, sans toucher au code.

- **Ajouter un livre** : saisir titre + auteur → « Rechercher les métadonnées » → choisir une notice. Seuls les champs réellement fournis sont remplis, chacun marqué « via Open Library — à vérifier ». La fiche est créée en **brouillon**.
- **Modifier** : identité, couverture (URL ou fichier), couleur de reliure (utilisée en 3D), rayonnages, statut (À lire · En cours · Terminé · Abandonné · À relire), note (sur 5 ou 10), dates, résumé sans révélation, analyse avec spoilers, éditorial « coup de cœur ».
- **Mon avis** : champs dédiés (apprécié, moins aimé, personnages, thèmes, interprétation, enseignements, recommandations, spoilers). Cocher « Relecture » crée une nouvelle version ; l'ancienne rejoint **Les Archives**.
- **Notes & citations** : privées par défaut, publiables une à une, avec page.
- **Publier / dépublier / archiver / supprimer** depuis l'en-tête de la fiche.
- **Rayonnages** : créer, renommer, réordonner, changer l'accent, fusionner, supprimer. La salle 3D s'agrandit automatiquement.
- **Réglages** : échelle de notation, objectif annuel, Livre du jour (sinon rotation quotidienne).

Mise en forme des textes : `## Titre`, `### Sous-titre`, `- liste`, `**gras**`, `*italique*`, `> citation`.

Une fiche sans note, statut ni avis affiche « Fiche en préparation — avis personnel à venir ». Les statistiques ne comptent que les livres marqués *Terminé* / *À relire*.

---

## Google Drive & assistant IA

**Méthode 1 — manuelle (toujours disponible)** : Bureau → Imports. Téléverser un PDF/DOCX/TXT/MD, coller un texte, ou référencer un lien Drive. Le texte extrait peut être associé à une fiche puis versé dans ses notes privées. Les doublons sont détectés par empreinte SHA-256.

**Méthode 2 — Drive connecté** :

1. Google Cloud Console → activer l'API Google Drive → créer un client OAuth « Application Web ».
2. URI de redirection : `${NEXT_PUBLIC_SITE_URL}/api/drive/callback`.
3. Renseigner `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, redémarrer.
4. Bureau → Imports → « Connecter mon Google Drive » → choisir le dossier autorisé → importer les documents (Google Docs, PDF, DOCX, TXT).

Accès en lecture seule : rien n'est jamais modifié, partagé ni rendu public sur votre Drive.

**Assistant IA** (`ANTHROPIC_API_KEY`) : sur un import associé à une fiche, choisir une tâche (synthèse, résumé structuré, thèmes, pistes, fiche complète, questions pour le club). Le brouillon sépare « D'après vos notes » de « Repères généraux — à vérifier » et liste les incertitudes. Il n'est **jamais** publié : vous copiez ce que vous validez. Le modèle utilisé est `claude-opus-5-5`, avec repli automatique côté serveur si une requête est déclinée.

---

## Passer à Supabase

1. Créer un projet Supabase.
2. Éditeur SQL → exécuter `supabase/schema.sql` (crée tables, RLS et le bucket `covers`).
3. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
4. Transférer l'archive locale : `npm run push:supabase`.
5. Redémarrer : le Bureau indique « Stockage : Supabase ».

---

## Déploiement (Vercel)

1. Importer le dépôt dans Vercel.
2. Définir les variables d'environnement (au minimum `ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`).
3. **Production : configurer Supabase.** Le système de fichiers Vercel est en lecture seule : sans Supabase, le site affiche l'archive commitée mais le Bureau refuse les modifications (message explicite).
4. Pour Drive, ajouter l'URI de redirection de production au client OAuth.

Contrôles : `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Expérience & accessibilité

- Ouverture complète à la première visite, instantanée ensuite (rejouable). Respect de `prefers-reduced-motion` + bouton « Animations : réduites ».
- Salle 3D : survol (le livre se détache), clic (il glisse, la caméra s'approche, il pivote, la fiche apparaît), « Replacer dans le rayonnage ». Flèches ← → entre rayonnages, Échap pour reculer, H pour le hall.
- Mode léger automatique (petits écrans, processeurs modestes, baisse de framerate détectée) ou manuel. Repli complet sans WebGL.
- Liens profonds : `/bibliotheque?livre=<slug>`, `/bibliotheque?rayon=<slug>`.
- Recherche universelle `⌘K` / `Ctrl+K` sur toutes les pages.
- Table de Lecture : déposer plusieurs ouvrages et consulter leurs fiches sans quitter la page.
- Liens d'évitement, navigation clavier, lecteurs d'écran (liste textuelle des livres de la salle), JSON-LD `Book`, sitemap, robots.

---

## État d'avancement

| Phase | État |
|---|---|
| 1 — Fondations (architecture, données, design system, accueil, catalogue, fiches, Bureau) | ✅ |
| 2 — Salle immersive (3D, rayonnages, interactions, navigation, mode léger) | ✅ |
| 3 — Expérience littéraire (avis versionnés, citations, coups de cœur, statistiques, archives, connexions) | ✅ (graphe visuel des connexions : à venir) |
| 4 — Club de lecture | ⏳ schéma SQL et RLS prêts ; comptes membres, discussions, votes, marque-pages à implémenter. La page `/club` l'annonce sans contenu fictif. |
| 5 — Google Drive & IA | ✅ import manuel, OAuth Drive lecture seule, assistant IA (nécessitent leurs clés) |
| 6 — Finitions | en continu |

Contenu initial : *Le Meurtre de Roger Ackroyd* (Agatha Christie, 1926) — données bibliographiques issues d'Open Library, résumé et analyse rédigés par SCRYPTORIUM (marqués comme tels), **aucune note, statut ni avis inventés**.
