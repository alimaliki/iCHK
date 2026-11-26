export const governorateAliases = {
  AN: ["الانبار", "انبار", "anbar", "al anbar"],
  KR: ["كربلاء", "كربلا", "karbala"],
  NJ: ["النجف", "نجف", "najaf"],
  BB: ["بابل", "babil", "babylon"],
  BG: ["بغداد", "baghdad"],
  QA: ["القادسية", "الديوانية", "al qadisiyah", "qadisiyah", "diwaniyah"],
  MU: ["المثنى", "السماوة", "al muthanna", "muthanna", "samawah"],
  DQ: ["ذي قار", "الناصرية", "dhi qar", "thi qar", "nasiriyah", "nasria"],
  BS: ["البصرة", "basrah", "basra"],
  MY: ["ميسان", "العمارة", "maysan", "amarah"],
  WA: ["واسط", "الكوت", "wasit", "kut"],
  NI: ["نينوى", "الموصل", "ninawa", "mosul", "nineveh"],
  DH: ["دهوك", "dohuk", "duhok"],
  SD: ["صلاح الدين", "تكريت", "salah al din", "salahuddin", "tikrit"],
  DY: ["ديالى", "بعقوبة", "diyala", "baqubah"],
  KI: ["كركوك", "kirkuk"],
  ER: ["اربيل", "أربيل", "erbil", "hawler"],
  SU: ["السليمانية", "سليمانية", "sulaymaniyah", "sulaimani"],
};

export function normalizeGovernorateText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
