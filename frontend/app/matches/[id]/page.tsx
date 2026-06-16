"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { matchesApi, messagesApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Match, Message } from "@/lib/types";

export default function MatchChatPage({ params }: { params: { id: string } }) {
  const currentUser = getUser();
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    matchesApi.listMatches().then(({ data }) => {
      setMatch((data as Match[]).find((m) => m.id === params.id) || null);
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

  const lab =
    match?.project?.researcher?.lab_name ||
    match?.project?.researcher?.department ||
    "Research Lab";
  const counterpart =
    currentUser?.role === "student"
      ? match?.project?.researcher?.user?.name
      : match?.student?.user?.name;

  return (
    <AppShell
      title="Chat"
      actions={
        <button onClick={() => setShowSchedule(true)} className="btn-primary !px-4 !py-2 text-sm">
          📅 Schedule call
        </button>
      }
    >
      <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Conversation header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold uppercase text-brand-700">
            {(counterpart || match?.project?.title || "?")[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-brand-900">{match?.project?.title || "Match"}</p>
            <p className="truncate text-xs text-slate-500">
              {lab}
              {counterpart ? ` · ${counterpart}` : ""}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-canvas px-4 py-6">
          {messages.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">
              🎉 It&apos;s a match! Send the first message.
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}>
                {!isOwn && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold uppercase text-brand-700">
                    {msg.sender?.name?.[0] ?? "?"}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isOwn ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-white text-slate-800 shadow-sm"
                  }`}
                >
                  {msg.content}
                  <div className={`mt-1 text-xs ${isOwn ? "text-brand-200" : "text-slate-400"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="flex items-end gap-3 border-t border-slate-100 px-4 py-3">
          <textarea
            className="input max-h-[140px] min-h-[44px] flex-1 resize-none"
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
          <button type="submit" className="btn-primary flex-shrink-0 !px-5 !py-3" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      {/* Schedule modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowSchedule(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-lg font-bold text-brand-900">Schedule a call</h2>
            <p className="mb-6 text-sm text-slate-500">This opens a new meeting link — share it with your match.</p>
            <div className="space-y-3">
              <a href="https://zoom.us/start/videomeeting" target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center">
                Open Zoom
              </a>
              <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="btn-secondary w-full justify-center">
                Open Google Meet
              </a>
            </div>
            <button onClick={() => setShowSchedule(false)} className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
