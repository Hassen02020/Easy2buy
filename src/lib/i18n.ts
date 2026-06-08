/**
 * lib/i18n.ts
 * -----------
 * Traductions FR / AR pour la page d'accueil Easy2Buy.
 */

export type Lang = "fr" | "ar";

export const t = {
  fr: {
    nav: {
      catalogue:  "Catalogue",
      order:      "Commander",
      track:      "Suivre ma commande",
    },
    hero: {
      badge:    "Livraison dans toute la région",
      title1:   "Des plantes vivantes",
      title2:   "livrées",
      title3:   "chez vous",
      desc:     "Transformez votre espace avec nos plantes soigneusement sélectionnées. Intérieur, extérieur, aromatiques — pour chaque coin de verdure.",
      cta1:     "Découvrir le catalogue",
      cta2:     "Commander",
    },
    heroBadges: [
      { label: "Livraison rapide" },
      { label: "Qualité garantie" },
      { label: "4.8★ client" },
    ],
    featuredStrip: "✨ Produits en vedette",
    features: [
      { title: "Livraison express",     desc: "Chez vous en 24–48 h dans la région" },
      { title: "Plantes fraîches",      desc: "Sélectionnées à la pépinière le jour même" },
      { title: "Satisfaction garantie", desc: "Échange ou remboursement sous 7 jours" },
    ],
    care: {
      title: "Prendre soin de vos plantes",
      items: [
        { title: "Arrosage",   tips: ["Vérifiez le sol avant d'arroser", "Préférez l'eau à température ambiante", "Évitez l'excès d'eau (racines pourrissantes)"] },
        { title: "Lumière",    tips: ["Lumière indirecte pour plantes d'intérieur", "Tournez le pot régulièrement", "Évitez le soleil direct de mi-journée"] },
        { title: "Rempotage",  tips: ["Tous les 1–2 ans au printemps", "Pot de 2–3 cm de plus de diamètre", "Drainage obligatoire"] },
      ],
    },
    testimonials: {
      title: "Ce que disent nos clients",
      items: [
        { name: "Sofia M.",  text: "Monstera magnifique, livrée le lendemain bien emballée. Je recommande vivement !", plant: "Monstera Deliciosa" },
        { name: "Karim B.",  text: "Super service client. Ma lavande était parfaite pour mon balcon. Achat facile.",   plant: "Lavande Vraie" },
        { name: "Amira L.",  text: "Aloe vera en parfaite santé, très bien présenté. Le site est super simple.",       plant: "Aloe Vera" },
      ],
    },
    order: {
      title: "Passez votre commande",
      desc:  "Livraison à domicile — confirmation par appel ou SMS.",
    },
    ariaCart: "Ouvrir le panier",
    ariaScroll: "Défiler vers le bas",
    catalogue: {
      title:    "Notre",
      highlight:"catalogue",
      desc:     "Choisissez parmi notre sélection soignée. Ajoutez au panier, commandez en 2 minutes.",
      all:      "Tous",
    },
    careSection: {
      title:    "Conseils",
      highlight:"d'entretien",
      tips: [
        { title: "Arrosage", desc: "Arrosez modérément, laissez sécher entre deux arrosages." },
        { title: "Lumière",  desc: "La plupart des plantes aiment la lumière indirecte." },
        { title: "Rempotage",desc: "Rempotez chaque printemps dans un pot légèrement plus grand." },
      ],
    },
    testimonials2: {
      title:    "Ce que disent",
      highlight:"nos clients",
    },
    order2: {
      title:    "Passer",
      highlight:"commande",
      desc:     "Livraison à domicile — confirmation par appel ou SMS.",
    },
    footer: {
      contact:  "Contact",
      follow:   "Suivez-nous",
      rights:   "Tous droits réservés.",
    },
    cart: {
      open: "Panier",
    },
  },
  ar: {
    nav: {
      catalogue:  "الكتالوج",
      order:      "اطلب الآن",
      track:      "تتبع طلبي",
    },
    hero: {
      badge:    "توصيل في كامل المنطقة",
      title1:   "نباتات طبيعية",
      title2:   "تُوصَل",
      title3:   "إلى باب منزلك",
      desc:     "حوّل مساحتك بنباتاتنا المختارة بعناية — داخلية وخارجية وعطرية، لكل زاوية خضراء.",
      cta1:     "اكتشف الكتالوج",
      cta2:     "اطلب الآن",
    },
    heroBadges: [
      { label: "توصيل سريع" },
      { label: "جودة مضمونة" },
      { label: "عملاء بتقييم 4.8★" },
    ],
    featuredStrip: "✨ منتجات مميزة",
    features: [
      { title: "توصيل سريع",        desc: "إليك خلال 24–48 ساعة" },
      { title: "نباتات طازجة",       desc: "مختارة من المشتل في نفس اليوم" },
      { title: "ضمان الرضا",     desc: "استبدال أو استرداد خلال 7 أيام" },
    ],
    care: {
      title: "العناية بنباتاتك",
      items: [
        { title: "الري",          tips: ["تحقّق من التربة قبل السقي", "فضّل الماء على درجة حرارة الغرفة", "تجنّب الإفراط في السقي"] },
        { title: "الضوء",         tips: ["ضوء غير مباشر لمعظم النباتات", "ادّر الأصيص بانتظام", "تجنّب الشمس المباشرة وقت الظهيرة"] },
        { title: "إعادة الزراعة", tips: ["كل سنة أو سنتين في الربيع", "أصيص أكبر بقليل", "التصريف ضروري"] },
      ],
    },
    testimonials: {
      title: "آراء عملائنا",
      items: [
        { name: "Sofia M.",  text: "نبات رائع، وصل في اليوم التالي معبّأً بشكل ممتاز. أنصح به بشدة!", plant: "Monstera Deliciosa" },
        { name: "Karim B.",  text: "خدمة ممتازة. اللافندر كان مثاليًا لشرفتي. طلب سهل وسريع.",      plant: "لافندر" },
        { name: "Amira L.",  text: "ألوي فيرا بصحة جيدة جدّاً، تقديم ممتاز. الموقع سهل الاستخدام.",   plant: "Aloe Vera" },
      ],
    },
    order: {
      title: "أرسل طلبك",
      desc:  "توصيل للمنزل — تأكيد بالاتصال أو الرسائل.",
    },
    ariaCart:   "فتح السلة",
    ariaScroll: "تمرير للأسفل",
    catalogue: {
      title:    "كتالوجنا",
      highlight:"",
      desc:     "اختر من تشكيلتنا المختارة. أضف إلى السلة واطلب في دقيقتين.",
      all:      "الكل",
    },
    careSection: {
      title:    "نصائح",
      highlight:"العناية",
      tips: [
        { title: "الري",            desc: "اسقِ باعتدال، واترك التربة تجف بين كل سقيتين." },
        { title: "الضوء",           desc: "معظم النباتات تفضل الضوء غير المباشر." },
        { title: "إعادة الزراعة",  desc: "أعد الزراعة كل ربيع في أصيص أكبر قليلاً." },
      ],
    },
    testimonials2: {
      title:    "ما يقوله",
      highlight:"عملاؤنا",
    },
    order2: {
      title:    "أرسل",
      highlight:"طلبك",
      desc:     "توصيل للمنزل — تأكيد بالاتصال أو الرسائل.",
    },
    footer: {
      contact:  "التواصل",
      follow:   "تابعنا",
      rights:   "جميع الحقوق محفوظة.",
    },
    cart: {
      open: "السلة",
    },
  },
} as const;
