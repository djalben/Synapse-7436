import { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, ArrowUp, Sparkles, Zap, Lightbulb, Code } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  return (
    <div className="relative">
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
          ${
            isFocused
              ? "border-[#444] shadow-lg shadow-indigo-500/5"
              : "border-[#333]"
          }
        `}
      >
        <div className="flex items-end gap-2 p-3">
          {/* Attachment Button */}
          <button
            className="
              p-2 rounded-lg
              text-[#666] hover:text-white/80
              hover:bg-white/[0.04]
              transition-all duration-200
              flex-shrink-0
            "
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Input Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Message Synapse..."
              disabled={disabled}
              rows={1}
              className="
                w-full bg-transparent
                text-white placeholder-[#555]
                text-[15px] leading-relaxed
                resize-none outline-none
                py-2 px-1
                max-h-[200px]
              "
            />
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Voice Input */}
            <button
              className="
                p-2 rounded-lg
                text-[#666] hover:text-white/80
                hover:bg-white/[0.04]
                transition-all duration-200
              "
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || disabled}
              className={`
                p-2.5 rounded-xl
                transition-all duration-300
                ${
                  message.trim()
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
  );
};

// Suggestion chips for empty state
const suggestions = [
  { icon: Code, label: "Write code", prompt: "Help me write a React component" },
  { icon: Lightbulb, label: "Brainstorm", prompt: "Help me brainstorm ideas for" },
  { icon: Zap, label: "Explain", prompt: "Explain how" },
  { icon: Sparkles, label: "Create", prompt: "Create a" },
];

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

export const SuggestionChips = ({ onSelect }: SuggestionChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {suggestions.map((suggestion) => {
        const Icon = suggestion.icon;
        return (
          <button
            key={suggestion.label}
            onClick={() => onSelect(suggestion.prompt)}
            className="
              flex items-center gap-2 px-4 py-2.5
              bg-white/[0.03] hover:bg-white/[0.06]
              border border-[#333] hover:border-[#444]
              rounded-xl
              text-[#888] hover:text-white/90
              text-sm font-medium
              transition-all duration-200
              group
            "
          >
            <Icon className="w-4 h-4 text-[#666] group-hover:text-indigo-400 transition-colors" />
            {suggestion.label}
          </button>
        );
      })}
    </div>
  );
};
