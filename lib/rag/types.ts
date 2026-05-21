export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type KnowledgeChunk = {
  id: string;
  source: string;
  title: string;
  content: string;
};

export type RetrievedChunk = KnowledgeChunk & {
  score: number;
};

export type ChatRequestBody = {
  message: string;
  history?: ChatMessage[];
};
