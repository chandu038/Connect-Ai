import { useEffect, useRef, useState } from "react";
import { Bot, Menu, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import StudentChat from "./StudentChat";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 60000;
const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY = 8;
const TELUGU_RE = /[\u0C00-\u0C7F]/;

function makeId() {
  return crypto.randomUUID();
}

function makeConversation() {
  return {
    id: makeId(),
    title: "New chat",
    messages: [],
    createdAt: Date.now(),
  };
}

function loadConversations(storageKey) {
  try {
    const saved = sessionStorage.getItem(storageKey);
    const chats = saved ? JSON.parse(saved) : [];

    if (
      Array.isArray(chats) &&
      chats.length > 0 &&
      chats.every(
        (chat) => typeof chat.id === "string" && Array.isArray(chat.messages)
      )
    ) {
      return chats;
    }
  } catch (error) {
    console.warn("Unable to load conversations", error);
  }

  return [makeConversation()];
}

/**
 * Typed messages never inherit a previous Telugu voice selection.
 * Spoken questions use the language Sarvam detected.
 */
function resolveMessageLanguage(question, languageCode = "en-IN", spoken = false) {
  if (TELUGU_RE.test(question)) return "te-IN";
  if (spoken) return languageCode === "te-IN" ? "te-IN" : "en-IN";
  return "en-IN";
}

function Sidebar({ user, conversations, activeId, onNew, onSelect, onDelete }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </span>
        <span className="font-semibold">Connect-Ai</span>
      </div>

      <div className="px-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <p className="px-4 pb-2 pt-5 text-xs font-medium text-muted-foreground">
        Recent conversations
      </p>

      <ScrollArea className="min-h-0 flex-1 px-2">
        <div className="space-y-1 pb-4">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center gap-1 rounded-lg transition-colors ${
                activeId === chat.id ? "bg-accent" : "hover:bg-accent/60"
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                className="h-11 min-w-0 flex-1 justify-start gap-2 px-3 font-normal"
                onClick={() => onSelect(chat.id)}
                aria-current={activeId === chat.id ? "true" : undefined}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{chat.title}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mr-1 h-8 w-8 shrink-0"
                aria-label={`Delete ${chat.title}`}
                onClick={() => onDelete(chat)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback>
              {user?.name?.charAt(0)?.toUpperCase() || "S"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name || "Student"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
          </div>

          <Badge variant="outline" className="shrink-0">
            {user?.role === "parent" ? "Parent" : "Student"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard({ user, token }) {
  const storageKey = `connect-ai-chats-${user.college_id}-${user.id}`;

  const [conversations, setConversations] = useState(() =>
    loadConversations(storageKey)
  );
  const [activeId, setActiveId] = useState(() => conversations[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const activeIdRef = useRef(activeId);
  const requestRef = useRef(null);
  const loadingRef = useRef(false);

  const activeConversation = conversations.find((chat) => chat.id === activeId);
  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(conversations));
    } catch (error) {
      console.warn("Unable to save conversation", error);
    }
  }, [storageKey, conversations]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  function cancelRequest() {
    requestRef.current?.abort();
    requestRef.current = null;
    loadingRef.current = false;
    setLoading(false);
  }

  function createNewChat() {
    cancelRequest();
    const chat = makeConversation();
    setConversations((previous) => [chat, ...previous]);
    activeIdRef.current = chat.id;
    setActiveId(chat.id);
    setMobileOpen(false);
  }

  function selectChat(id) {
    if (id !== activeIdRef.current) {
      cancelRequest();
      activeIdRef.current = id;
      setActiveId(id);
    }
    setMobileOpen(false);
  }

  function deleteChat() {
    if (!pendingDelete) return;

    cancelRequest();

    const remaining = conversations.filter((chat) => chat.id !== pendingDelete.id);
    if (!remaining.length) remaining.push(makeConversation());

    setConversations(remaining);

    if (activeIdRef.current === pendingDelete.id) {
      activeIdRef.current = remaining[0].id;
      setActiveId(remaining[0].id);
    }

    setPendingDelete(null);
    toast.success("Conversation deleted");
  }

  function addMessage(conversationId, message) {
    setConversations((previous) =>
      previous.map((chat) =>
        chat.id === conversationId
          ? { ...chat, messages: [...chat.messages, message] }
          : chat
      )
    );
  }

  /**
   * Called by StudentChat for typed and voice questions.
   * Returns the assistant message so automatic TTS can play it.
   */
  async function sendMessage(value, languageCode = "en-IN", spoken = false) {
    const question = typeof value === "string" ? value.trim() : "";

    if (!question || loadingRef.current) return null;

    if (question.length > MAX_QUESTION_LENGTH) {
      toast.error(`Question must be under ${MAX_QUESTION_LENGTH} characters.`);
      return null;
    }

    if (!token) {
      toast.error("Please sign in again.");
      return null;
    }

    const conversationId = activeIdRef.current;
    if (!conversationId) return null;

    const language = resolveMessageLanguage(question, languageCode, spoken);

    const history = (
      conversations.find((chat) => chat.id === conversationId)?.messages ?? []
    )
      .slice(-MAX_HISTORY)
      .filter(
        (item) =>
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string"
      )
      .map((item) => ({ role: item.role, content: item.content }));

    loadingRef.current = true;
    setLoading(true);

    setConversations((previous) =>
      previous.map((chat) =>
        chat.id === conversationId
          ? {
              ...chat,
              title:
                chat.messages.length === 0 ? question.slice(0, 45) : chat.title,
              messages: [
                ...chat.messages,
                {
                  id: makeId(),
                  role: "user",
                  content: question,
                  language_code: language,
                },
              ],
            }
          : chat
      )
    );

    const controller = new AbortController();
    requestRef.current = controller;

    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}/api/v1/student/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question, language_code: language, history }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.dispatchEvent(new Event("connect-ai-auth-expired"));
        throw new Error("Session expired. Please sign in again.");
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Unable to get an answer."
        );
      }

      if (
        controller.signal.aborted ||
        requestRef.current !== controller ||
        activeIdRef.current !== conversationId
      ) {
        return null;
      }

      const responseLanguage =
        data.language_code === "te-IN"
          ? "te-IN"
          : data.language_code === "en-IN"
            ? "en-IN"
            : language;

      const aiMessage = {
        id: makeId(),
        role: "assistant",
        content: typeof data.answer === "string" ? data.answer : "No answer returned.",
        sources: Array.isArray(data.sources) ? data.sources : [],
        followups: Array.isArray(data.followups) ? data.followups.slice(0, 3) : [],
        needs_support: Boolean(data.needs_support),
        language_code: responseLanguage,
        auto_speak: spoken,
      };

      addMessage(conversationId, aiMessage);
      return aiMessage;
    } catch (error) {
      if (
        requestRef.current !== controller ||
        activeIdRef.current !== conversationId
      ) {
        return null;
      }

      const errorMessage =
        error.name === "AbortError"
          ? "The request timed out."
          : error.message || "Something went wrong.";

      toast.error(errorMessage);

      if (!controller.signal.aborted) {
        addMessage(conversationId, {
          id: makeId(),
          role: "assistant",
          content: "I couldn't complete your request. Please try again.",
          sources: [],
          followups: [],
          needs_support: false,
          language_code: "en-IN",
          is_error: true,
        });
      }

      return null;
    } finally {
      clearTimeout(timeout);

      if (requestRef.current === controller) {
        requestRef.current = null;
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }

  const sidebarProps = {
    user,
    conversations,
    activeId,
    onNew: createNewChat,
    onSelect: selectChat,
    onDelete: setPendingDelete,
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-muted/20 md:flex md:flex-col xl:w-72">
        <Sidebar {...sidebarProps} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Open conversations"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-accent md:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>

            <SheetContent side="left" className="w-[85vw] max-w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Conversations</SheetTitle>
              </SheetHeader>
              <Sidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {activeConversation?.title || "New chat"}
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Answers from verified college records
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            onClick={createNewChat}
            aria-label="New chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1">
          <StudentChat
            key={activeId}
            user={user}
            messages={messages}
            loading={loading}
            onSend={sendMessage}
            token={token}
          />
        </div>
      </section>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This conversation will be removed from your browser session.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={deleteChat}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}