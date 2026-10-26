"use client";

import { Mic, MicOff } from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";

type SpeechRecognitionEventLike = {
  results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type Props = {
  onTranscript: (text: string) => void;
  label: string;
  listeningLabel: string;
  unsupportedLabel: string;
  className?: string;
};

export default function VoiceCapture({
  onTranscript,
  label,
  listeningLabel,
  unsupportedLabel,
  className = "",
}: Props) {
  const locale = useLocale();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");

  function startListening() {
    if (typeof window === "undefined" || listening) return;

    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setMessage(unsupportedLabel);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = locale === "mr" ? "mr-IN" : locale === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) {
        setMessage(transcript);
        onTranscript(transcript);
      }
    };

    recognition.onerror = () => {
      setMessage(unsupportedLabel);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    setMessage("");
    setListening(true);
    recognition.start();
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={startListening}
        disabled={listening}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0F7A4A] px-4 py-3 font-bold text-white shadow-sm transition hover:bg-[#0B5D39] disabled:cursor-wait disabled:opacity-70"
      >
        {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {listening ? listeningLabel : label}
      </button>
      {message ? (
        <p className="mt-2 max-w-xl text-sm font-medium text-slate-600" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
