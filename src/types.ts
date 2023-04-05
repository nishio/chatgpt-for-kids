export interface ChatMessage {
  role: "system" | "user" | "assistant" | "user_ja" | "assistant_ja";
  content: string;
  to_use: boolean;
}

export interface ErrorMessage {
  code: string;
  message: string;
}
