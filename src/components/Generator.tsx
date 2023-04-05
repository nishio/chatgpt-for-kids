import { Index, Show, createSignal, onCleanup, onMount } from "solid-js";
import { useThrottleFn } from "solidjs-use";
import MessageItem from "./MessageItem";
import SystemRoleSettings from "./SystemRoleSettings";
import ErrorMessageItem from "./ErrorMessageItem";
import type { ChatMessage, ErrorMessage } from "@/types";

import { playMelody } from "../utils/music";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import { firebaseConfig, signInAnonymously } from "../utils/firebaseUtils";

let auth, db;

interface ChatRoom {
  id: string;
  name: string;
}
const [selectedRoomId, setSelectedRoomId] = createSignal("");
const [enableSmoothToBottom, setEnableSmoothToBottom] = createSignal(true);
const [enableMelody, setEnableMelody] = createSignal(true);

const DEFALUT_SYSTEM_ROLE =
  "You are a helpful teacher of Japanese junior high school student. Answer as concisely as possible. Answer in Japanese unless the question is asked in English. It is most important to encourage students to take actions.";

async function fetchRooms(): Promise<ChatRoom[]> {
  const userId = await signInAnonymously(auth);
  const rooms: ChatRoom[] = [];
  const querySnapshot = await db
    .collection("users")
    .doc(userId)
    .collection("rooms")
    .get();

  querySnapshot.forEach((doc) => {
    rooms.push({ id: doc.id, name: doc.data().name });
  });

  return rooms;
}

export default () => {
  let inputRef: HTMLTextAreaElement;
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] =
    createSignal(DEFALUT_SYSTEM_ROLE);
  const [systemRoleEditing, setSystemRoleEditing] = createSignal(false);
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([]);
  const [currentError, setCurrentError] = createSignal<ErrorMessage>();
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [controller, setController] = createSignal<AbortController>(null);
  const [numToken, setNumToken] = createSignal(0);
  const [lastMode, setLastMode] = createSignal("gpt4");

  const [roomList, setRoomList] = createSignal<ChatRoom[]>([]);

  async function createNewRoom(roomName: string): Promise<string> {
    const userId = await signInAnonymously(auth);
    const roomRef = await db
      .collection("users")
      .doc(userId)
      .collection("rooms")
      .add({ name: roomName });

    return roomRef.id;
  }

  const copy_log = () => {
    navigator.clipboard.writeText(
      messageList()
        .map(
          (message, index) =>
            `## ${index}: ${message.role}\n\n ${message.content}\n\n`
        )
        .join("\n")
    );
  };

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
        to_use: data.to_use ?? true,
      });
    });

    setMessageList(chatLog);
    return chatLog;
  }

  async function saveChatMessage(chatMessage: ChatMessage) {
    const roomId = selectedRoomId();
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

  async function saveSystemRole() {
    const roomId = selectedRoomId();
    const systemRole = currentSystemRoleSettings();
    const userId = await signInAnonymously(auth);
    await db
      .collection("users")
      .doc(userId)
      .collection("rooms")
      .doc(roomId)
      .update({ systemRole });
  }

  async function fetchSystemRole(roomId: string): Promise<string> {
    const userId = await signInAnonymously(auth);
    const roomDoc = await db
      .collection("users")
      .doc(userId)
      .collection("rooms")
      .doc(roomId)
      .get();

    return roomDoc.data()?.systemRole || DEFALUT_SYSTEM_ROLE;
  }

  onMount(() => {
    firebase.initializeApp(firebaseConfig);
    // @ts-ignore
    auth = firebase.auth();
    db = firebase.firestore();

    fetchRooms().then((rooms) => setRoomList(rooms));

    const storedRoomId = localStorage.getItem("selectedRoomId") || "firstroom";
    setSelectedRoomId(storedRoomId);
    restoreChatLog(storedRoomId);
  });

  const sendMessage = async (mode: string) => {
    const inputValue = inputRef.value;
    if (!inputValue) return;

    setLastMode(mode);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (window?.umami) umami.trackEvent("chat_generate");
    inputRef.value = "";
    const m: ChatMessage = {
      role: "user",
      content: inputValue,
      to_use: true,
    };
    setMessageList([...messageList(), m]);
    saveChatMessage(m);

    requestWithLatestMessage(mode);
  };

  const smoothToBottom = useThrottleFn(
    () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    },
    300,
    false,
    true
  );

  const requestWithLatestMessage = async (mode: string) => {
    setLoading(true);
    setCurrentAssistantMessage("");
    setCurrentError(null);
    try {
      const controller = new AbortController();
      setController(controller);
      // omit extra property
      const requestMessageList = messageList().map(({ role, content }) => {
        return {
          role,
          content,
        };
      });

      if (currentSystemRoleSettings()) {
        requestMessageList.unshift({
          role: "system",
          content: currentSystemRoleSettings(),
        });
      }
      const response = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          mode,
          messages: requestMessageList,
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

          if (char) {
            setCurrentAssistantMessage(currentAssistantMessage() + char);
          }

          if (enableSmoothToBottom()) {
            smoothToBottom();
          }
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
        to_use: true,
      };
      setMessageList([...messageList(), m]);
      saveChatMessage(m);

      setCurrentAssistantMessage("");
      setLoading(false);
      setController(null);
      inputRef.focus();
      if (enableMelody()) {
        playMelody();
      }
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

      requestWithLatestMessage(lastMode());
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    // debounce(count_token, 1000)();
  };

  return (
    <div my-6>
      <select
        value={selectedRoomId()}
        onChange={async (e) => {
          setSelectedRoomId(e.currentTarget.value);
          restoreChatLog(e.currentTarget.value);
          localStorage.setItem("selectedRoomId", e.currentTarget.value);
          const systemRole = await fetchSystemRole(e.currentTarget.value);
          setCurrentSystemRoleSettings(systemRole);
        }}
        class="gen-slate-select"
      >
        <Index each={roomList()}>
          {(room) => <option value={room().id}>{room().name}</option>}
        </Index>
      </select>
      <button
        onClick={async () => {
          const currentDate = new Date();
          const defaultRoomName = `${currentDate.getFullYear()}-${
            currentDate.getMonth() + 1
          }-${currentDate.getDate()} ${currentDate.getHours()}:${currentDate.getMinutes()}`;
          const roomName = prompt(
            "新しいルームの名前を入力してください",
            defaultRoomName
          );
          if (roomName) {
            const newRoomId = await createNewRoom(roomName);
            const updatedRooms = await fetchRooms();
            setRoomList(updatedRooms);
            setSelectedRoomId(newRoomId);
            restoreChatLog(newRoomId);
            localStorage.setItem("selectedRoomId", newRoomId);
          }
        }}
        gen-slate-btn
      >
        新規ルームを作成
      </button>

      <SystemRoleSettings
        systemRoleEditing={systemRoleEditing}
        setSystemRoleEditing={setSystemRoleEditing}
        currentSystemRoleSettings={currentSystemRoleSettings}
        setCurrentSystemRoleSettings={setCurrentSystemRoleSettings}
        saveSystemRole={saveSystemRole}
      />
      <Index each={messageList()}>
        {(message, index) => (
          <MessageItem
            role={message().role}
            message={message().content}
            to_use={message().to_use}
            showRetry={() =>
              message().role === "assistant" &&
              index === messageList().length - 1
            }
            onRetry={retryLastFetch}
          />
        )}
      </Index>
      {currentAssistantMessage() && (
        <MessageItem
          role="assistant"
          message={currentAssistantMessage}
          to_use={true}
        />
      )}
      {currentError() && (
        <ErrorMessageItem data={currentError()} onRetry={retryLastFetch} />
      )}
      <Show
        when={!loading()}
        fallback={() => (
          <div class="gen-cb-wrapper">
            <span>考え中...</span>
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
            placeholder="ここに聞きたいことを書く"
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
        <div>
          送る:
          <button
            onClick={() => sendMessage("gpt3")}
            disabled={systemRoleEditing()}
            gen-slate-btn
          >
            GPT-3.5(速い, 1円)
          </button>{" "}
          <button
            onClick={() => sendMessage("gpt4")}
            disabled={systemRoleEditing()}
            gen-slate-btn
          >
            GPT-4(賢い, 40円)
          </button>
          {/* <span>(トークン: {numToken})</span> */}
        </div>
        <div>
          <button
            title="Clear"
            onClick={clear}
            disabled={systemRoleEditing()}
            gen-slate-btn
          >
            過去ログを隠す
          </button>
          <a href="https://scrapbox.io/nishio/%E4%B8%AD%E9%AB%98%E7%94%9F%E3%81%AE%E3%81%9F%E3%82%81%E3%81%AEChatGPT#642a7087aff09e0000efee0e">
            [?]
          </a>{" "}
          <button onClick={copy_log} gen-slate-btn>
            この会話をコピー
          </button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={enableSmoothToBottom()}
            onChange={(e) => setEnableSmoothToBottom(e.currentTarget.checked)}
          />
          自動スクロール
        </label>
        <label>
          <input
            type="checkbox"
            checked={enableMelody()}
            onChange={(e) => setEnableMelody(e.currentTarget.checked)}
          />
          完了時メロディ
        </label>
      </Show>
    </div>
  );
};
