export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  video?: string;
  videoUrl?: string;
  category: "intérieur" | "extérieur" | "succulente" | "aromatique";
  badge?: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  lightNeeds?: string;
  waterNeeds?: string;
  tempRange?: string;
  careDifficulty?: string;
  climaticZones?: string[];
  suggestedProductIds?: number[];
}
