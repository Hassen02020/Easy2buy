/**
 * lib/rbac.ts
 * ------------
 * Role-Based Access Control pour le backoffice Easy2Buy.
 *
 * Usage :
 *   checkAccess("LIVREUR", "CONFIRM_DELIVERY")  → true
 *   checkAccess("AGENT",   "DELETE_PRODUCT")    → false
 *
 *   // Dans un Server Action :
 *   requireAccess(actorRole, "ASSIGN_ORDER");
 *   // Lance une RBACError si refusé
 */

import type { StaffRole } from "@/db/schema";

// ---------------------------------------------------------------------------
// Actions disponibles
// ---------------------------------------------------------------------------

export type RBACAction =
  | "VIEW_DASHBOARD"
  | "VIEW_ORDERS"
  | "VIEW_OWN_ORDERS"       // livreur/préparateur voit ses commandes
  | "ASSIGN_ORDER"          // assigner agent/préparateur/livreur
  | "CHANGE_STATUS"         // changer statut commande
  | "CONFIRM_DELIVERY"      // valider livraison + solde
  | "MARK_PACKED"           // marquer emballé
  | "MARK_PREPARED"         // marquer préparé
  | "UPDATE_DELIVERY_NOTES" // notes logistiques
  | "UPDATE_COURIER_REMARKS"// remarques livreur
  | "MANAGE_PRODUCTS"       // CRUD produits
  | "MANAGE_STAFF"          // CRUD équipe
  | "VIEW_ANALYTICS"        // analytics & finances
  | "VIEW_CUSTOMERS"        // fiche clients
  | "PRINT_DELIVERY_SLIP";  // bon de livraison

// ---------------------------------------------------------------------------
// Matrice des permissions
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS: Record<StaffRole, RBACAction[]> = {
  ADMIN: [
    "VIEW_DASHBOARD",
    "VIEW_ORDERS",
    "VIEW_OWN_ORDERS",
    "ASSIGN_ORDER",
    "CHANGE_STATUS",
    "CONFIRM_DELIVERY",
    "MARK_PACKED",
    "MARK_PREPARED",
    "UPDATE_DELIVERY_NOTES",
    "UPDATE_COURIER_REMARKS",
    "MANAGE_PRODUCTS",
    "MANAGE_STAFF",
    "VIEW_ANALYTICS",
    "VIEW_CUSTOMERS",
    "PRINT_DELIVERY_SLIP",
  ],
  AGENT: [
    "VIEW_DASHBOARD",
    "VIEW_ORDERS",
    "VIEW_OWN_ORDERS",
    "ASSIGN_ORDER",
    "CHANGE_STATUS",
    "UPDATE_DELIVERY_NOTES",
    "VIEW_CUSTOMERS",
    "PRINT_DELIVERY_SLIP",
  ],
  LIVREUR: [
    "VIEW_OWN_ORDERS",
    "CONFIRM_DELIVERY",
    "UPDATE_COURIER_REMARKS",
    "PRINT_DELIVERY_SLIP",
    "MARK_PACKED",
  ],
};

// ---------------------------------------------------------------------------
// Fonctions utilitaires
// ---------------------------------------------------------------------------

/** Vérifie si un rôle possède une permission (no-throw) */
export function checkAccess(role: StaffRole | null | undefined, action: RBACAction): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

/** Lance une RBACError si la permission est refusée */
export function requireAccess(role: StaffRole | null | undefined, action: RBACAction): void {
  if (!checkAccess(role, action)) {
    throw new RBACError(role, action);
  }
}

/** Labels lisibles pour l'UI */
export const ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN:   "Administrateur",
  AGENT:   "Agent / Commercial",
  LIVREUR: "Livreur",
};

export const ROLE_COLORS: Record<StaffRole, string> = {
  ADMIN:   "bg-purple-100 text-purple-700",
  AGENT:   "bg-blue-100 text-blue-700",
  LIVREUR: "bg-amber-100 text-amber-700",
};

// ---------------------------------------------------------------------------
// Erreur spécifique
// ---------------------------------------------------------------------------

export class RBACError extends Error {
  constructor(role: StaffRole | null | undefined, action: RBACAction) {
    super(`Accès refusé : le rôle "${role ?? "inconnu"}" ne peut pas effectuer "${action}".`);
    this.name = "RBACError";
  }
}
