import { useState, useEffect, useRef, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ModelSelector } from "./model-selector"
import { Paperclip, Mic, ArrowUp, Sparkles, Zap, Lightbulb, Code, Bot, User, Copy, Check, Plus, MessageSquare, Trash2, Pencil, PanelLeftOpen, PanelLeftClose } from "lucide-react"
import { useUsage } from "./usage-context"
import { toast } from "sonner"
import { addToHistory } from "./placeholder-pages"
import { Highlight, themes } from "prism-react-renderer"

// Provider logos — те же цветные иконки, что и в model-selector (без currentColor)
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#10a37f" aria-hidden>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
)

const AnthropicLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#d97706" aria-hidden>
    <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.37-3.553h7.005l1.369 3.553h3.744L10.536 3.541H6.696zm.847 10.4 2.378-6.161 2.377 6.161H7.543z" />
  </svg>
)

const DeepSeekLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#3b82f6" aria-hidden>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </svg>
)

// Model logos mapped by ID (Golden Five only)
const MODEL_LOGOS: Record<string, React.ReactNode> = {
  "deepseek-r1": <DeepSeekLogo />,
  "gpt-4o-mini": <OpenAILogo />,
  "gpt-4o": <OpenAILogo />,
  "claude-3.5-sonnet": <AnthropicLogo />,
  "gpt-5-o1": <OpenAILogo />,
}

// Model names mapped by ID
const MODEL_NAMES: Record<string, string> = {
  "deepseek-r1": "DeepSeek R1",
  "gpt-4o-mini": "GPT-4o mini",
  "gpt-4o": "GPT-4o",
  "claude-3.5-sonnet": "Claude 3.5 Sonnet",
  "gpt-5-o1": "GPT-5 Pro",
}

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-3 py-2">
    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
  </div>
)

// Message component with markdown support
interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  model?: string
  isStreaming?: boolean
}

const MessageBubble = ({ role, content, model, isStreaming }: MessageBubbleProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple markdown-like rendering for code blocks
  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3)
        const firstLineEnd = codeContent.indexOf("\n")
        const language = firstLineEnd > 0 ? codeContent.slice(0, firstLineEnd).trim() : ""
        const code = firstLineEnd > 0 ? codeContent.slice(firstLineEnd + 1) : codeContent

        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden border border-[#333]">
            {language && (
              <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#333] text-xs text-[#888] font-mono flex items-center justify-between">
                <span>{language}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(code); toast.success("Скопировано", { duration: 1500 }) }}
                  className="text-[#666] hover:text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <Highlight theme={themes.vsDark} code={code.trimEnd()} language={language || "text"}>
              {({ style, tokens, getLineProps, getTokenProps }) => (
                <pre className="p-4 overflow-x-auto text-sm !bg-[#0d0d0d]" style={{ ...style, backgroundColor: "transparent" }}>
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
        )
      }

      // Handle inline code
      const inlineCodeParts = part.split(/(`[^`]+`)/g)
      return inlineCodeParts.map((inlinePart, inlineIndex) => {
        if (inlinePart.startsWith("`") && inlinePart.endsWith("`")) {
          return (
            <code 
              key={`${index}-${inlineIndex}`} 
              className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-indigo-300 font-mono text-sm"
            >
              {inlinePart.slice(1, -1)}
            </code>
          )
        }

        // Handle bold text
        const boldParts = inlinePart.split(/(\*\*[^*]+\*\*)/g)
        return boldParts.map((boldPart, boldIndex) => {
          if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
            return (
              <strong key={`${index}-${inlineIndex}-${boldIndex}`} className="font-semibold text-white">
                {boldPart.slice(2, -2)}
              </strong>
            )
          }
          return <span key={`${index}-${inlineIndex}-${boldIndex}`}>{boldPart}</span>
        })
      })
    })
  }

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-3 max-w-[80%]">
          <div 
            className="
              px-4 py-3 rounded-2xl rounded-br-md
              bg-gradient-to-br from-indigo-600 to-indigo-700
              text-white text-[15px] leading-relaxed
              shadow-lg shadow-indigo-500/10
            "
          >
            {content}
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-[#888]">
          {model && MODEL_LOGOS[model] ? MODEL_LOGOS[model] : <Bot className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          {model && (
            <div className="text-xs text-[#666] mb-1.5 font-medium">
              {MODEL_NAMES[model] || model}
            </div>
          )}
          <div 
            className="
              px-4 py-3 rounded-2xl rounded-bl-md
              bg-[#0d0d0d]/80 backdrop-blur-sm
              border border-[#222]
              text-[#e5e5e5] text-[15px] leading-relaxed
              relative group
            "
          >
            <div className="whitespace-pre-wrap">{renderContent(content)}</div>
            {isStreaming && (
              <span className="inline-block w-2 h-5 bg-indigo-400 ml-1 animate-pulse rounded-sm" />
            )}
            
            {/* Copy button */}
            {!isStreaming && content && (
              <button
                onClick={handleCopy}
                className="
                  absolute top-2 right-2
                  p-1.5 rounded-md
                  bg-[#1a1a1a] border border-[#333]
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                  hover:bg-[#222]
                "
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#888]" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Suggestion chips
const suggestions = [
  { icon: Code, label: "Написать код", prompt: "Помоги написать компонент React который" },
  { icon: Lightbulb, label: "Идеи", prompt: "Помоги придумать идеи для" },
  { icon: Zap, label: "Объяснить", prompt: "Объясни как" },
  { icon: Sparkles, label: "Создать", prompt: "Создай" },
]

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void
}

const SuggestionChips = ({ onSelect }: SuggestionChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center px-2">
      {suggestions.map((suggestion) => {
        const Icon = suggestion.icon
        return (
          <button
            key={suggestion.label}
            onClick={() => onSelect(suggestion.prompt)}
            className="
              flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5
              bg-white/[0.03] hover:bg-white/[0.06]
              border border-[#333] hover:border-[#444]
              rounded-xl
              text-[#888] hover:text-white/90
              text-sm font-medium
              transition-all duration-200
              group
              active:scale-95
            "
          >
            <Icon className="w-4 h-4 text-[#666] group-hover:text-indigo-400 transition-colors" />
            {suggestion.label}
          </button>
        )
      })}
    </div>
  )
}

// Chat input component
interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

const ChatInputComponent = ({ value, onChange, onSubmit, disabled }: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  return (
    <div className="relative" data-tour="chat-input">
      {/* Glow effect on focus */}
      <div
        className={`
          absolute inset-0 rounded-2xl
          bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-indigo-500/20
          blur-xl transition-opacity duration-500
          ${isFocused ? "opacity-100" : "opacity-0"}
        `}
      />

      <div
        className={`
          relative
          bg-[#0a0a0a]/80 backdrop-blur-xl
          border rounded-2xl
          transition-all duration-300
          ${isFocused ? "border-[#444] shadow-lg shadow-indigo-500/5" : "border-[#333]"}
        `}
      >
        <div className="flex items-end gap-1.5 md:gap-2 p-2.5 md:p-3">
          {/* Attachment Button */}
          <button
            className="
              min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0
              p-2.5 md:p-2 rounded-lg
              flex items-center justify-center
              text-[#666] hover:text-white/80
              hover:bg-white/[0.04]
              transition-all duration-200
              flex-shrink-0
              active:scale-95
            "
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Input Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Напишите сообщение..."
              disabled={disabled}
              rows={1}
              className="
                w-full bg-transparent
                text-white placeholder-[#555]
                text-base leading-relaxed
                resize-none outline-none
                py-2 px-1
                max-h-[200px]
              "
              style={{ fontSize: '16px' }} /* Prevent iOS zoom */
            />
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            {/* Voice Input - hidden on small mobile */}
            <button
              className="
                hidden sm:flex
                p-2.5 md:p-2 rounded-lg
                text-[#666] hover:text-white/80
                hover:bg-white/[0.04]
                transition-all duration-200
                active:scale-95
              "
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button: синий градиент как в Изображениях/Видео */}
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              data-tour="send-button"
              className={`
                min-w-[44px] min-h-[44px] md:min-h-[44px] md:px-4
                py-3 md:py-2.5 rounded-xl font-medium
                flex items-center justify-center gap-1.5
                transition-all duration-300 active:scale-[0.98]
                ${
                  value.trim() && !disabled
                    ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
                    : "bg-[#222] text-[#555] cursor-not-allowed"
                }
              `}
            >
              <ArrowUp className="w-5 h-5 md:w-4 md:h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// === Chat History System ===
interface StoredMessage {
  id: string
  role: string
  content: string
}

interface ChatConversation {
  id: string
  title: string
  model: string
  messages: StoredMessage[]
  createdAt: number
  updatedAt: number
}

const CONVERSATIONS_KEY = "synapse_conversations"

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// --- localStorage helpers (fallback) ---
function loadConversationsLocal(): ChatConversation[] {
  try {
    if (typeof window === "undefined") return []
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function persistConversationsLocal(convs: ChatConversation[]) {
  try {
    if (typeof window === "undefined") return
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs))
  } catch {}
}

// --- API helpers (D1 database, returns null on failure → use localStorage) ---
async function apiListConversations(): Promise<ChatConversation[] | null> {
  try {
    const res = await fetch("/api/conversations")
    if (!res.ok) return null
    const rows: any[] = await res.json()
    // API returns conversations without messages; load messages per-conversation lazily
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      model: r.model,
      messages: [], // loaded on demand
      createdAt: typeof r.createdAt === "string" ? new Date(r.createdAt).getTime() : r.createdAt,
      updatedAt: typeof r.updatedAt === "string" ? new Date(r.updatedAt).getTime() : r.updatedAt,
    }))
  } catch { return null }
}

async function apiLoadMessages(convId: string): Promise<StoredMessage[] | null> {
  try {
    const res = await fetch(`/api/conversations/${convId}/messages`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function apiCreateConversation(conv: { id: string; title: string; model: string }): Promise<boolean> {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conv),
    })
    return res.ok
  } catch { return false }
}

async function apiSaveMessages(convId: string, msgs: StoredMessage[], title?: string, model?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, title, model }),
    })
    return res.ok
  } catch { return false }
}

async function apiDeleteConversation(convId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations/${convId}`, { method: "DELETE" })
    return res.ok
  } catch { return false }
}

async function apiRenameConversation(convId: string, title: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations/${convId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    return res.ok
  } catch { return false }
}

function extractTitle(text: string): string {
  const clean = text.replace(/\n/g, " ").trim()
  return clean.length > 50 ? clean.slice(0, 50) + "…" : clean || "Новый чат"
}

// Chat History Sidebar
interface ChatHistorySidebarProps {
  conversations: ChatConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

const ChatHistorySidebar = ({ conversations, activeId, onSelect, onNew, onDelete, onRename }: ChatHistorySidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus()
  }, [editingId])

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)

  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  const groups: { label: string; items: ChatConversation[] }[] = []
  const todayItems = sorted.filter(c => new Date(c.updatedAt).toDateString() === today)
  const yesterdayItems = sorted.filter(c => new Date(c.updatedAt).toDateString() === yesterday)
  const olderItems = sorted.filter(c => {
    const d = new Date(c.updatedAt).toDateString()
    return d !== today && d !== yesterday
  })
  if (todayItems.length) groups.push({ label: "Сегодня", items: todayItems })
  if (yesterdayItems.length) groups.push({ label: "Вчера", items: yesterdayItems })
  if (olderItems.length) groups.push({ label: "Ранее", items: olderItems })

  return (
    <div className="w-72 h-full flex flex-col bg-black/60 backdrop-blur-xl border-r border-white/10 overflow-hidden">
      {/* New chat button */}
      <div className="p-3 border-b border-white/10">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0070f3] hover:bg-[#0060df] text-white text-sm font-medium transition-all shadow-lg shadow-[0_0_16px_rgba(0,112,243,0.3)]"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-2 space-y-3">
        {groups.length === 0 && (
          <p className="text-center text-[#555] text-xs mt-8">Нет сохранённых чатов</p>
        )}
        {groups.map(group => (
          <div key={group.label}>
            <p className="px-4 text-[10px] uppercase tracking-wider text-[#555] font-medium mb-1">{group.label}</p>
            {group.items.map(conv => {
              const isActive = conv.id === activeId
              const isEditing = editingId === conv.id
              return (
                <div
                  key={conv.id}
                  onClick={() => !isEditing && onSelect(conv.id)}
                  className={`
                    group mx-2 px-3 py-2.5 rounded-lg cursor-pointer
                    flex items-center gap-2 transition-all duration-150
                    ${isActive ? "bg-white/10 border border-white/10" : "hover:bg-white/[0.05] border border-transparent"}
                  `}
                >
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-400" : "text-[#555]"}`} />
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => { onRename(conv.id, editTitle); setEditingId(null) }}
                      onKeyDown={e => {
                        if (e.key === "Enter") { onRename(conv.id, editTitle); setEditingId(null) }
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-white/10 rounded px-2 py-0.5 text-sm text-white outline-none border border-indigo-500/50"
                    />
                  ) : (
                    <span className={`flex-1 min-w-0 text-sm truncate ${isActive ? "text-white" : "text-[#aaa]"}`}>
                      {conv.title}
                    </span>
                  )}
                  {!isEditing && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title) }}
                        className="p-1 rounded hover:bg-white/10 text-[#666] hover:text-white transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
                        className="p-1 rounded hover:bg-red-500/20 text-[#666] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Chat session — inner component that uses useChat, remounts via key on conversation switch
interface ChatSessionProps {
  conversationId: string | null
  initialMessages: StoredMessage[]
  selectedModel: string
  onModelChange: (id: string) => void
  userPlan: string
  onMessagesUpdate: (convId: string | null, msgs: StoredMessage[], firstUserText?: string) => void
}

const ChatSession = ({ conversationId, initialMessages, selectedModel, onModelChange, userPlan, onMessagesUpdate }: ChatSessionProps) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const userAtBottomRef = useRef(true)
  const [inputValue, setInputValue] = useState("")
  const selectedModelRef = useRef(selectedModel)
  const convIdRef = useRef(conversationId)
  const {
    incrementMessageDaily,
    incrementMessages,
  } = useUsage()

  useEffect(() => { selectedModelRef.current = selectedModel }, [selectedModel])
  useEffect(() => { convIdRef.current = conversationId }, [conversationId])

  const reconstructedInitial = initialMessages.length > 0
    ? initialMessages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      }))
    : undefined

  const { messages, sendMessage, status, error } = useChat({
    initialMessages: reconstructedInitial,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ model: selectedModelRef.current }),
      headers: () => ({ "X-User-Plan": userPlan }),
    }),
    onFinish: (message) => {
      incrementMessageDaily()
      incrementMessages()

      const allMsgs = [...messages, message]
      const stored: StoredMessage[] = allMsgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map(p => p.text)
          .join(""),
      }))

      const firstUser = allMsgs.find(m => m.role === "user")
      const firstUserText = firstUser
        ? firstUser.parts.filter((p): p is { type: "text"; text: string } => p.type === "text").map(p => p.text).join("")
        : undefined

      onMessagesUpdate(convIdRef.current, stored, firstUserText)

      // Also persist to global history
      const userMessages = allMsgs.filter(m => m.role === "user")
      const lastUserMessage = userMessages[userMessages.length - 1]
      if (lastUserMessage && message.content) {
        addToHistory({
          type: "chat",
          prompt: typeof lastUserMessage.content === "string" ? lastUserMessage.content : "",
          model: selectedModelRef.current,
          result: typeof message.content === "string" ? message.content : "",
          credits: 0,
        })
      }
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const el = messagesContainerRef.current
    const endEl = messagesEndRef.current
    if (!el || !endEl) return
    if (status === "streaming") {
      if (userAtBottomRef.current) el.scrollTop = el.scrollHeight
    } else {
      endEl.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, status])

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    userAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 120
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return
    userAtBottomRef.current = true
    sendMessage({ text: inputValue })
    setInputValue("")
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col w-full h-full min-h-0 overflow-hidden border-none">
      {/* Model selector */}
      <div
        className={`
          fixed z-[10000]
          top-[calc(env(safe-area-inset-top,0px)+4rem+12px)]
          left-4
          md:top-4 md:left-[260px]
          transition-opacity duration-700 ease-out
          ${isLoaded ? "opacity-100" : "opacity-0"}
        `}
      >
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          userPlan={userPlan as any}
        />
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 md:px-8 pt-[calc(env(safe-area-inset-top)+4rem+12px+3rem+8px)] md:pt-24 py-4 md:py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-6"
      >
        {!hasMessages ? (
          <div
            className={`
              h-full flex flex-col items-center justify-center
              transition-all duration-700 ease-out delay-100
              ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            <div className="max-w-2xl w-full text-center px-4">
              <div className="mb-8 md:mb-12">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-mono font-semibold mb-4 tracking-tight">
                  <span className="gradient-text">Что я могу помочь</span>
                  <br />
                  <span className="text-white">создать сегодня?</span>
                </h1>
                <p className="text-[#666] text-base md:text-lg max-w-md mx-auto">
                  Начните беседу с Synapse чтобы генерировать идеи, писать код или создавать что-то новое.
                </p>
              </div>
              <div className={`transition-all duration-700 ease-out delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <SuggestionChips onSelect={(p) => setInputValue(p)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role as "user" | "assistant"}
                content={message.parts
                  .filter((part): part is { type: "text"; text: string } => part.type === "text")
                  .map((part) => part.text)
                  .join("")}
                model={message.role === "assistant" ? selectedModel : undefined}
                isStreaming={status === "streaming" && message === messages[messages.length - 1] && message.role === "assistant"}
              />
            ))}

            {status === "submitted" && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-[#888]">
                    {MODEL_LOGOS[selectedModel] || <Bot className="w-4 h-4" />}
                  </div>
                  <div className="px-4 py-2 rounded-2xl rounded-bl-md bg-[#0d0d0d]/80 border border-[#222]">
                    <TypingIndicator />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center mb-4">
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md">
                  {error.message || "Произошла ошибка. Попробуйте снова."}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className={`
          w-full border-none px-4 md:px-8
          pt-3 pb-[env(safe-area-inset-bottom)] md:py-6 md:pb-6
          bg-black/95 backdrop-blur-xl border-t border-white/10
          shadow-[0_-4px_24px_rgba(0,0,0,0.4)]
          md:bg-transparent md:border-t-0 md:shadow-none md:backdrop-blur-lg
          transition-opacity duration-700 delay-300
          fixed bottom-0 left-0 right-0 z-50
          md:static md:z-auto
          ${isLoaded ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="max-w-4xl mx-auto">
          <ChatInputComponent
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            disabled={isLoading}
          />
          <p className="text-center text-[#444] text-xs mt-1.5 md:mt-4">
            Synapse может ошибаться. Проверяйте важную информацию.
          </p>
        </div>
      </div>
    </div>
  )
}

// Main chat interface — orchestrator with conversation management + sidebar
export const ChatInterface = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>(() => loadConversationsLocal())
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState("deepseek-r1")
  const [chatKey, setChatKey] = useState(0)
  const dbAvailableRef = useRef(false)
  const { userPlan = "free" } = useUsage()

  // Get initial messages for active conversation
  const activeConv = conversations.find(c => c.id === activeConvId)
  const initialMessages = activeConv?.messages ?? []

  // On mount: try loading from API (D1); if available, use DB data
  useEffect(() => {
    let cancelled = false
    apiListConversations().then(async (apiConvs) => {
      if (cancelled || !apiConvs) return
      dbAvailableRef.current = true
      // For each conversation, load messages from DB
      const full: ChatConversation[] = await Promise.all(
        apiConvs.map(async (conv) => {
          const msgs = await apiLoadMessages(conv.id)
          return { ...conv, messages: msgs ?? [] }
        })
      )
      if (!cancelled) {
        setConversations(full)
        persistConversationsLocal(full) // sync localStorage as backup
      }
    })
    return () => { cancelled = true }
  }, [])

  // Always persist to localStorage as backup whenever conversations change
  useEffect(() => {
    persistConversationsLocal(conversations)
  }, [conversations])

  // Handle messages update from ChatSession
  const handleMessagesUpdate = useCallback((convId: string | null, msgs: StoredMessage[], firstUserText?: string) => {
    setConversations(prev => {
      if (convId) {
        // Update existing conversation → save to API in background
        apiSaveMessages(convId, msgs, undefined, selectedModel)
        return prev.map(c =>
          c.id === convId
            ? { ...c, messages: msgs, updatedAt: Date.now(), model: selectedModel }
            : c
        )
      } else {
        // Create new conversation
        const newId = genId()
        const title = firstUserText ? extractTitle(firstUserText) : "Новый чат"
        const newConv: ChatConversation = {
          id: newId,
          title,
          model: selectedModel,
          messages: msgs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        // Save to API in background (create + messages)
        apiCreateConversation({ id: newId, title, model: selectedModel }).then(() => {
          apiSaveMessages(newId, msgs, title, selectedModel)
        })
        setTimeout(() => setActiveConvId(newId), 0)
        return [newConv, ...prev]
      }
    })
  }, [selectedModel])

  const handleNewChat = useCallback(() => {
    setActiveConvId(null)
    setChatKey(k => k + 1)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    // If DB is available and messages not yet loaded, fetch them
    const conv = conversations.find(c => c.id === id)
    if (conv && conv.messages.length === 0 && dbAvailableRef.current) {
      apiLoadMessages(id).then(msgs => {
        if (msgs && msgs.length > 0) {
          setConversations(prev =>
            prev.map(c => c.id === id ? { ...c, messages: msgs } : c)
          )
        }
      })
    }
    setActiveConvId(id)
    setChatKey(k => k + 1)
    if (conv) setSelectedModel(conv.model)
  }, [conversations])

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    apiDeleteConversation(id) // fire-and-forget
    if (activeConvId === id) {
      setActiveConvId(null)
      setChatKey(k => k + 1)
    }
  }, [activeConvId])

  const handleRenameConversation = useCallback((id: string, title: string) => {
    if (!title.trim()) return
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, title: title.trim() } : c)
    )
    apiRenameConversation(id, title.trim()) // fire-and-forget
  }, [])

  return (
    <div className="flex w-full h-full min-h-0 overflow-hidden">
      {/* Sidebar toggle button — desktop only */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="
          hidden md:flex
          fixed z-[10001] top-4 right-auto
          items-center justify-center
          w-9 h-9 rounded-lg
          bg-black/40 backdrop-blur-xl border border-white/10
          text-[#888] hover:text-white hover:bg-white/[0.08]
          transition-all duration-200
        "
        style={{ left: sidebarOpen ? "calc(240px + 288px + 8px)" : "calc(240px + 8px)" }}
        title={sidebarOpen ? "Скрыть историю" : "История чатов"}
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </button>

      {/* Chat history sidebar — desktop */}
      {sidebarOpen && (
        <div className="hidden md:flex flex-shrink-0 h-full">
          <ChatHistorySidebar
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
          />
        </div>
      )}

      {/* Chat session — remounts on conversation switch */}
      <div className="flex-1 min-w-0 h-full">
        <ChatSession
          key={chatKey}
          conversationId={activeConvId}
          initialMessages={initialMessages}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          userPlan={userPlan}
          onMessagesUpdate={handleMessagesUpdate}
        />
      </div>
    </div>
  )
}
