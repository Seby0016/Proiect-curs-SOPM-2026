// =====================================================================
//  Mașina Timpului (pentru demo) — SCHELET (Etapa 1)
//  Responsabil: Iordache Sebastian
//  Mută ceasul aplicației înainte, ca să vedem regula de abateri live.
// =====================================================================
import { dispatch, HOUR } from '../store/store.js';
import { Modal } from './ui.jsx';

export default function TimeMachine({ onClose }) {
  return (
    <Modal title="Mașina Timpului" onClose={onClose}>
      <div className="row">
        <button className="btn" onClick={() => dispatch({ type: 'time/advance', ms: HOUR })}>+1 oră</button>
        <button className="btn" onClick={() => dispatch({ type: 'time/advance', ms: 24 * HOUR })}>+1 zi</button>
        <button className="btn ghost" onClick={() => dispatch({ type: 'time/reset' })}>În prezent</button>
      </div>
      {/* TODO Etapa 2: cifrele care se răsucesc, previzualizarea restanțelor */}
    </Modal>
  );
}
