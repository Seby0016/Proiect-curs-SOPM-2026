// =====================================================================
//  Reducer — SCHELET (Etapa 1)
//  Responsabil: Sarca Yanis
//  Orice schimbare a datelor e o „acțiune” { type, ... }. Reducer-ul
//  primește starea veche + acțiunea și întoarce o stare NOUĂ (nu o modifică
//  pe cea veche). Store-ul lui Sergiu îl apelează la fiecare dispatch().
// =====================================================================

export const firstName = (name = '') => name.split(' ')[0];

/**
 * TODO Etapa 2 — acțiunile pe care le tratăm:
 *   task/add, task/update, task/submit, task/withdraw, task/approve, task/reject,
 *   task/reopen, task/cancel, task/delete, task/comment,
 *   project/add, user/hire, user/reinstate, user/password, position/update,
 *   promo/propose, promo/decide, time/advance, time/reset
 */
export function reducer(state, action /* , now, actorId */) {
  switch (action.type) {
    case 'time/advance':
      return { ...state, clockOffset: state.clockOffset + action.ms };
    case 'time/reset':
      return { ...state, clockOffset: 0 };
    default:
      return state;
  }
}

/** TODO Etapa 2: rulează evaluate() din rules.js și întoarce evenimentele (abatere, concediere). */
export function runEvaluation(state /* , now */) {
  return { state, events: [] };
}
