import { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ModelSelector, models, getModelCreditCost } from "./model-selector"
import { Paperclip, Mic, ArrowUp, Sparkles, Zap, Lightbulb, Code, Bot, User, Copy, Check, Lock, Coins } from "lucide-react"
import { useUsage } from "./usage-context"
import { useTour } from "./onboarding-tour"
import { toast } from "sonner"

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

const MistralLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#ff6b35" aria-hidden>
    <path d="M12 2L4 22h4l4-8 4 8h4L12 2z" />
  </svg>
)

const XiaomiLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#ff6900" aria-hidden>
    <path d="M12 2l2.5 7.5H22L15 13l2.5 7.5L12 16l-5.5 4.5L9 13 2 9.5h7.5L12 2z" />
  </svg>
)

// Model logos mapped by ID (must match model-selector models)
const MODEL_LOGOS: Record<string, React.ReactNode> = {
  "deepseek-r1": <DeepSeekLogo />,
  "gpt-4o-mini": <OpenAILogo />,
  "mimo-v2-flash": <XiaomiLogo />,
  "devstral-2512": <MistralLogo />,
  "gpt-4o": <OpenAILogo />,
  "claude-3.5-sonnet": <AnthropicLogo />,
  "gpt-5-o1": <OpenAILogo />,
}

// Model names mapped by ID
const MODEL_NAMES: Record<string, string> = {
  "deepseek-r1": "DeepSeek R1",
  "gpt-4o-mini": "GPT-4o mini",
  "mimo-v2-flash": "Xiaomi MiMo-V2-Flash",
  "devstral-2512": "Devstral 2 2512",
  "gpt-4o": "GPT-4o",
  "claude-3.5-sonnet": "Claude 3.5 Sonnet",
  "gpt-5-o1": "GPT-5 (o1)",
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
              <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#333] text-xs text-[#888] font-mono">
                {language}
              </div>
            )}
            <pre className="p-4 bg-[#0d0d0d] overflow-x-auto text-sm">
              <code className="text-[#e5e5e5] font-mono whitespace-pre">{code}</code>
            </pre>
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

// Credit Balance Indicator
const CreditBalanceIndicator = ({ balance, cost }: { balance: number; cost: number }) => {
  const isLow = balance < 5
  const isVeryLow = balance < cost
  
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-lg
      ${isVeryLow 
        ? "bg-red-500/10 border border-red-500/30" 
        : isLow 
          ? "bg-amber-500/10 border border-amber-500/30" 
          : "bg-white/[0.04] border border-[#333]"
      }
    `}>
      <Coins className={`w-4 h-4 ${isVeryLow ? "text-red-400" : isLow ? "text-amber-400" : "text-emerald-400"}`} />
      <span className={`text-sm font-medium ${isVeryLow ? "text-red-400" : isLow ? "text-amber-400" : "text-white/80"}`}>
        {balance.toFixed(1)} кредитов
      </span>
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
              p-2.5 md:p-2 rounded-lg
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

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              data-tour="send-button"
              className={`
                p-3 md:p-2.5 rounded-xl
                transition-all duration-300
                active:scale-95
                ${
                  value.trim() && !disabled
                    ? "bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10"
                    : "bg-white/10 text-[#555] cursor-not-allowed"
                }
              `}
            >
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main chat interface
export const ChatInterface = () => {
  const [selectedModel, setSelectedModel] = useState("deepseek-r1")
  const [isLoaded, setIsLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const userAtBottomRef = useRef(true)
  const [inputValue, setInputValue] = useState("")
  const selectedModelRef = useRef(selectedModel)
  const { startTour } = useTour()
  const { 
    checkMessageLimit, 
    incrementMessages, 
    canSendMessage, 
    messageCount, 
    limits, 
    setShowPaywall, 
    setPaywallReason,
    creditBalance,
    deductCredits,
    checkCredits,
    userPlan
  } = useUsage()
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedModelRef.current = selectedModel
  }, [selectedModel])

  // Get current model credit cost
  const currentCreditCost = getModelCreditCost(selectedModel)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ 
      api: "/api/chat",
      body: () => ({ model: selectedModelRef.current })
    }),
    onFinish: () => {
      // Deduct credits after successful response
      const cost = getModelCreditCost(selectedModelRef.current)
      deductCredits(cost)
      incrementMessages()
      
      // Show credit deduction toast
      toast.success(`-${cost} кредитов`, {
        description: `Осталось ${creditBalance - cost} кредитов`,
        duration: 2000,
      })
    }
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Умная авто-прокрутка: не дергаем экран при стриминге, не возвращаем насильно, если пользователь ушёл вверх
  useEffect(() => {
    const el = messagesContainerRef.current
    const endEl = messagesEndRef.current
    if (!el || !endEl) return

    const isStreaming = status === "streaming"
    const wasAtBottom = userAtBottomRef.current

    if (isStreaming) {
      // Во время печати: только если пользователь у низа — держим скролл внизу без анимации (без тряски)
      if (wasAtBottom) {
        el.scrollTop = el.scrollHeight
      }
    } else {
      // Не стриминг: плавно к последнему сообщению (новая реплика или конец ответа)
      endEl.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, status])

  // Отслеживание: пользователь прокрутил вверх — не возвращать его вниз до конца печати
  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const threshold = 120
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
    userAtBottomRef.current = atBottom
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return
    
    // Check message limit first
    if (!checkMessageLimit()) return
    
    // Check if user has enough credits
    const cost = getModelCreditCost(selectedModel)
    if (!checkCredits(cost)) return
    
    userAtBottomRef.current = true
    sendMessage({ text: inputValue })
    setInputValue("")
  }

  const handleSuggestionSelect = (prompt: string) => {
    setInputValue(prompt)
  }

  const hasMessages = messages.length > 0
  const atLimit = !canSendMessage
  const notEnoughCredits = creditBalance < currentCreditCost

  return (
    <div
      className="flex flex-col w-full h-full min-h-0 overflow-hidden border-none"
    >
      {/* Парящая кнопка выбора модели: на мобильных — один уровень с кнопкой меню, с safe-area */}
      <div
        className={`
          fixed z-[10000]
          top-[max(1.5rem,env(safe-area-inset-top,0px))]
          left-20
          md:top-4 md:left-[260px]
          transition-opacity duration-700 ease-out
          ${isLoaded ? "opacity-100" : "opacity-0"}
        `}
      >
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          userPlan={userPlan}
        />
      </div>

      {/* Область сообщений: единственная область с вертикальным скроллом */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 md:px-8 pt-[max(7rem,calc(env(safe-area-inset-top,0px)+6.5rem))] md:pt-24 py-4 md:py-6"
      >
        {!hasMessages ? (
          // Empty state
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

              <div
                className={`
                  transition-all duration-700 ease-out delay-200
                  ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
                `}
              >
                <SuggestionChips onSelect={handleSuggestionSelect} />
              </div>
            </div>
          </div>
        ) : (
          // Messages list
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
            
            {/* Typing indicator when waiting for response */}
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

            {/* Error display */}
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

      {/* Поле ввода: ближе к нижнему краю на мобильных, с safe-area */}
      <div
        className={`
          flex-shrink-0 w-full border-none
          px-4 md:px-8
          py-3 md:py-6
          pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:pb-6
          bg-transparent backdrop-blur-lg
          transition-opacity duration-700 delay-300
          ${isLoaded ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="max-w-4xl mx-auto">
          {/* Limit warning banner */}
          {(atLimit || notEnoughCredits) && (
            <button
              onClick={() => {
                setPaywallReason(notEnoughCredits ? "credits" : "messages")
                setShowPaywall(true)
              }}
              className="
                w-full mb-3 md:mb-4 p-3 md:p-4 rounded-xl
                bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10
                border border-red-500/30
                flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3
                group transition-all duration-300
                hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10
              "
            >
              <Lock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm md:text-base text-center">
                {notEnoughCredits 
                  ? `Недостаточно кредитов. Для этой модели нужно ${currentCreditCost} кредитов.`
                  : "Вы достигли лимита бесплатных сообщений. Улучшите тариф чтобы продолжить."
                }
              </span>
              <span className="text-amber-400/60 text-sm group-hover:text-amber-400 transition-colors">
                Посмотреть тарифы →
              </span>
            </button>
          )}
          
          <ChatInputComponent
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            disabled={isLoading || atLimit || notEnoughCredits}
          />
          <p className="text-center text-[#444] text-xs mt-2 md:mt-4">
            {atLimit 
              ? `${messageCount}/${limits.maxMessages} бесплатных сообщений использовано`
              : notEnoughCredits
                ? `Нужно ${currentCreditCost} кредитов • Баланс: ${creditBalance.toFixed(1)}`
                : "Synapse может ошибаться. Проверяйте важную информацию."
            }
          </p>
        </div>
      </div>
    </div>
  )
}
