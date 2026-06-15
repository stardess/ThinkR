"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { messagesApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Match, Message } from "@/lib/types";
import { matchesApi } from "@/lib/api";

export default function MatchChatPage({ params }: { params: { id: string } }) {
  const currentUser = getUser();
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load match details and messages
    matchesApi.listMatches().then(({ data }) => {
      const found = (data as Match[]).find((m) => m.id === params.id);
      setMatch(found || null);
    });
    messagesApi.getMessages(params.id).then(({ data }) => setMessages(data));
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      const { data } = await messagesApi.sendMessage(params.id, input.trim());
      setMessages((prev) => [...prev, data]);
      setInput("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Chat header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-bold text-brand-900 text-lg">
            {match?.project?.title || "Match"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {match?.project?.researcher?.lab_name ||
              match?.project?.researcher?.department ||
              "Research Lab"}
            {match?.project?.researcher?.user?.name &&
              ` · ${match.project.researcher.user.name}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-12">
              🎉 It&apos;s a match! Send the first message.
            </div>
          )}

          {messages.map((msg) => {
            const isOwn = msg.sender_id === currentUser?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn && (
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center uppercase">
                    {msg.sender?.name?.[0] ?? "?"}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isOwn
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-white shadow-sm text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                  <div
                    className={`text-xs mt-1 ${isOwn ? "text-brand-200" : "text-slate-400"}`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="bg-white border-t border-slate-100 px-4 py-4">
        <form
          onSubmit={sendMessage}
          className="mx-auto max-w-3xl flex gap-3 items-end"
        >
          <textarea
            className="input flex-1 resize-none min-h-[44px] max-h-[140px]"
            placeholder="Type a message…"
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e as unknown as React.FormEvent);
              }
            }}
          />
          <button
            type="submit"
            className="btn-primary py-3 px-5 flex-shrink-0"
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
