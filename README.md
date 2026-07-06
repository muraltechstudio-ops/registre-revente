# Registre de Revente

Application web de gestion de stock et de suivi des ventes pour revendeur
professionnel (achats en lots aux enchères, revente à l'unité sur Vinted,
Leboncoin, Facebook Marketplace, TikTok Shop, Temu, Whatnot…).

**Stack technique :** Next.js 14 (Pages Router), Tailwind CSS, Supabase
(Postgres + Auth), déploiement Vercel.

---

## ⚠️ Cohabitation Supabase

Ce projet utilise un projet Supabase **existant** qui contient déjà d'autres
tables pour d'autres applications.

**Toutes les tables de cette application sont préfixées `revente_`** pour ne
jamais entrer en conflit avec l'existant. Le schéma SQL ne touche à aucune
table qui ne commence pas par `revente_`.

---

## Pré-requis

- Node.js 18+
- npm
- Un compte Supabase (gratuit suffit)
- Un compte Vercel (facultatif pour le déploiement)

## Setup local

### 1. Cloner et installer

```bash
git clone <url-du-repo> registre-revente
cd registre-revente
npm install
```

### 2. Variables d'environnement

Copie le fichier `.env.local.example` en `.env.local` :

```bash
cp .env.local.example .env.local
```

Les valeurs par défaut pointent déjà vers le projet Supabase partagé. Si tu
utilises ton propre projet, remplace-les :

```
NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta-cle-anon
```

### 3. Base de données

1. Va dans le **SQL Editor** de ton dashboard Supabase.
2. Ouvre le fichier `supabase/schema.sql`.
3. Copie-colle tout le contenu et exécute-le.

> Ce script est **idempotent** : tu peux l'exécuter plusieurs fois sans
> risque d'erreur (merci les `create table if not exists` / `drop policy if exists`).

### 4. Migration photo

Optionnel — si tu veux pouvoir ajouter des photos aux articles :

1. Exécute `supabase/migration_photo.sql` dans le SQL Editor Supabase.
2. Crée un bucket de stockage public :

   - Va dans **Storage → Nouveau bucket**
   - Nom : `produits-photos`
   - Public : ✅ **Oui**
   - RLS : applique ces policies dans **Storage → Policies** :

   ```sql
   -- Permettre l'upload à tout utilisateur authentifié
   create policy "Upload produits-photos"
   on storage.objects for insert
   with check (
     bucket_id = 'produits-photos'
     and auth.role() = 'authenticated'
   );

   -- Permettre la lecture publique
   create policy "Read produits-photos"
   on storage.objects for select
   using (bucket_id = 'produits-photos');
   ```

   Ou utilise le bouton **Create policy** → **For full custom** → colle ces deux policies.

### 5. Créer un utilisateur

Toujours dans le dashboard Supabase :
1. Va dans **Authentication → Users**.
2. Clique sur **Add User** et crée un compte email/mot de passe.
3. Confirme son email en exécutant dans le SQL Editor :

   ```sql
   UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'ton-email';
   ```

4. Retourne à l'app et connecte-toi avec ces identifiants.

### 6. Lancer le serveur de développement

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

---

## Déploiement Vercel

### Option A — Déploiement automatique (recommandé)

1. Pousse le code sur un dépôt GitHub.
2. Va sur [vercel.com](https://vercel.com) et importe le dépôt.
3. Vercel détecte automatiquement Next.js.
4. Ajoute les variables d'environnement dans le dashboard Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Déploie.

### Option B — CLI Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## Utilisation

### Connexion

Seuls les utilisateurs créés manuellement dans Supabase Auth peuvent se
connecter. Il n'y a pas d'inscription publique.

### Tableau de bord

Page d'accueil après connexion. Affiche :

- **4 cartes KPI** : valeur du stock, bénéfice cumulé, bénéfice et ventes du mois
- **Graphique en barres** : bénéfice net par mois (12 mois glissants)
- **Graphique en anneau** : répartition du bénéfice par plateforme
- **Top 5 articles** les plus rentables avec barre de progression visuelle

### Stock

- Barre de recherche texte en temps réel et filtres par catégorie (chips cliquables)
- Tableau desktop / cartes mobile
- Badge "Stock faible" quand il reste ≤ 3 unités
- Bouton "Vendre" sur chaque ligne pour créer une vente rapidement
- Modal d'ajout/édition avec upload de photo optionnel
- Modal de confirmation pour la suppression

### Ventes

- Formulaire réorganisé en 2 colonnes (infos produit/vente, infos client optionnelles)
- Sélection produit avec pré-remplissage automatique des prix
- Avertissement si la quantité vendue dépasse le stock disponible
- Recherche + filtres par plateforme et période
- Historique complet avec bénéfices en monospace vert/rouge
- Ligne de total général sur les lignes filtrées (desktop et mobile)
- Export CSV (UTF-8 BOM, compatible Excel français)

---

## Licence

Usage personnel.
