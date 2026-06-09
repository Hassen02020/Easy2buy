/**
 * middleware.ts — RBAC strict sur /admin/*
 * -----------------------------------------
 * Chaque requête vers /admin/* est interceptée.
 * Si pas de cookie staffId → redirect /admin/login
 * Si rôle insuffisant → redirect vers la page par défaut du rôle
 *
 * Note: le middleware ne peut pas appeler la DB (Edge runtime).
 * On stocke donc le rôle dans un cookie séparé `staffRole` (non sensible).
 */

import { NextRequest, NextResponse } from "next/server";
import type { StaffRole } from "@/db/schema";

const PAGE_PERMISSIONS: Record<string, StaffRole[]> = {
  "/admin/dashboard":  ["ADMIN"],
  "/admin/orders":     ["ADMIN", "AGENT"],
  "/admin/products":   ["ADMIN"],
  "/admin/customers":  ["ADMIN", "AGENT"],
  "/admin/analytics":  ["ADMIN"],
  "/admin/mon-espace": ["ADMIN", "AGENT", "LIVREUR"],
  "/admin/tournee":    ["ADMIN", "LIVREUR"],
};

function defaultRedirect(role: StaffRole): string {
  switch (role) {
    case "ADMIN":   return "/admin/dashboard";
    case "AGENT":   return "/admin/orders";
    case "LIVREUR": return "/admin/tournee";
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer login et API
  if (pathname === "/admin/login" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const staffId   = req.cookies.get("staffId")?.value;
  const staffRole = req.cookies.get("staffRole")?.value as StaffRole | undefined;

  // Pas connecté → login
  if (!staffId || !staffRole) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // Vérifier les permissions sur la page exacte
  const matchedPage = Object.keys(PAGE_PERMISSIONS).find(p => pathname.startsWith(p));
  if (matchedPage) {
    const allowed = PAGE_PERMISSIONS[matchedPage];
    if (!allowed.includes(staffRole)) {
      const url = req.nextUrl.clone();
      url.pathname = defaultRedirect(staffRole);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
