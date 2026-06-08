"use client";

import { useState, useEffect } from "react";
import type { Lang } from "./i18n";

const KEY = "easy2buy_lang";

export function useLang() {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved === "ar" || saved === "fr") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem(KEY, l);
    document.documentElement.lang = l;
    document.documentElement.dir  = l === "ar" ? "rtl" : "ltr";
  }

  return { lang, setLang, isRtl: lang === "ar" };
}
