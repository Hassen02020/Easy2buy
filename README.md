# Easy2Buy 🌿

Plateforme e-commerce complète de vente et livraison de plantes en Tunisie, avec backoffice de gestion intégré.

**🔗 Production :** https://easy2buy.vercel.app
**📦 GitHub :** https://github.com/Hassen02020/Easy2buy

---

## Audit de la solution

### ✅ Points forts
- Transactions ACID complètes sur la création de commande (verrou stock, rollback auto)
- Machine d'état stricte sur le cycle de vie commande (PENDING→CONFIRMED→PREPARING→SHIPPED→DELIVERED)
- Système de fidélité client automatique (tiers NEW/BRONZE/SILVER/GOLD)
- Système de parrainage avec codes uniques et récompenses
- Upload photo produit via Cloudinary en production, filesystem local en dev
- Internationalisation FR/AR intégrée (i18n maison)
- RBAC (contrôle d'accès par rôle : ADMIN / AGENT / LIVREUR)
- Bon de livraison et facture imprimables
- Connexion DB poolée et optimisée pour serverless (max:1 connexion sur Vercel)

### ⚠️ Points d'attention
- Pas d'authentification sur le backoffice `/admin/*` (à sécuriser en production)
- Notifications WhatsApp/Email désactivées si variables Twilio/Resend absentes
- Endpoint debug `/api/debug/stress-test` encore accessible (bloqué en prod uniquement)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16.2.7 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 3, Framer Motion 12 |
| Formulaires | React Hook Form 7 + Zod 3 |
| État global | Zustand 5 (panier persisté localStorage) |
| ORM | Drizzle ORM 0.44 |
| Base de données | PostgreSQL serverless (Neon) |
| Upload fichiers | Cloudinary (prod) / filesystem (dev) |
| Déploiement | Vercel (région cdg1 Paris) |
| Icons | Lucide React |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                        # Frontoffice — boutique client
│   ├── layout.tsx                      # Layout racine
│   ├── globals.css                     # Styles globaux + vendor prefixes
│   ├── suivi/
│   │   ├── page.tsx                    # Suivi commande client
│   │   └── [id]/facture/page.tsx       # Facture imprimable (DELIVERED uniquement)
│   ├── admin/
│   │   ├── layout.tsx                  # Layout backoffice
│   │   ├── actions.ts                  # Server Actions (CRUD produits, staff)
│   │   ├── dashboard/page.tsx          # Tableau de bord KPIs
│   │   ├── orders/
│   │   │   ├── page.tsx               # Liste commandes avec filtres
│   │   │   └── [id]/page.tsx          # Détail commande + bon de livraison
│   │   ├── products/page.tsx           # Gestion catalogue produits
│   │   ├── customers/page.tsx          # CRM clients + fidélité
│   │   ├── analytics/page.tsx          # Rapports financiers
│   │   └── mon-espace/page.tsx         # Espace personnel staff
│   └── api/
│       ├── orders/
│       │   ├── route.ts               # POST /api/orders — création commande ACID
│       │   └── [id]/
│       │       ├── status/route.ts    # PATCH — changement statut
│       │       └── track/route.ts     # GET — suivi public
│       ├── upload/route.ts            # POST — upload photo (Cloudinary/local)
│       └── referral/check/route.ts    # GET — vérification code parrainage
├── components/
│   ├── OrderForm.tsx                   # Formulaire commande multi-étapes
│   ├── CartDrawer.tsx                  # Panier latéral animé
│   ├── Header.tsx                      # Navigation principale
│   ├── ProductCard.tsx                 # Carte produit
│   ├── ProductDetailModal.tsx          # Modal détail produit
│   ├── DeliverySlip.tsx               # Bon de livraison imprimable
│   ├── Footer.tsx                      # Pied de page
│   ├── BottomNav.tsx                   # Navigation mobile
│   └── admin/
│       ├── AdminProductForm.tsx        # Formulaire produit + upload photo
│       └── ...
├── db/
│   ├── schema.ts                       # Schéma Drizzle (9 tables, 6 enums)
│   └── index.ts                        # Pool connexion PostgreSQL
├── lib/
│   ├── order-status.ts                 # Machine d'état commande
│   ├── loyalty.ts                      # Système fidélité (tiers + score)
│   ├── referral.ts                     # Parrainage (génération + application)
│   ├── delivery.ts                     # Calcul frais de livraison par ville
│   ├── notifications.ts               # WhatsApp (Twilio) + Email (Resend)
│   ├── payment.ts                      # Logique paiement + avances
│   ├── profitability.ts               # Calcul marge par ligne
│   ├── rbac.ts                         # Contrôle d'accès par rôle
│   └── i18n.ts                         # Traductions FR/AR
├── store/
│   └── cart.ts                         # Store Zustand panier
└── data/
    └── products.ts                     # Catalogue statique initial
```

---

## Schéma de base de données

| Table | Description |
|-------|-------------|
| `staff` | Personnel backoffice (ADMIN / AGENT / LIVREUR) |
| `products` | Catalogue produits avec stock, images, caractéristiques |
| `orders` | Commandes avec statut, paiement, staff assigné |
| `order_items` | Lignes de commande avec prix et marge |
| `customer_profiles` | Profils clients avec tier fidélité et score |
| `customer_gifts` | Cadeaux et coupons fidélité |
| `referrals` | Codes et statuts de parrainage |
| `workflow_events` | Journal d'événements par commande |

### Cycle de vie commande
```
PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED
                                          ↘ RETURNED
       → CANCELLED
```

---

## Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/Hassen02020/Easy2buy.git
cd Easy2buy

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs
```

### `.env.local` requis

```env
# Base de données PostgreSQL (Neon ou locale)
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# Cloudinary — upload photos produits (optionnel en dev)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_UPLOAD_PRESET=votre_upload_preset

# Notifications WhatsApp via Twilio (optionnel)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=+14155238886

# Notifications email via Resend (optionnel)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTIFICATION_EMAIL_TO=admin@votredomaine.com
```

```bash
# 4. Pousser le schéma en base
npm run db:push

# 5. Lancer en développement
npm run dev
```

Ouvrir http://localhost:3000

---

## Commandes disponibles

```bash
npm run dev          # Serveur de développement (Turbopack)
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # ESLint

npm run db:push      # Synchroniser le schéma en DB
npm run db:generate  # Générer les fichiers de migration SQL
npm run db:studio    # Interface visuelle Drizzle Studio

npm run stress:dry   # Stress test simulation (sans écriture DB)
npm run stress:small # Stress test 50 commandes
npm run stress:run   # Stress test 500 commandes
```

---

## Déploiement Vercel

### 1. Base de données Neon

1. Créer un compte sur [neon.tech](https://neon.tech)
2. Nouveau projet → copier la **Connection string**
3. Pousser le schéma :
   ```bash
   DATABASE_URL="postgresql://..." npm run db:push
   ```

### 2. Cloudinary (upload photos)

1. Créer un compte sur [cloudinary.com](https://cloudinary.com)
2. Settings → Upload Presets → **Add upload preset** (mode: unsigned)
3. Noter le `Cloud Name` et le nom du preset

### 3. Variables d'environnement sur Vercel

Aller dans **Vercel Dashboard → Project → Settings → Environment Variables** et ajouter :

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | ✅ | Connection string Neon PostgreSQL |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Nom du cloud Cloudinary |
| `CLOUDINARY_UPLOAD_PRESET` | ✅ | Preset d'upload Cloudinary |
| `TWILIO_ACCOUNT_SID` | ⚠️ Optionnel | Notifications WhatsApp |
| `TWILIO_AUTH_TOKEN` | ⚠️ Optionnel | Notifications WhatsApp |
| `TWILIO_WHATSAPP_FROM` | ⚠️ Optionnel | Numéro WhatsApp Twilio |
| `RESEND_API_KEY` | ⚠️ Optionnel | Notifications email |
| `NOTIFICATION_EMAIL_TO` | ⚠️ Optionnel | Email destinataire admin |

### 4. Déployer via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## API Reference

### Frontoffice

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/orders` | Créer une commande (transaction ACID) |
| `GET` | `/api/orders/[id]/track` | Suivi public commande |
| `GET` | `/api/referral/check?phone=...` | Vérifier code parrainage |

### Backoffice

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `PATCH` | `/api/orders/[id]/status` | Changer statut commande |
| `POST` | `/api/upload` | Upload photo produit |

### Exemple — Créer une commande

```bash
curl -X POST https://easy2buy.vercel.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Yasmine Ben Salah",
    "customerPhone": "+21622987654",
    "customerCity": "Tunis",
    "customerAddress": "12 Rue de la République, Tunis Centre",
    "items": [{ "productId": 1, "quantity": 2 }],
    "paymentMethod": "CASH_ON_DELIVERY"
  }'
```

---

## Méthodes de paiement

| Code | Description |
|------|-------------|
| `CASH_ON_DELIVERY` | Paiement à la livraison (défaut) |
| `D17` | D17 Tunisie (paiement mobile) |
| `FLOUCI` | Application Flouci |
| `ONLINE` | Carte bancaire en ligne |
| `BANK_TRANSFER` | Virement bancaire |

---

## Rôles du personnel

| Rôle | Accès |
|------|-------|
| `ADMIN` | Accès total — dashboard, produits, staff, analytics |
| `AGENT` | Gestion des commandes, assignation livreurs |
| `LIVREUR` | Consultation commandes assignées uniquement |
