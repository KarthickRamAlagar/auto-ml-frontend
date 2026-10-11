import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Chat, Group } from "./types";

interface ChatsCtx {
  chats: Chat[];
  groups: Group[];
  loading: boolean;
  refresh: () => Promise<void>;
  createGroup: (name: string) => Promise<Group>;
  renameGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
  moveChat: (id: string, groupId: string | null) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
}

const Ctx = createContext<ChatsCtx | null>(null);

export function ChatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([api.get<{ chats: Chat[] }>("/api/chats"), api.get<{ groups: Group[] }>("/api/groups")]);
      setChats(c.chats);
      setGroups(g.groups);
    } catch {
      /* the sidebar is non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else {
      setChats([]);
      setGroups([]);
    }
  }, [user, refresh]);

  const value = useMemo<ChatsCtx>(
    () => ({
      chats,
      groups,
      loading,
      refresh,
      createGroup: async (name) => {
        const g = await api.post<Group>("/api/groups", { name });
        await refresh();
        return g;
      },
      renameGroup: async (id, name) => {
        await api.patch(`/api/groups/${id}`, { name });
        await refresh();
      },
      deleteGroup: async (id) => {
        await api.del(`/api/groups/${id}`);
        await refresh();
      },
      renameChat: async (id, title) => {
        await api.patch(`/api/chats/${id}`, { title });
        await refresh();
      },
      moveChat: async (id, groupId) => {
        await api.patch(`/api/chats/${id}`, groupId ? { group_id: groupId } : { ungroup: true });
        await refresh();
      },
      deleteChat: async (id) => {
        await api.del(`/api/chats/${id}`);
        await refresh();
      },
    }),
    [chats, groups, loading, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChats() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChats outside ChatsProvider");
  return c;
}
