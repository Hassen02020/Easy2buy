/**
 * lib/contact.ts
 * ---------------
 * Configuration centralisée des canaux de contact du business.
 * Modifier ces valeurs pour changer les numéros/liens partout.
 */

export const CONTACT = {
  /** Numéros WhatsApp (format international sans +) */
  whatsapp:  "21655704322",
  whatsapp2: "21698140514",

  /** Numéros téléphone affichés */
  phone:  "+216 55 704 322",
  phone2: "+216 98 140 514",

  /** Lien Facebook Messenger (page Facebook) */
  messengerUrl: "https://m.me/Easy2BuyTunisia",

  /** Réseaux sociaux */
  facebookUrl:  "https://www.facebook.com/Easy2BuyTunisia",
  instagramUrl: "https://www.instagram.com/Easy2BuyTunisia",

  /** Nom affiché */
  businessName: "Easy2Buy",
  slogan: "Simple. Fast. Shopping.",
};

/** Génère un lien WhatsApp avec message pré-rempli */
export function waLink(message: string) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Message WhatsApp pour passer commande à l'oral */
export function waOrderMessage(cartSummary?: string) {
  const base = `Bonjour 🌿 Je voudrais passer une commande par téléphone.`;
  return cartSummary ? `${base}\n\nMon panier :\n${cartSummary}` : base;
}
