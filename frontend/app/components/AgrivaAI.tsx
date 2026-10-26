"use client";

import ReactMarkdown from "react-markdown";

import {
  Bot,
  Languages,
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

import {
  useLocale,
  useTranslations,
} from "next-intl";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type AILanguage = "en" | "hi";

type AIResponse = {
  answer: string;
  source: string;
  context_used: string[];
};

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export default function AgrivaAI() {
  const t = useTranslations("ai");
  const locale = useLocale();
  const router = useRouter();

  const suggestions = [
    t("suggestionCrop"),
    t("suggestionSeed"),
    t("suggestionYellowLeaves"),
    t("suggestionIrrigation"),
    t("suggestionSell"),
    t("suggestionBuyer"),
  ];

  const [open, setOpen] =
    useState(false);

  const [question, setQuestion] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [aiLanguage, setAiLanguage] =
    useState<AILanguage>(
      locale === "hi" ? "hi" : "en"
    );

  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: "assistant",
        text: t("greeting"),
      },
    ]);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages, loading]);

  async function askAI(
    customQuestion?: string
  ) {
    const value = (
      customQuestion || question
    ).trim();

    if (!value || loading) {
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    /*
     * Exclude the initial greeting.
     * Send only recent conversation
     * history to Gemini.
     */
    const history = messages
      .slice(1)
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.text,
      }));

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
            history,

            /*
             * en = English response
             * hi = Hindi response
             */
            language: aiLanguage,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthStorage();

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

      console.log(
        "AGRIVA AI SOURCE:",
        result.source
      );

      console.log(
        "AGRIVA AI CONTEXT:",
        result.context_used
      );

      console.log(
        "AGRIVA AI LANGUAGE:",
        aiLanguage
      );
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
      {/* FLOATING AI BUTTON */}
      {!open && (
        <button
          id="agriva-ai-launcher"
          type="button"
          onClick={() =>
            setOpen(true)
          }
          className="fixed bottom-24 right-4 z-50 flex h-16 w-16 lg:bottom-6 lg:right-6 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl transition hover:scale-105 hover:bg-emerald-800"
          aria-label={t("openAI")}
          title={t("openAI")}
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {/* AGRIVA AI PANEL */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[calc(100dvh-7rem)] w-[calc(100vw-2rem)] max-w-md lg:bottom-6 lg:right-6 lg:h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
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
                  {t(
                    "farmerAssistant"
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label={t(
                "closeAI"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* LANGUAGE SELECTOR */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Languages className="h-4 w-4" />

              <span>
                Response Language
              </span>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  setAiLanguage("en")
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  aiLanguage === "en"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                English
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  setAiLanguage("hi")
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  aiLanguage === "hi"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                हिंदी
              </button>
            </div>
          </div>

          {/* SUGGESTED QUESTIONS */}
          <div className="border-b border-slate-100 bg-slate-50 p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestions.map(
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

          {/* CHAT AREA */}
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
                        ? "max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-emerald-700 px-4 py-3 text-sm leading-6 text-white"
                        : "prose prose-sm max-w-[88%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
                    }
                  >
                    {message.role ===
                    "assistant" ? (
                      <ReactMarkdown>
                        {
                          message.text
                        }
                      </ReactMarkdown>
                    ) : (
                      message.text
                    )}
                  </div>
                </div>
              )
            )}

            {/* THINKING */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  {aiLanguage ===
                  "hi"
                    ? "AGRIVA AI सोच रहा है..."
                    : t(
                        "thinking"
                      )}
                </div>
              </div>
            )}

            <div
              ref={
                messagesEndRef
              }
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
              placeholder={
                aiLanguage === "hi"
                  ? "AGRIVA AI से पूछें..."
                  : t(
                      "askPlaceholder"
                    )
              }
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
              aria-label={t(
                "sendMessage"
              )}
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