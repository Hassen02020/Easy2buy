-- Migration 0001 : Bon de Livraison
-- Ajoute les colonnes logistiques à la table orders

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "delivery_notes"   TEXT,
  ADD COLUMN IF NOT EXISTS "courier_remarks"  TEXT;
