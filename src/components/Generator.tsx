import { Index, Show, createSignal, onCleanup, onMount } from "solid-js";
import { useThrottleFn } from "solidjs-use";
import { generateSignature } from "@/utils/auth";
import IconClear from "./icons/Clear";
import MessageItem from "./MessageItem";
import SystemRoleSettings from "./SystemRoleSettings";
import ErrorMessageItem from "./ErrorMessageItem";
import type { ChatMessage, ErrorMessage } from "@/types";

import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
// ここでFirebaseの設定をインポートまたは定義します
const firebaseConfig = {
  apiKey: "AIzaSyBa_r-q6Mf4I0VaIZ8yTXDa1M6SEjCsutM",
  authDomain: "chatgpt-d546a.firebaseapp.com",
  projectId: "chatgpt-d546a",
  storageBucket: "chatgpt-d546a.appspot.com",
  messagingSenderId: "699273813437",
  appId: "1:699273813437:web:47a8b6e4b8790aa21346d4",
  measurementId: "G-T2Z8RMCC3N",
};

let auth, db;

interface ChatRoom {
  id: string;
  name: string;
}

export default () => {
  let inputRef: HTMLTextAreaElement;
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] =
    createSignal("");
  const [systemRoleEditing, setSystemRoleEditing] = createSignal(false);
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([]);
  const [currentError, setCurrentError] = createSignal<ErrorMessage>();
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [controller, setController] = createSignal<AbortController>(null);

  async function signInAnonymously(auth): Promise<string> {
    try {
      const result = await auth.signInAnonymously();
      return result.user?.uid || "";
    } catch (error) {
      console.error("Error signing in anonymously: ", error);
      return "";
    }
  }

  async function getOrCreateFirstRoom(): Promise<string> {
    const userId = await signInAnonymously(auth);
    const roomRef = db
      .collection("users")
      .doc(userId)
      .collection("rooms")
      .doc("firstroom");
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists) {
      await roomRef.set({ name: "firstroom" });
    }

    return roomRef.id;
  }

  async function restoreChatLog(roomId: string): Promise<ChatMessage[]> {
    const userId = await signInAnonymously(auth);
    const chatLog: ChatMessage[] = [];
    const querySnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("rooms")
      .doc(roomId)
      .collection("messages")
      .orderBy("timestamp")
      .get();

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ChatMessage;
      chatLog.push({
        role: data.role,
        content: data.content,
      });
    });

    setMessageList(chatLog);
    return chatLog;
  }

  async function saveChatMessage(roomId: string, chatMessage: ChatMessage) {
    const userId = await signInAnonymously(auth);
    await db
      .collection("users")
      .doc(userId)
      .collection("rooms")
      .doc(roomId)
      .collection("messages")
      .add({
        ...chatMessage,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
  }

  const saveMessages = async () => {
    const roomId = "firstroom";
    messageList().forEach((message) => {
      saveChatMessage(roomId, message);
    });
  };

  onMount(() => {
    firebase.initializeApp(firebaseConfig);
    // @ts-ignore
    auth = firebase.auth();
    db = firebase.firestore();
    // @ts-ignore
    window.saveMessages = saveMessages;

    getOrCreateFirstRoom().then(restoreChatLog);

    console.log(restoreChatLog("firstroom"));

    try {
      if (localStorage.getItem("systemRoleSettings"))
        setCurrentSystemRoleSettings(
          localStorage.getItem("systemRoleSettings")
        );
    } catch (err) {
      console.error(err);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    onCleanup(() => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    });
  });

  const handleBeforeUnload = () => {
    localStorage.setItem("messageList", JSON.stringify(messageList()));
    localStorage.setItem("systemRoleSettings", currentSystemRoleSettings());
  };

  const handleButtonClick = async () => {
    const inputValue = inputRef.value;
    if (!inputValue) return;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (window?.umami) umami.trackEvent("chat_generate");
    inputRef.value = "";
    const m: ChatMessage = {
      role: "user",
      content: inputValue,
    };
    setMessageList([...messageList(), m]);
    saveChatMessage("firstroom", m);

    requestWithLatestMessage();
  };

  const smoothToBottom = useThrottleFn(
    () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    },
    300,
    false,
    true
  );

  const requestWithLatestMessage = async () => {
    setLoading(true);
    setCurrentAssistantMessage("");
    setCurrentError(null);
    const storagePassword = localStorage.getItem("pass");
    try {
      const controller = new AbortController();
      setController(controller);
      const requestMessageList = [...messageList()];
      if (currentSystemRoleSettings()) {
        requestMessageList.unshift({
          role: "system",
          content: currentSystemRoleSettings(),
        });
      }
      const timestamp = Date.now();
      const response = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          messages: requestMessageList,
          time: timestamp,
          pass: storagePassword,
          sign: await generateSignature({
            t: timestamp,
            m:
              requestMessageList?.[requestMessageList.length - 1]?.content ||
              "",
          }),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = await response.json();
        console.error(error.error);
        setCurrentError(error.error);
        throw new Error("Request failed");
      }
      const data = response.body;
      if (!data) throw new Error("No data");

      const reader = data.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          const char = decoder.decode(value);
          if (char === "\n" && currentAssistantMessage().endsWith("\n"))
            continue;

          if (char)
            setCurrentAssistantMessage(currentAssistantMessage() + char);

          // smoothToBottom()
        }
        done = readerDone;
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      setController(null);
      return;
    }
    archiveCurrentMessage();
  };

  const archiveCurrentMessage = () => {
    if (currentAssistantMessage()) {
      const m: ChatMessage = {
        role: "assistant",
        content: currentAssistantMessage(),
      };
      setMessageList([...messageList(), m]);
      saveChatMessage("firstroom", m);

      setCurrentAssistantMessage("");
      setLoading(false);
      setController(null);
      inputRef.focus();
    }
  };

  const clear = () => {
    inputRef.value = "";
    inputRef.style.height = "auto";
    setMessageList([]);
    setCurrentAssistantMessage("");
    setCurrentError(null);
  };

  const stopStreamFetch = () => {
    if (controller()) {
      controller().abort();
      archiveCurrentMessage();
    }
  };

  const retryLastFetch = () => {
    if (messageList().length > 0) {
      const lastMessage = messageList()[messageList().length - 1];
      if (lastMessage.role === "assistant")
        setMessageList(messageList().slice(0, -1));

      requestWithLatestMessage();
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.isComposing || e.shiftKey) return;

    if (e.key === "Enter") handleButtonClick();
  };

  return (
    <div my-6>
      <SystemRoleSettings
        canEdit={() => messageList().length === 0}
        systemRoleEditing={systemRoleEditing}
        setSystemRoleEditing={setSystemRoleEditing}
        currentSystemRoleSettings={currentSystemRoleSettings}
        setCurrentSystemRoleSettings={setCurrentSystemRoleSettings}
      />
      <Index each={messageList()}>
        {(message, index) => (
          <MessageItem
            role={message().role}
            message={message().content}
            showRetry={() =>
              message().role === "assistant" &&
              index === messageList().length - 1
            }
            onRetry={retryLastFetch}
          />
        )}
      </Index>
      {currentAssistantMessage() && (
        <MessageItem role="assistant" message={currentAssistantMessage} />
      )}
      {currentError() && (
        <ErrorMessageItem data={currentError()} onRetry={retryLastFetch} />
      )}
      <Show
        when={!loading()}
        fallback={() => (
          <div class="gen-cb-wrapper">
            <span>AIは考え中...</span>
            <div class="gen-cb-stop" onClick={stopStreamFetch}>
              止める
            </div>
          </div>
        )}
      >
        <div class="gen-text-wrapper" class:op-50={systemRoleEditing()}>
          <textarea
            ref={inputRef!}
            disabled={systemRoleEditing()}
            onKeyDown={handleKeydown}
            placeholder="Enter something..."
            autocomplete="off"
            autofocus
            onInput={() => {
              inputRef.style.height = "auto";
              inputRef.style.height = `${inputRef.scrollHeight}px`;
            }}
            rows="1"
            class="gen-textarea"
          />
        </div>
        <button
          onClick={handleButtonClick}
          disabled={systemRoleEditing()}
          gen-slate-btn
        >
          送る
        </button>{" "}
        <button
          title="Clear"
          onClick={clear}
          disabled={systemRoleEditing()}
          gen-slate-btn
        >
          過去ログを消す
        </button>{" "}
        <button
          onClick={() => {
            navigator.clipboard.writeText(
              messageList()
                .map(
                  (message, index) =>
                    `## ${index}: ${message.role}\n\n ${message.content}\n\n`
                )
                .join("\n")
            );
          }}
          gen-slate-btn
        >
          この会話をコピー
        </button>
      </Show>
    </div>
  );
};
