import type { EnvVar } from "../types";
import { KvTable } from "./KvTable";

export function EnvModal(props: {
  open: boolean;
  envs: EnvVar[];
  onClose: () => void;
  onSave: (envs: EnvVar[]) => void;
}) {
  if (!props.open) return null;

  return (
    <div className="modalMask" onMouseDown={props.onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">环境变量</div>
          <button type="button" className="btnGhost" onClick={props.onClose}>
            关闭
          </button>
        </div>
        <div className="modalBody">
          <div className="hint">
            在 URL/Headers/Body 中用 <span className="mono">{"{{变量名}}"}</span> 引用，例如{" "}
            <span className="mono">{"{{base_url}}"}</span>。
          </div>
          <KvTable rows={props.envs} onChange={props.onSave} keyPlaceholder="name" valuePlaceholder="value" />
        </div>
      </div>
    </div>
  );
}

