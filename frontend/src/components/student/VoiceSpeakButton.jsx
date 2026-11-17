import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function pickVoice(voices, language) {
  const target = language.toLowerCase();
  const prefix = target.split("-")[0];

  return (
    voices.find((voice) => voice.lang.toLowerCase() === target) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

export default function VoiceSpeakButton({ text, language = "en-IN" }) {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  function stop() {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  }

  function handleSpeak() {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      toast.error("Voice playback is not supported on this device.");
      return;
    }

    if (speaking) {
      stop();
      return;
    }

    const clean = text?.trim();
    if (!clean) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = pickVoice(window.speechSynthesis.getVoices(), language);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);

    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeaking(false);
    };

    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeaking(false);
      toast.error("Unable to play the answer.");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleSpeak}
      aria-label={speaking ? "Stop speaking" : "Read answer aloud"}
      aria-pressed={speaking}
      title={speaking ? "Stop voice" : "Listen to answer"}
      className="h-9 w-9 sm:h-10 sm:w-10"
    >
      {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
}