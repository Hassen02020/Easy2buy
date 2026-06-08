/**
 * AdminNav — barre de navigation partagée entre toutes les pages admin.
 * Server Component (pas de "use client" nécessaire).
 */
const LINKS = [
  { href: "/admin/dashboard",   label: "Dashboard",   icon: "📊" },
  { href: "/admin/orders",      label: "Commandes",   icon: "📦" },
  { href: "/admin/products",    label: "Produits",    icon: "🌿" },
  { href: "/admin/customers",   label: "Clients",     icon: "👥" },
  { href: "/admin/analytics",   label: "Analytique",  icon: "📈" },
  { href: "/admin/mon-espace",  label: "Mon Espace",  icon: "👤" },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm mb-6 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 h-12">
        <span className="font-extrabold text-forest-700 text-sm mr-4">🌱 Easy2Buy Admin</span>
        {LINKS.map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              active === href
                ? "bg-forest-100 text-forest-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            <span>{icon}</span> {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
