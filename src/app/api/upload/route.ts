import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Format non supporté (JPEG, PNG, WEBP, GIF)" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop lourd (max 5 Mo)" }, { status: 400 });
    }

    // ── Cloudinary (production Vercel) ────────────────────────────────────
    if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
      const cfd = new FormData();
      cfd.append("file", file);
      cfd.append("upload_preset", CLOUDINARY_PRESET);
      cfd.append("folder", "easy2buy/products");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: cfd }
      );
      const data = await res.json();

      if (!res.ok || !data.secure_url) {
        console.error("[upload/cloudinary]", data);
        return NextResponse.json({ error: "Erreur Cloudinary" }, { status: 500 });
      }
      return NextResponse.json({ url: data.secure_url });
    }

    // ── Fallback local (développement) ────────────────────────────────────
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });

  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
