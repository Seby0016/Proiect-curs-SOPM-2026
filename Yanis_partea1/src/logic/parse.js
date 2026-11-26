// =====================================================================
//  Adăugare rapidă în limbaj natural — SCHELET (Etapa 1)
//  Responsabil: Sarca Yanis
//  Exemplu (Etapa 2): „Raport vânzări mâine 14:00 !urgent @andreea”
//    → titlu, termen mâine la 14:00, prioritate critică, atribuit Andreei.
// =====================================================================

export function parseQuickAdd(text /* , now, users */) {
  // TODO Etapa 2: zile (azi, mâine, luni…), ore (14:00), !prioritate, @persoană
  return { title: text.trim(), due: null, priority: 'medium', assignee: null, tokens: [] };
}
