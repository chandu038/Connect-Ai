import { memo, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import {
  ArrowUp,
  Award,
  Bot,
  Building2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  Mic,
  Pencil,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";

import { transcribeAudio, generateVoice } from "@/lib/voiceApi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ==========================================
// CONFIGURATION
// ==========================================

const VOICE_CONFIG = {
  speechThreshold: 0.012,
  silenceDuration: 1300,
  maximumRecording: 25000,
  initialSilenceTimeout: 12000,
  minimumAudioSize: 300,
};

// Set to true to resume listening automatically after each spoken answer.
const AUTO_CONTINUE_VOICE = false;

const TELUGU_PATTERN = /[\u0C00-\u0C7F]/;

const STARTERS = [
  {
    icon: GraduationCap,
    title: "Admission eligibility",
    question: "What is the eligibility for B.Tech admission?",
  },
  {
    icon: Wallet,
    title: "Courses & fees",
    question: "What is the annual tuition fee for CSE?",
  },
  {
    icon: Award,
    title: "Scholarships",
    question: "What scholarships are available?",
  },
  {
    icon: Building2,
    title: "Hostel facilities",
    question: "What hostel facilities are available?",
  },
];

const STATUS_TEXT = {
  idle: "Answers use published college documents and approved official websites.",
  listening: "Listening… Speak in English or Telugu.",
  transcribing: "Recognizing speech and language…",
  thinking: "Checking college documents and official websites…",
  speaking: "Connect-Ai is speaking…",
};

// ==========================================
// LANGUAGE HELPERS
// ==========================================

function detectTypedLanguage(text) {
  return TELUGU_PATTERN.test(String(text || "")) ? "te-IN" : "en-IN";
}

function resolveSpeechLanguage(transcription, recognizedText, selectedLanguage) {
  const detected = String(
    transcription?.language_code || transcription?.detected_language || ""
  ).toLowerCase();

  if (detected.startsWith("te")) return "te-IN";
  if (detected.startsWith("en")) return "en-IN";
  if (TELUGU_PATTERN.test(recognizedText)) return "te-IN";
  if (selectedLanguage === "te-IN") return "te-IN";
  return "en-IN";
}

// Normalize only common model-generated Markdown escaping. This is a display
// normalization step, not a replacement for evidence-grounded backend answers.
function normalizeAssistantMarkdown(value) {
  return String(value ?? "")
    .replace(/\\\*/g, "*")
    .replace(/(\d{1,2})\\\./g, "$1.")
    // Some LLM responses put every numbered point on one long line.
    .replace(/\s+(?=(?:[2-9]|1\d)\.\s)/g, "\n\n")
    .trim();
}

function getAnswerLanguage(message) {
  if (message?.language_code === "te-IN") return "te-IN";
  if (message?.language_code === "en-IN") return "en-IN";
  return TELUGU_PATTERN.test(message?.content || "") ? "te-IN" : "en-IN";
}

// ==========================================
// SMALL UI PIECES
// ==========================================

const AssistantAvatar = memo(function AssistantAvatar() {
  return (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarFallback className="bg-primary/10 text-primary">
        <Bot className="h-4 w-4" aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  );
});

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 sm:gap-3" role="status" aria-live="polite">
      <AssistantAvatar />
      <Card className="flex-row items-center gap-2 rounded-2xl rounded-tl-sm px-4 py-3 shadow-none">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        <span className="text-xs text-muted-foreground">
          Connect-Ai is preparing an answer…
        </span>
      </Card>
    </div>
  );
}

function Welcome({ user, onSend, loading }) {
  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-6 text-center sm:py-14">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
        <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Hello, {firstName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask Connect-Ai about admissions, fees, courses, scholarships, and campus facilities.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {STARTERS.map((starter) => {
          const Icon = starter.icon;
          return (
            <Button
              key={starter.title}
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onSend(starter.question)}
              className="h-auto justify-start gap-3 rounded-xl p-3 text-left whitespace-normal sm:flex-col sm:items-start sm:p-4"
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-medium">{starter.title}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// MESSAGE PARTS
// ==========================================

const AnswerSources = memo(function AnswerSources({ sources }) {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-semibold text-muted-foreground">Sources</p>

      <ul className="flex flex-col gap-1.5">
        {sources.map((source, index) => {
          const citation = source.citation || `[${index + 1}]`;
          const title = source.document_title || source.title || "College source";
          const key = `${citation}-${index}`;

          if (
            source.source_type === "web" &&
            typeof source.url === "string" &&
            /^https:\/\//i.test(source.url)
          ) {
            return (
              <li key={key}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-xs text-primary underline-offset-4 hover:underline"
                >
                  {citation} {title}
                </a>
              </li>
            );
          }

          return (
            <li key={key} className="text-xs text-muted-foreground">
              <span className="font-medium">{citation}</span> {title}
              {source.page_number != null && <span> · Page {source.page_number}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

// Follow-ups stay collapsed until the student asks to see them.
const Followups = memo(function Followups({ questions, onSend, loading }) {
  const [open, setOpen] = useState(false);

  if (!questions?.length) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Sparkles className="sparkle-pulse h-3 w-3 text-primary" aria-hidden="true" />
        {open
          ? "Hide related questions"
          : `Show ${questions.length} related question${questions.length > 1 ? "s" : ""}`}
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-300 sm:flex-row sm:flex-wrap">
          {questions.map((question, index) => (
            <Button
              key={`${question}-${index}`}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onSend(question)}
              style={{ animationDelay: `${index * 80}ms` }}
              className="followup-chip group relative h-auto max-w-full overflow-hidden whitespace-normal rounded-xl py-2 text-left animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-both"
            >
              <Sparkles
                className="followup-chip-spark absolute right-1.5 top-1.5 h-3 w-3 text-primary opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
                aria-hidden="true"
              />
              <span className="relative z-10 pr-4">{question}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
});

// ==========================================
// CHAT MESSAGES
// ==========================================

const UserMessage = memo(function UserMessage({ message, onEdit, loading }) {
  return (
    <div className="flex justify-end gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={loading}
        onClick={() => onEdit(message)}
        aria-label="Edit and resend this question"
        title="Edit and resend"
        className="mt-1 h-8 w-8 shrink-0"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground sm:max-w-[80%]">
        {message.content}
      </div>
    </div>
  );
});

const AssistantMessage = memo(function AssistantMessage({
  message,
  isSpeaking,
  onSpeak,
  onSend,
  loading,
  showFollowups,
  registerAnswer,
}) {
  return (
    <div
      ref={(element) => registerAnswer(message.id, element)}
      className="flex scroll-mt-3 items-start gap-2 sm:gap-3"
    >
      <AssistantAvatar />

      <div className="min-w-0 flex-1 space-y-3 sm:max-w-[85%]">
        <Card className="gap-0 rounded-2xl rounded-tl-sm py-0 shadow-none">
          <CardContent className="space-y-3 p-3 sm:p-4">
            <div className="min-w-0 break-words text-sm leading-6 sm:leading-7">
              <ReactMarkdown
                skipHtml
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 list-decimal space-y-2 pl-5">{children}</ol>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-2 list-disc space-y-2 pl-5">{children}</ul>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  a: ({ href, children }) =>
                    typeof href === "string" && /^https:\/\//i.test(href) ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        {children}
                      </a>
                    ) : (
                      <span>{children}</span>
                    ),
                  img: () => null,
                }}
              >
                {normalizeAssistantMarkdown(message.content)}
              </ReactMarkdown>
            </div>

            <AnswerSources sources={message.sources} />

            {message.needs_support && (
              <p className="text-xs text-muted-foreground">
                Please contact admission support if more confirmation is needed.
              </p>
            )}

            {!message.is_error && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSpeak(message)}
                  className="gap-2"
                  aria-pressed={isSpeaking}
                >
                  {isSpeaking ? (
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSpeaking ? "Stop" : "Listen"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {showFollowups && (
          <Followups questions={message.followups} onSend={onSend} loading={loading} />
        )}
      </div>
    </div>
  );
});

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function StudentChat({
  user,
  messages = [],
  loading = false,
  onSend,
  token,
}) {
  const [question, setQuestion] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("auto");
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [speakingId, setSpeakingId] = useState(null);

  const onSendRef = useRef(onSend);
  const mountedRef = useRef(true);
  const activeRef = useRef(false);
  const sessionRef = useRef(0);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const chunksRef = useRef([]);

  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const audioControllerRef = useRef(null);
  const audioCancelRef = useRef(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const answerElementsRef = useRef({});
  const lastAnswerIdRef = useRef(null);

  onSendRef.current = onSend;

  const latestAssistantIndex = useMemo(
    () => messages.findLastIndex((item) => item.role === "assistant"),
    [messages]
  );

  const latestAssistantId = messages[latestAssistantIndex]?.id ?? null;

  const canSend = !loading && !voiceActive && question.trim().length > 0;

  function isCurrent(sessionId) {
    return mountedRef.current && activeRef.current && sessionRef.current === sessionId;
  }

  function registerAnswer(id, element) {
    if (!id) return;

    if (element) {
      answerElementsRef.current[id] = element;
    } else {
      delete answerElementsRef.current[id];
    }
  }

  // ========================================
  // AUDIO CLEANUP
  // ========================================

  function stopAudio() {
    audioControllerRef.current?.abort();
    audioControllerRef.current = null;

    audioCancelRef.current?.();
    audioCancelRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (mountedRef.current) setSpeakingId(null);
  }

  function cleanupMicrophone() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (recorderRef.current) {
      const recorder = recorderRef.current;
      recorderRef.current = null;

      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* already stopped */
        }
      }
    }

    sourceRef.current?.disconnect?.();
    sourceRef.current = null;
    analyserRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context.state !== "closed") context.close().catch(() => {});
    }
  }

  function stopConversation() {
    activeRef.current = false;
    sessionRef.current += 1;

    cleanupMicrophone();
    stopAudio();

    if (mountedRef.current) {
      setVoiceActive(false);
      setVoiceStatus("idle");
      setQuestion("");
    }
  }

  // ========================================
  // TEXT-TO-SPEECH
  // ========================================

  async function speakAnswer(message, sessionId = null) {
    if (!token || !message) return false;

    stopAudio();

    const text = normalizeAssistantMarkdown(message.content ?? message.answer ?? "")
      .replace(/\[\d+\]/g, "")
      .replace(/\*\*/g, "")
      .trim()
      .slice(0, 2500);

    if (!text) return false;

    const language = getAnswerLanguage(message);
    const controller = new AbortController();
    audioControllerRef.current = controller;

    setSpeakingId(message.id ?? "voice");
    setVoiceStatus("speaking");

    try {
      const blob = await generateVoice(text, token, language, controller.signal);

      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        (sessionId !== null && !isCurrent(sessionId))
      ) {
        return false;
      }

      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      const completed = await new Promise((resolve, reject) => {
        let settled = false;

        const finish = (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };

        audioCancelRef.current = () => finish(false);
        audio.onended = () => finish(true);
        audio.onerror = () => {
          if (settled) return;
          settled = true;
          reject(new Error("Audio playback failed"));
        };

        audio.play().catch(reject);
      });

      if (audioRef.current === audio) stopAudio();
      return completed;
    } catch (error) {
      if (error.name !== "AbortError" && !controller.signal.aborted) {
        toast.error(error.message || "Unable to play the answer.");
      }
      if (audioControllerRef.current === controller) stopAudio();
      return false;
    }
  }

  // ========================================
  // STT → RAG → TTS
  // ========================================

  async function processRecording(blob, sessionId) {
    if (!isCurrent(sessionId)) return;

    if (!blob || blob.size < VOICE_CONFIG.minimumAudioSize) {
      await startListening(sessionId);
      return;
    }

    setVoiceStatus("transcribing");

    try {
      const transcription = await transcribeAudio(
        blob,
        token,
        voiceLanguage === "auto" ? "unknown" : voiceLanguage
      );

      if (!isCurrent(sessionId)) return;

      const recognizedText = String(
        transcription?.transcript || transcription?.text || ""
      ).trim();

      if (!recognizedText) throw new Error("No speech was recognized.");

      const language = resolveSpeechLanguage(transcription, recognizedText, voiceLanguage);

      setDetectedLanguage(language);
      setQuestion(recognizedText);
      setVoiceStatus("thinking");

      const answer = await onSendRef.current(recognizedText, language, true);

      if (!isCurrent(sessionId)) return;

      setQuestion("");

      if (!answer || answer.is_error) {
        throw new Error("Connect-Ai could not answer the question.");
      }

      const played = await speakAnswer(answer, sessionId);
      if (!isCurrent(sessionId)) return;

      if (!played) {
        stopConversation();
        return;
      }

      // Stop after the answer so the student can read it.
      // Set AUTO_CONTINUE_VOICE = true to keep listening.
      if (AUTO_CONTINUE_VOICE) {
        await startListening(sessionId);
      } else {
        stopConversation();
      }
    } catch (error) {
      if (!isCurrent(sessionId)) return;
      toast.error(error.message || "Voice conversation failed.");
      stopConversation();
    }
  }

  // ========================================
  // RECORD UNTIL SILENCE
  // ========================================

  async function startListening(sessionId) {
    if (!isCurrent(sessionId)) return;

    cleanupMicrophone();
    setVoiceStatus("listening");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!isCurrent(sessionId)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      chunksRef.current = [];

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      audioContextRef.current = context;

      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const samples = new Uint8Array(analyser.fftSize);

      let speechStarted = false;
      let lastSpeechAt = 0;
      let completed = false;
      const startedAt = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        if (completed) return;
        completed = true;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        cleanupMicrophone();

        if (isCurrent(sessionId)) {
          await processRecording(blob, sessionId);
        }
      };

      recorder.start(250);

      const finishRecording = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };

      const checkSpeech = (now) => {
        if (!isCurrent(sessionId) || recorder.state !== "recording") return;

        analyser.getByteTimeDomainData(samples);

        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const value = (samples[i] - 128) / 128;
          sum += value * value;
        }

        const volume = Math.sqrt(sum / samples.length);

        if (volume > VOICE_CONFIG.speechThreshold) {
          speechStarted = true;
          lastSpeechAt = now;
        }

        if (speechStarted && now - lastSpeechAt > VOICE_CONFIG.silenceDuration) {
          finishRecording();
          return;
        }

        if (
          (!speechStarted && now - startedAt > VOICE_CONFIG.initialSilenceTimeout) ||
          now - startedAt > VOICE_CONFIG.maximumRecording
        ) {
          finishRecording();
          return;
        }

        animationRef.current = requestAnimationFrame(checkSpeech);
      };

      animationRef.current = requestAnimationFrame(checkSpeech);
    } catch (error) {
      if (!isCurrent(sessionId)) return;

      toast.error(
        error.name === "NotAllowedError"
          ? "Please allow microphone access."
          : error.message || "Unable to start the microphone."
      );

      stopConversation();
    }
  }

  // ========================================
  // CONTROLS
  // ========================================

  async function toggleConversation() {
    if (activeRef.current) {
      stopConversation();
      return;
    }

    if (!token) {
      toast.error("Please sign in again.");
      return;
    }

    if (loading) return;

    stopAudio();

    activeRef.current = true;
    sessionRef.current += 1;

    const sessionId = sessionRef.current;

    setVoiceActive(true);
    setVoiceStatus("listening");

    await startListening(sessionId);
  }

  async function handleSpeak(message) {
    if (speakingId === (message.id ?? "voice")) {
      stopAudio();
      setVoiceStatus("idle");
      return;
    }

    if (activeRef.current) stopConversation();

    await speakAnswer(message);
  }

  function editQuestion(message) {
    if (loading || voiceActive) return;
    // Prefill the composer. This sends a NEW question and does not erase
    // earlier messages; true history replacement requires App.jsx changes.
    setQuestion(String(message?.content ?? ""));
    textareaRef.current?.focus();
  }

  function submit(text = question) {
    const value = String(text || "").trim();
    if (!value || loading || voiceActive) return;

    const language = detectTypedLanguage(value);
    setDetectedLanguage(language);

    onSendRef.current(value, language, false);
    setQuestion("");
  }

  // ========================================
  // LIFECYCLE
  // ========================================

  // Scroll once to the beginning of each newly generated answer.
  // Never scroll just because loading changed or follow-ups were rendered.
  useEffect(() => {
    if (!latestAssistantId || lastAnswerIdRef.current === latestAssistantId) return;

    const frameId = requestAnimationFrame(() => {
      const element = answerElementsRef.current[latestAssistantId];
      if (!element) return;

      lastAnswerIdRef.current = latestAssistantId;
      element.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    });

    return () => cancelAnimationFrame(frameId);
  }, [latestAssistantId]);

  // Scroll to the new student message / typing indicator ONLY when a
  // student message is appended. Do not depend on `loading`, because
  // its transition to false used to pull the view down after the answer.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "user") return;

    const frameId = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(frameId);
  }, [messages.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      activeRef.current = false;
      sessionRef.current += 1;
      cleanupMicrophone();
      stopAudio();
    };
  }, []);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* MESSAGES */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-4 sm:px-4 sm:py-6">
          {messages.length === 0 && !loading && (
            <Welcome user={user} loading={loading} onSend={submit} />
          )}

          {messages.map((message, index) =>
            message.role === "user" ? (
              <UserMessage
                key={message.id ?? index}
                message={message}
                onEdit={editQuestion}
                loading={loading || voiceActive}
              />
            ) : (
              <AssistantMessage
                key={message.id ?? index}
                message={message}
                isSpeaking={speakingId === (message.id ?? "voice")}
                onSpeak={handleSpeak}
                onSend={submit}
                loading={loading || voiceActive}
                showFollowups={index === latestAssistantIndex}
                registerAnswer={registerAnswer}
              />
            )
          )}

          {loading && <TypingIndicator />}

          <div ref={bottomRef} />
          {/* Extra scroll space allows even short answers to align near the
              top of the viewport, rather than stopping at follow-up chips. */}
          {!loading && messages[messages.length - 1]?.role === "assistant" && (
            <div className="h-[75vh]" aria-hidden="true" />
          )}
        </div>
      </ScrollArea>

      {/* COMPOSER */}
      <div className="shrink-0 border-t bg-background/95 px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 sm:pt-3">
        <div className="mx-auto w-full max-w-3xl space-y-2">
          {/* Language row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="chat-language" className="text-xs font-medium text-muted-foreground">
                Mic
              </label>
              <select
                id="chat-language"
                value={voiceLanguage}
                disabled={voiceActive}
                onChange={(event) => {
                  setVoiceLanguage(event.target.value);
                  stopAudio();
                }}
                className="h-8 rounded-lg border bg-background px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
              >
                <option value="auto">Auto detect</option>
                <option value="en-IN">English</option>
                <option value="te-IN">తెలుగు</option>
              </select>
            </div>

            {detectedLanguage && (
              <Badge variant="outline" className="text-[11px] sm:text-xs">
                Last: {detectedLanguage === "te-IN" ? "Telugu" : "English"}
              </Badge>
            )}
          </div>

          {/* Input */}
          <div
            className={cn(
              "flex items-end gap-1.5 rounded-2xl border bg-background p-1.5 shadow-sm transition-colors sm:gap-2 sm:p-2",
              voiceActive && "border-red-400/60"
            )}
          >
            <Textarea
              ref={textareaRef}
              value={question}
              disabled={voiceActive}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={voiceActive ? "Voice conversation is active…" : "Ask about admissions, fees…"}
              rows={1}
              enterKeyHint="send"
              className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-base shadow-none focus-visible:ring-0 sm:text-sm"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
            />

            <Button
              type="button"
              size="icon"
              variant={voiceActive ? "destructive" : "outline"}
              disabled={loading && !voiceActive}
              onClick={toggleConversation}
              className="h-10 w-10 shrink-0 rounded-xl"
              aria-label={voiceActive ? "Stop voice conversation" : "Start voice conversation"}
            >
              {voiceActive ? (
                <Square className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={!canSend}
              onClick={() => submit()}
              aria-label="Send question"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>

          {/* Status */}
          <p className="text-center text-[11px] text-muted-foreground sm:text-xs" aria-live="polite">
            {STATUS_TEXT[voiceStatus] || STATUS_TEXT.idle}
          </p>

          {voiceActive && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />
                Voice conversation active
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}