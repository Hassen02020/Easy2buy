# JardinDelivery 🌿

Landing page e-commerce pour la vente et livraison de plantes.

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS** — palette vert forêt + crème
- **Framer Motion** — animations fluides
- **Zustand** — état du panier (persisté en localStorage)
- **React Hook Form + Zod** — formulaire de commande avec validation
- **Drizzle ORM + PostgreSQL** — base de données des commandes

## Démarrage

```bash
npm install
cp .env.example .env.local
# Éditer DATABASE_URL dans .env.local
npm run dev
```

## Base de données

```bash
npm run db:push    # Pousser le schéma vers PostgreSQL
npm run db:studio  # Ouvrir Drizzle Studio
```

## Structure

```
src/
├── app/
│   ├── api/order/route.ts   # POST /api/order — reçoit et enregistre les commandes
│   ├── layout.tsx
│   └── page.tsx             # Landing page principale
├── components/
│   ├── ProductCard.tsx      # Carte produit avec ajout panier
│   ├── CartDrawer.tsx       # Tiroir panier animé
│   └── OrderForm.tsx        # Formulaire de commande (RHF + Zod)
├── data/products.ts         # Catalogue de plantes (à remplacer par DB)
├── db/
│   ├── schema.ts            # Schéma Drizzle ORM
│   └── index.ts             # Instance DB
├── store/cart.ts            # Store Zustand
└── types/product.ts         # Types TypeScript
```

## Variables d'environnement

```env
DATABASE_URL=postgres://user:password@host:5432/jardin_delivery
```

## Déploiement Vercel

### 1. Base de données — Neon (PostgreSQL serverless gratuit)

1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer un projet → copier la **Connection string** (format `postgresql://...?sslmode=require`)
3. Exécuter les migrations sur Neon :
   ```bash
   DATABASE_URL="postgresql://..." npm run db:push
   ```

### 2. Déploiement sur Vercel

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le repo GitHub `Hassen02020/Easy2buy`
3. Dans **Environment Variables**, ajouter :
   - `DATABASE_URL` → coller la connection string Neon
4. Cliquer **Deploy** ✅

### 3. Variables optionnelles

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Notifications WhatsApp |
| `TWILIO_AUTH_TOKEN` | Notifications WhatsApp |
| `RESEND_API_KEY` | Notifications email |
