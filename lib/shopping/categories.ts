import type { ShoppingCategory } from "@/lib/domain/types";

const KEYWORDS: Array<{ category: ShoppingCategory; words: string[] }> = [
  { category: "groente_fruit", words: ["appel", "banaan", "peer", "sinaasappel", "tomaat", "komkommer", "paprika", "ui", "sla", "aardbei", "druif", "avocado", "broccoli", "wortel", "aardappel"] },
  { category: "brood", words: ["brood", "bol", "croissant", "stokbrood", "beschuit", "cracker", "wrap", "pita"] },
  { category: "zuivel", words: ["melk", "kaas", "yoghurt", "kwark", "room", "boter", "eieren", "ei "] },
  { category: "vlees_vis_vega", words: ["kip", "gehakt", "vlees", "vis", "zalm", "tonijn", "tofu", "tempeh", "worst", "ham"] },
  { category: "beleg", words: ["pindakaas", "jam", "hagelslag", "filet", "leverworst", "salami"] },
  { category: "dranken", words: ["water", "sap", "cola", "bier", "wijn", "koffie", "thee", "limonade", "fanta"] },
  { category: "snacks", words: ["chips", "koek", "chocolade", "snoep", "popcorn", "noot", "noten"] },
  { category: "diepvries", words: ["diepvries", "ijs", "pizza", "friet", "bevroren"] },
  { category: "huishouden", words: ["wasmiddel", "schoonmaak", "vaatwastablet", "vuilniszak", "keukenrol", "aluminium", "spons"] },
  { category: "verzorging", words: ["shampoo", "tandpasta", "zeep", "deodorant", "crème", "lotion", "tampon", "maandverband"] },
];

export function inferShoppingCategory(name: string): ShoppingCategory {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return "overig";
  for (const entry of KEYWORDS) {
    if (entry.words.some((word) => normalized.includes(word))) {
      return entry.category;
    }
  }
  return "overig";
}

export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  "groente_fruit",
  "brood",
  "zuivel",
  "vlees_vis_vega",
  "beleg",
  "dranken",
  "snacks",
  "diepvries",
  "huishouden",
  "verzorging",
  "overig",
];
