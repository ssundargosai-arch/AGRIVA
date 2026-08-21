"use client";

import {
  Bot,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type AIResponse = {
  answer: string;
  source: string;
  context_used: string[];
};

const SUGGESTIONS = [
  "What crop should I grow?",
  "Which seed is best?",
  "Why are my leaves yellow?",
  "When should I irrigate?",
  "Should I sell now?",
  "Which buyer is best?",
];

export default function AgrivaAI() {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [question, setQuestion] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: "assistant",
        text:
          "Namaste! I am AGRIVA AI. " +
          "Ask me about crops, soil, weather, " +
          "irrigation, market prices or buyers.",
      },
    ]);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function askAI(
    customQuestion?: string
  ) {
    const value = (
      customQuestion ||
      question
    ).trim();

    if (!value || loading) {
      return;
    }

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      router.replace("/login");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: value,
      },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/agriva-ai/ask`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question: value,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        if (
          response.status === 401
        ) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "refresh_token"
          );

          router.replace("/login");
          return;
        }

        throw new Error(
          body?.detail ||
            "AGRIVA AI request failed."
        );
      }

      const result =
        body as AIResponse;

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            result.answer ||
            "AGRIVA AI did not return an answer.",
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            err instanceof Error
              ? err.message
              : "Unable to contact AGRIVA AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void askAI();
  }

  return (
    <>
      {/* FLOATING BUTTON */}

      {!open && (
        <button
          id="agriva-ai-launcher"
          type="button"
          onClick={() =>
            setOpen(true)
          }
          className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl transition hover:scale-105 hover:bg-emerald-800"
          aria-label="Open AGRIVA AI"
          title="Open AGRIVA AI"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {/* ASSISTANT PANEL */}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[620px] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* HEADER */}

          <div className="flex items-center justify-between bg-emerald-700 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-2">
                <Bot className="h-6 w-6" />
              </div>

              <div>
                <p className="font-bold">
                  AGRIVA AI
                </p>

                <p className="text-xs text-emerald-100">
                  Farmer Assistant
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Close AGRIVA AI"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SUGGESTIONS */}

          <div className="border-b border-slate-100 bg-slate-50 p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      void askAI(
                        suggestion
                      )
                    }
                    disabled={loading}
                    className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>

          {/* CHAT */}

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role ===
                    "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      message.role ===
                      "user"
                        ? "max-w-[82%] rounded-2xl rounded-br-md bg-emerald-700 px-4 py-3 text-sm leading-6 text-white"
                        : "max-w-[82%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
                    }
                  >
                    {message.text}
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  AGRIVA AI is thinking...
                </div>
              </div>
            )}

            <div
              ref={messagesEndRef}
            />
          </div>

          {/* INPUT */}

          <form
            onSubmit={submit}
            className="flex gap-2 border-t border-slate-200 bg-white p-4"
          >
            <input
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value
                )
              }
              placeholder="Ask AGRIVA AI..."
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={
                loading ||
                !question.trim()
              }
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}