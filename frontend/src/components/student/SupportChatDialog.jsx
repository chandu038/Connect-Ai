import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, Headset, Loader2, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const SUPPORT_URL = `${API_URL}/api/v1/student/support/messages`;
const STUDENT_ROLES = ["student", "parent", "applicant"];
const POLL_INTERVAL_MS = 15000;
const MAX_LENGTH = 2000;

async function supportRequest(token, options = {}) {
  const response = await fetch(SUPPORT_URL, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if ([404, 405].includes(response.status)) {
      throw new Error("Admission support chat isn't available yet.");
    }
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Unable to contact admission support."
    );
  }

  return data;
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SupportBubble({ item }) {
  const fromStudent = STUDENT_ROLES.includes(item.sender_role);
  const time = formatTime(item.created_at);

  return (
    <div
      className={`flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        fromStudent ? "justify-end" : "justify-start"
      }`}
    >
      {!fromStudent && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Headset className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[80%] sm:px-4 ${
          fromStudent
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border bg-card"
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-6">
          {item.message ?? item.content ?? ""}
        </p>

        <p
          className={`mt-1 text-[10px] ${
            fromStudent ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {fromStudent ? "You" : "Admission Support"}
          {time ? ` · ${time}` : ""}
        </p>
      </div>
    </div>
  );
}

export default function SupportChatDialog({ open, onOpenChange, token }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const loadMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      if (!silent) setRefreshing(true);

      try {
        const data = await supportRequest(token);
        const items = Array.isArray(data) ? data : data?.messages;

        if (!Array.isArray(items)) {
          throw new Error("Invalid support message response.");
        }

        setMessages(items);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!open) return;

    loadMessages();
    const id = window.setInterval(
      () => loadMessages({ silent: true }),
      POLL_INTERVAL_MS
    );

    return () => window.clearInterval(id);
  }, [open, loadMessages]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, open]);

  async function handleSend(event) {
    event?.preventDefault();

    const content = message.trim();
    if (!content || sending || !token) return;

    setSending(true);
    setError("");

    try {
      await supportRequest(token, {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });

      setMessage("");
      toast.success("Message sent to admission support");
      await loadMessages({ silent: true });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(680px,85dvh)] sm:max-w-lg sm:rounded-2xl"
      >
        <DialogHeader className="relative shrink-0 space-y-0 border-b px-4 py-3 pr-24 text-left sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
              <Headset className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>

            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg">
                Admission Support
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-xs">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                Support hours 9 AM – 4 PM
              </DialogDescription>
            </div>
          </div>

          <div className="absolute right-2 top-2 flex items-center gap-1 sm:right-3 sm:top-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => loadMessages()}
              disabled={refreshing}
              aria-label="Refresh messages"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
            </Button>

            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label="Close support chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 bg-muted/20">
          <div className="space-y-3 p-3 sm:space-y-4 sm:p-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-14 sm:w-14">
                  <Headset className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <h3 className="font-semibold">Need help with admissions?</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  Send your question and the admission team will reply here.
                </p>
              </div>
            ) : (
              messages.map((item, index) => (
                <SupportBubble key={item.id ?? index} item={item} />
              ))
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {error && (
          <div
            role="alert"
            className="shrink-0 border-t bg-destructive/10 px-4 py-2 text-xs text-destructive"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="flex shrink-0 items-end gap-2 border-t bg-background p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4"
        >
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message…"
            enterKeyHint="send"
            maxLength={MAX_LENGTH}
            rows={1}
            disabled={sending}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl text-base sm:text-sm"
          />

          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            disabled={!message.trim() || sending}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}