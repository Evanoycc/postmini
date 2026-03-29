import { getMessages, type Locale } from "../i18n";
import type { EnvVar } from "../types";
import { KvTable } from "./KvTable";

export function EnvModal(props: {
  locale: Locale;
  open: boolean;
  envs: EnvVar[];
  onClose: () => void;
  onSave: (envs: EnvVar[]) => void;
}) {
  const m = getMessages(props.locale);
  if (!props.open) return null;

  return (
    <div className="modalMask" onMouseDown={props.onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">{m.envModalTitle}</div>
          <button type="button" className="btnGhost" onClick={props.onClose}>
            {m.close}
          </button>
        </div>
        <div className="modalBody">
          <div className="hint">
            {m.envHintPrefix} <span className="mono">{"{{变量名}}"}</span> {m.envHintSuffix}{" "}
            <span className="mono">{"{{base_url}}"}</span>.
          </div>
          <KvTable locale={props.locale} rows={props.envs} onChange={props.onSave} keyPlaceholder="name" valuePlaceholder="value" />
        </div>
      </div>
    </div>
  );
}
