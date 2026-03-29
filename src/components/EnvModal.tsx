import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { getMessages, type Locale } from "../i18n";
import type { EnvGroup } from "../types";
import { KvTable } from "./KvTable";

export function EnvModal(props: {
  locale: Locale;
  open: boolean;
  envGroups: EnvGroup[];
  activeEnvGroupId: string;
  onClose: () => void;
  onSave: (envGroups: EnvGroup[], activeEnvGroupId: string) => void;
}) {
  const m = getMessages(props.locale);
  const [draftGroupName, setDraftGroupName] = useState("");
  const activeGroup = props.envGroups.find((group) => group.id === props.activeEnvGroupId) ?? props.envGroups[0];

  useEffect(() => {
    setDraftGroupName(activeGroup?.name ?? "");
  }, [activeGroup?.id, activeGroup?.name]);

  if (!props.open) return null;

  function commitGroupName(groupId: string) {
    const nextName = draftGroupName.trim() || m.envNewGroup;
    props.onSave(
      props.envGroups.map((group) => (group.id === groupId ? { ...group, name: nextName } : group)),
      props.activeEnvGroupId,
    );
  }

  function updateVars(vars: EnvGroup["vars"]) {
    if (!activeGroup) return;
    props.onSave(
      props.envGroups.map((group) => (group.id === activeGroup.id ? { ...group, vars } : group)),
      activeGroup.id,
    );
  }

  function addGroup() {
    const next = {
      id: nanoid(),
      name: `${m.envNewGroup} ${props.envGroups.length + 1}`,
      vars: [{ key: "base_url", value: "" }],
    };
    props.onSave([...props.envGroups, next], next.id);
  }

  async function removeGroup(groupId: string, groupName: string) {
    if (props.envGroups.length <= 1) return;

    const ok = await confirm(m.confirmDeleteEnvGroup(groupName), {
      title: m.confirmDeleteTitle,
      kind: "warning",
      okLabel: m.confirmDeleteOk,
      cancelLabel: m.confirmCancel,
    });
    if (!ok) return;

    const nextGroups = props.envGroups.filter((group) => group.id !== groupId);
    const nextActiveId =
      props.activeEnvGroupId === groupId ? nextGroups[0]?.id ?? "" : props.activeEnvGroupId;

    props.onSave(nextGroups, nextActiveId);
  }

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
            {m.envHintPrefix} <span className="mono">{"{{变量名}}"}</span> {m.envHintSuffix} <span className="mono">{"{{base_url}}"}</span>.
          </div>

          <div className="envToolbar">
            <div className="envCurrentLabel">{m.envCurrent}</div>
            <button type="button" className="btnGhost" onClick={addGroup}>
              + {m.envNewGroup}
            </button>
          </div>

          <div className="envGroupTabs">
            {props.envGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={group.id === props.activeEnvGroupId ? "envGroupTab active" : "envGroupTab"}
                onClick={() => props.onSave(props.envGroups, group.id)}
              >
                {group.name}
              </button>
            ))}
          </div>

          {activeGroup ? (
            <div className="envGroupPanel">
              <div className="envGroupHeader">
                <input
                  className="envGroupNameInput"
                  value={draftGroupName}
                  onChange={(e) => setDraftGroupName(e.currentTarget.value)}
                  onBlur={() => commitGroupName(activeGroup.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitGroupName(activeGroup.id);
                      e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                      setDraftGroupName(activeGroup.name);
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder={m.envGroupNamePlaceholder}
                />
                <button
                  type="button"
                  className="btnGhost"
                  onClick={() => void removeGroup(activeGroup.id, activeGroup.name)}
                  disabled={props.envGroups.length <= 1}
                  title={props.envGroups.length <= 1 ? m.envDeleteLastHint : m.envDeleteGroup}
                >
                  {m.delete}
                </button>
              </div>
              <KvTable locale={props.locale} rows={activeGroup.vars} onChange={updateVars} keyPlaceholder="name" valuePlaceholder="value" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
