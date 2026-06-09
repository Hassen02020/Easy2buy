/**
 * AdminNav — barre de navigation partagée entre toutes les pages admin.
 * Server Component (pas de "use client" nécessaire).
 */
import type { StaffRole } from "@/db/schema";

interface NavLink {
  href: string;
  label: string;
  icon: string;
  roles: StaffRole[];
}

const LINKS: NavLink[] = [
  { href: "/admin/dashboard",   label: "Dashboard",   icon: "📊", roles: ["ADMIN"] },
  { href: "/admin/orders",      label: "Commandes",   icon: "📦", roles: ["ADMIN", "AGENT"] },
  { href: "/admin/products",    label: "Produits",    icon: "🌿", roles: ["ADMIN"] },
  { href: "/admin/customers",   label: "Clients",     icon: "👥", roles: ["ADMIN", "AGENT"] },
  { href: "/admin/analytics",   label: "Analytique",  icon: "📈", roles: ["ADMIN"] },
  { href: "/admin/tournee",     label: "Ma Tournée",  icon: "🚚", roles: ["ADMIN", "LIVREUR"] },
  { href: "/admin/staff",       label: "Personnel",   icon: "👥", roles: ["ADMIN"] },
  { href: "/admin/mon-espace",  label: "Mon Espace",  icon: "👤", roles: ["ADMIN", "AGENT", "LIVREUR"] },
];

export function AdminNav({ active, role }: { active: string; role?: StaffRole }) {
  const visible = role ? LINKS.filter(l => l.roles.includes(role)) : LINKS;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm mb-6 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 h-12 overflow-x-auto">
        <span className="font-extrabold text-forest-700 text-sm mr-4 shrink-0">🌱 Easy2Buy</span>
        {visible.map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0 ${
              active === href
                ? "bg-forest-100 text-forest-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            <span>{icon}</span> {label}
          </a>
        ))}
        <div className="flex-1" />
        <form action="/api/admin/logout" method="POST" className="shrink-0">
          <button
            type="submit"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            🚪 Déconnexion
          </button>
        </form>
      </div>
    </nav>
  );
}
