import { createContext, useContext } from 'react';

/** Acțiuni de interfață globale: deschidere activitate, activitate nouă, paletă, Mașina Timpului. */
export const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);
