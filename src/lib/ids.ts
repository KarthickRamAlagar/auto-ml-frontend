/** 12-char lowercase id, matches the backend's chat id pattern ^[a-z0-9]{8,24}$ */
export function newChatId(): string {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join("") + Math.random().toString(36).slice(2, 5);
}

export const chatPath = (id: string) => `/auto-ml/chat/${id}`;
export const projectPath = (id: string) => `/auto-ml/project/${id}`;
export const newChatPath = (projectId?: string) => `/auto-ml/chat/${newChatId()}${projectId ? `?project=${projectId}` : ""}`;
