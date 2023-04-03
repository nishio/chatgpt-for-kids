export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  to_use: boolean;
}

export interface ErrorMessage {
  code: string;
  message: string;
}
