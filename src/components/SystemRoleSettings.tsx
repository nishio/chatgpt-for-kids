import { Show } from "solid-js";
import IconEnv from "./icons/Env";
import type { Accessor, Setter } from "solid-js";

interface Props {
  systemRoleEditing: Accessor<boolean>;
  setSystemRoleEditing: Setter<boolean>;
  currentSystemRoleSettings: Accessor<string>;
  setCurrentSystemRoleSettings: Setter<string>;
}

export default (props: Props) => {
  let systemInputRef: HTMLTextAreaElement;

  const handleButtonClick = () => {
    props.setCurrentSystemRoleSettings(systemInputRef.value);
    props.setSystemRoleEditing(false);
  };

  return (
    <div class="my-4">
      <Show when={!props.systemRoleEditing()}>
        <Show when={props.currentSystemRoleSettings()}>
          <div>
            <span
              onClick={() =>
                props.setSystemRoleEditing(!props.systemRoleEditing())
              }
              class="sys-edit-btn"
            >
              <IconEnv />
              <span>役割設定</span>
            </span>
            <a href="https://scrapbox.io/nishio/%E4%B8%AD%E9%AB%98%E7%94%9F%E3%81%AE%E3%81%9F%E3%82%81%E3%81%AEChatGPT#642a8166aff09e00002c0fc4">
              [?]
            </a>
          </div>
        </Show>

        <Show when={!props.currentSystemRoleSettings()}>
          <span
            onClick={() =>
              props.setSystemRoleEditing(!props.systemRoleEditing())
            }
            class="sys-edit-btn"
          >
            <IconEnv />
            <span>Add System Role</span>
          </span>
        </Show>
      </Show>

      <Show when={props.systemRoleEditing()}>
        <div>
          <div class="fi gap-1 op-50 dark:op-60">
            <IconEnv />
            <span>役割設定:</span>
          </div>
          <div>
            <textarea
              ref={systemInputRef!}
              placeholder="You are a helpful assistant, answer as concisely as possible...."
              autocomplete="off"
              autofocus
              rows="3"
              gen-textarea
              value={props.currentSystemRoleSettings()}
            />
          </div>
          <button onClick={handleButtonClick} gen-slate-btn>
            設定
          </button>
        </div>
      </Show>
    </div>
  );
};
