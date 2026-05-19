import { EVENTS } from "@rahoot/common/constants"
import type { ChatMessage } from "@rahoot/common/types/game"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@rahoot/web/features/game/stores/player"
import clsx from "clsx"
import { MessageCircle, Send, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const TeamChat = () => {
  const { socket } = useSocket()
  const { gameId } = usePlayerStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEvent(EVENTS.CHAT.MESSAGE, (msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-99), msg])
    if (!open) setUnread((n) => n + 1)
  })

  useEffect(() => {
    if (open) {
      setUnread(0)
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [open, messages])

  const handleSend = () => {
    const clean = text.trim()
    if (!clean || !gameId) return
    socket?.emit(EVENTS.CHAT.SEND, { gameId, text: clean })
    setText("")
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed right-3 bottom-20 z-50">
      {/* Chat oynasi */}
      {open && (
        <div className="mb-2 flex h-64 w-72 flex-col overflow-hidden rounded-xl bg-white/95 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between bg-violet-600 px-3 py-2">
            <span className="text-sm font-bold text-white">Jamoa chat</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          {/* Xabarlar */}
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {messages.length === 0 && (
              <p className="mt-6 text-center text-xs text-gray-400">
                Jamoangiz bilan suhbatlashing 💬
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] font-semibold text-violet-600">
                  {msg.senderName}
                </span>
                <span className="rounded-lg rounded-tl-none bg-gray-100 px-2.5 py-1 text-xs text-gray-800">
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-1 border-t border-gray-100 p-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Xabar yozing..."
              maxLength={200}
              className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-violet-400"
            />
            <button
              onClick={handleSend}
              className="flex items-center justify-center rounded-lg bg-violet-600 p-1.5 text-white hover:bg-violet-700"
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Chat tugmasi */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
          open ? "bg-violet-700" : "bg-violet-600 hover:bg-violet-700",
        )}
      >
        <MessageCircle className="size-5 text-white" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  )
}

export default TeamChat
