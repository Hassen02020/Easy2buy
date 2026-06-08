import type { Product } from "@/types/product";

export const products: Product[] = [
  {
    id: "1",
    name: "Monstera Deliciosa",
    description:
      "La reine des plantes tropicales. Ses grandes feuilles découpées apportent une touche exotique à votre intérieur.",
    price: 34.9,
    image:
      "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80",
    category: "intérieur",
    badge: "Bestseller",
    inStock: true,
    rating: 4.9,
    reviews: 128,
  },
  {
    id: "2",
    name: "Pothos Doré",
    description:
      "Plante facile d'entretien aux feuilles en cœur vert et jaune. Idéale pour les débutants.",
    price: 12.5,
    image:
      "https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?w=600&q=80",
    category: "intérieur",
    inStock: true,
    rating: 4.8,
    reviews: 94,
  },
  {
    id: "3",
    name: "Ficus Lyrata",
    description:
      "Le figuier lyre, avec ses larges feuilles violonées, est la star déco des espaces design.",
    price: 52.0,
    image:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&q=80",
    category: "intérieur",
    badge: "Nouveau",
    inStock: true,
    rating: 4.7,
    reviews: 57,
  },
  {
    id: "4",
    name: "Cactus Étoilé",
    description:
      "Succulent architectural au port compact. Nécessite peu d'eau et beaucoup de lumière.",
    price: 8.9,
    image:
      "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&q=80",
    category: "succulente",
    inStock: true,
    rating: 4.6,
    reviews: 73,
  },
  {
    id: "5",
    name: "Basilic Grand Vert",
    description:
      "Herbe aromatique incontournable. Cultivé en pot, toujours à portée de main en cuisine.",
    price: 4.5,
    image:
      "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=600&q=80",
    category: "aromatique",
    badge: "Frais",
    inStock: true,
    rating: 4.9,
    reviews: 215,
  },
  {
    id: "6",
    name: "Lavande Vraie",
    description:
      "Parfumez votre jardin ou balcon avec cette lavande méditerranéenne aux fleurs violettes.",
    price: 9.9,
    image:
      "https://images.unsplash.com/photo-1499744937866-d7e566a20a61?w=600&q=80",
    category: "extérieur",
    inStock: true,
    rating: 4.8,
    reviews: 163,
  },
  {
    id: "7",
    name: "Aloe Vera",
    description:
      "Plante médicinale et décorative. Son gel naturel soulage brûlures et irritations.",
    price: 14.9,
    image:
      "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80",
    category: "succulente",
    inStock: true,
    rating: 4.9,
    reviews: 302,
  },
  {
    id: "8",
    name: "Palmier Kentia",
    description:
      "Le palmier d'appartement par excellence. Élégant, tolérant à l'ombre, pousse lentement.",
    price: 79.0,
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    category: "intérieur",
    badge: "Premium",
    inStock: true,
    rating: 4.7,
    reviews: 44,
  },
];

export const categories = [
  { id: "all", label: "Toutes" },
  { id: "intérieur", label: "Intérieur" },
  { id: "extérieur", label: "Extérieur" },
  { id: "succulente", label: "Succulentes" },
  { id: "aromatique", label: "Aromatiques" },
] as const;
