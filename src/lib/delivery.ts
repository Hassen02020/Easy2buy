/**
 * lib/delivery.ts
 * ---------------
 * Calcule les frais de livraison selon la ville du client (Tunisie).
 */

export interface DeliveryZone {
  cities: string[];
  fee: number;
  estimatedDays: number;
  label: string;
}

const DELIVERY_ZONES: DeliveryZone[] = [
  {
    cities: ["tunis", "ariana", "ben arous", "manouba", "la marsa", "carthage", "sidi bou said", "rades", "hammam lif"],
    fee: 7.0,
    estimatedDays: 1,
    label: "Grand Tunis",
  },
  {
    cities: ["nabeul", "hammamet", "bizerte", "beja", "jendouba", "kef", "siliana", "zaghouan"],
    fee: 8.0,
    estimatedDays: 2,
    label: "Nord",
  },
  {
    cities: ["sousse", "monastir", "mahdia", "kairouan", "sidi bouzid", "kasserine"],
    fee: 8.0,
    estimatedDays: 2,
    label: "Centre",
  },
  {
    cities: ["sfax", "gabes", "gafsa", "tozeur", "kebili", "tataouine", "medenine", "djerba", "zarzis"],
    fee: 9.0,
    estimatedDays: 3,
    label: "Sud",
  },
];

const DEFAULT_FEE = 9.0;
const DEFAULT_DAYS = 3;

/** Maximum d'articles par commande client */
export const MAX_ITEMS_PER_ORDER = 5;

export interface DeliveryQuote {
  fee: number;          // frais fixes par commande selon la zone
  isFree: boolean;
  estimatedDays: number;
  zone: string;
}

/**
 * Retourne le tarif de livraison forfaitaire par commande selon la zone.
 * La limite de 5 articles max par commande est gérée séparément (validation panier).
 *
 * @param city  Ville du client
 */
export function calculateDeliveryFee(city: string, _qty?: number): DeliveryQuote {
  const normalized = city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const zone = DELIVERY_ZONES.find((z) =>
    z.cities.some((c) => {
      const nc = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalized.includes(nc) || nc.includes(normalized);
    })
  );

  return {
    fee: zone?.fee ?? DEFAULT_FEE,
    isFree: false,
    estimatedDays: zone?.estimatedDays ?? DEFAULT_DAYS,
    zone: zone?.label ?? "Tunisie",
  };
}
