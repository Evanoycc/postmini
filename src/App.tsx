import "./App.css";
import { useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { EnvModal } from "./components/EnvModal";
import { HistorySidebar } from "./components/HistorySidebar";
import { RequestEditor } from "./components/RequestEditor";
import { ResponseViewer } from "./components/ResponseViewer";
import { TabsBar } from "./components/TabsBar";
import { getMessages } from "./i18n";
import { useAppStore } from "./store/useAppStore";
import type { RequestDraft, RequestGroup } from "./types";
import { saveTextFile, sendHttp } from "./utils/http";
import { applyEnvTemplate, applyEnvToFormFiles, applyEnvToKvPairs } from "./utils/template";

function App() {
  const { state, dispatch, activeTab } = useAppStore();
  const [sending, setSending] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const m = getMessages(state.locale);

  const tabsForBar = useMemo(
    () => state.tabState.tabs.map((t) => ({ id: t.id, title: t.title, method: t.request.method })),
    [state.tabState.tabs],
  );

  function patchRequest(patch: Partial<RequestDraft>) {
    dispatch({ type: "request.patch", id: activeTab.id, patch });
  }

  async function onSend() {
    const draft = activeTab.request;
    const envs = state.envs;
    const resolved: RequestDraft = {
      ...draft,
      url: applyEnvTemplate(draft.url, envs),
      headers: applyEnvToKvPairs(draft.headers, envs),
      bodyText: applyEnvTemplate(draft.bodyText, envs),
      formData: applyEnvToKvPairs(draft.formData, envs),
      formFiles: applyEnvToFormFiles(draft.formFiles, envs),
      saveResponseTo: applyEnvTemplate(draft.saveResponseTo, envs),
    };

    setSending(true);
    dispatch({ type: "response.set", id: activeTab.id, response: {} });
    try {
      const resp = await sendHttp(resolved);
      dispatch({
        type: "response.set",
        id: activeTab.id,
        response: { ok: resp.ok, status: resp.status, elapsedMs: resp.elapsedMs, bodyText: resp.bodyText },
      });
    } catch (e) {
      dispatch({ type: "response.set", id: activeTab.id, response: { error: String(e) } });
    } finally {
      setSending(false);
    }
  }

  async function exportCollections() {
    try {
      const path = await save({
        title: m.exportCollectionsDialogTitle,
        defaultPath: `postmini-collections-${Date.now()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return;
      await saveTextFile(path, JSON.stringify(state.collections, null, 2));
    } catch (e) {
      dispatch({
        type: "response.set",
        id: activeTab.id,
        response: { error: `${m.exportCollectionsError}: ${String(e)}` },
      });
    }
  }

  function importCollections(groups: RequestGroup[]) {
    dispatch({ type: "collection.set", collections: groups });
  }

  return (
    <div className="appShell">
      <HistorySidebar
        locale={state.locale}
        collections={state.collections}
        activeCollectionItemId={activeTab.request.collectionItemId ?? null}
        onAddGroup={(parentGroupId) => dispatch({ type: "collection.group.add", parentGroupId })}
        onRenameGroup={(groupId, name) => dispatch({ type: "collection.group.rename", groupId, name })}
        onRemoveGroup={(groupId) => dispatch({ type: "collection.group.remove", groupId })}
        onAddRequest={(groupId) => dispatch({ type: "collection.request.add", groupId })}
        onRenameRequest={(groupId, itemId, name) => dispatch({ type: "collection.request.rename", groupId, itemId, name })}
        onRemoveRequest={(groupId, itemId) => dispatch({ type: "collection.request.remove", groupId, itemId })}
        onOpenRequest={(groupId, itemId) => dispatch({ type: "tab.openCollection", groupId, itemId })}
        onExportCollections={exportCollections}
        onImportCollections={importCollections}
      />

      <div className="main">
        <div className="mainTop">
          <TabsBar locale={state.locale} tabs={tabsForBar} activeId={state.tabState.activeTabId} onActivate={(id) => dispatch({ type: "tab.activate", id })} onClose={(id) => dispatch({ type: "tab.close", id })} />
          <div className="topActions">
            <button type="button" className="btnGhost" onClick={() => dispatch({ type: "locale.set", locale: state.locale === "zh-CN" ? "en-US" : "zh-CN" })}>
              {state.locale === "zh-CN" ? m.languageEn : m.languageZh}
            </button>
            <button type="button" className="btnGhost" onClick={() => setEnvOpen(true)}>
              {m.environmentVariables}
            </button>
            <button
              type="button"
              className="btnGhost"
              onClick={() => dispatch({ type: "theme.set", theme: state.theme === "dark" ? "light" : "dark" })}
            >
              {state.theme === "dark" ? m.themeLight : m.themeDark}
            </button>
          </div>
        </div>

        <div className="contentSplit">
          <div className="leftPane">
            <RequestEditor locale={state.locale} request={activeTab.request} sending={sending} onChange={patchRequest} onSend={onSend} />
          </div>
          <div className="rightPane">
            <div className="sectionTitle">{m.response}</div>
            <ResponseViewer
              locale={state.locale}
              request={activeTab.request}
              response={activeTab.response}
              theme={state.theme}
              onChangeRequest={patchRequest}
            />
          </div>
        </div>
      </div>

      <EnvModal locale={state.locale} open={envOpen} envs={state.envs} onClose={() => setEnvOpen(false)} onSave={(envs) => dispatch({ type: "envs.set", envs })} />
    </div>
  );
}

export default App;
