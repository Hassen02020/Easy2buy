import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy2Buy – Plantes & Nature livrées chez vous — Simple. Fast. Shopping.",
  description:
    "Easy2Buy : découvrez notre sélection de plantes d'intérieur et d'extérieur. Livraison rapide à domicile en Tunisie. Qualité garantie.",
  keywords: ["Easy2Buy", "plantes", "livraison plantes", "Tunisie", "plantes d'intérieur"],
  openGraph: {
    title: "Easy2Buy – Plantes livrées chez vous",
    description: "Simple. Fast. Shopping. — Livraison de plantes fraîches en Tunisie.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
