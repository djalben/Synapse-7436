import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react"
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"

// Tour step interface
interface TourStep {
  target: string // CSS selector for the target element
  title: string
  content: string
  placement?: "top" | "bottom" | "left" | "right"
}

// Tour configuration interface
interface TourConfig {
  id: string
  steps: TourStep[]
}

// Tour context
interface TourContextValue {
  startTour: (tourId: string) => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  currentTour: string | null
  currentStep: number
  isActive: boolean
  registerTour: (config: TourConfig) => void
}

const TourContext = createContext<TourContextValue | null>(null)

export const useTour = () => {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error("useTour must be used within a TourProvider")
  }
  return context
}

// Tour definitions
const TOUR_CONFIGS: Record<string, TourConfig> = {
  chat: {
    id: "chat",
    steps: [
      {
        target: "[data-tour='model-selector']",
        title: "🤖 Выбор модели",
        content: "Выберите AI модель. DeepSeek R1 - быстрый и бесплатный!",
        placement: "bottom",
      },
      {
        target: "[data-tour='chat-input']",
        title: "💬 Введите сообщение",
        content: "Напишите ваш вопрос или задачу для AI",
        placement: "top",
      },
      {
        target: "[data-tour='send-button']",
        title: "🚀 Отправка",
        content: "Нажмите чтобы отправить сообщение!",
        placement: "top",
      },
    ],
  },
  image: {
    id: "image",
    steps: [
      {
        target: "[data-tour='image-prompt']",
        title: "🎨 Опишите изображение",
        content: "Опишите изображение, которое хотите создать. Будьте креативны!",
        placement: "right",
      },
      {
        target: "[data-tour='style-selector']",
        title: "🎭 Выберите стиль",
        content: "Выберите стиль: фотореализм, аниме, 3D или киберпанк",
        placement: "right",
      },
      {
        target: "[data-tour='aspect-ratio']",
        title: "📏 Формат изображения",
        content: "Выберите формат: квадрат, горизонтальный или вертикальный",
        placement: "right",
      },
      {
        target: "[data-tour='generate-button']",
        title: "✨ Создание",
        content: "Нажмите 'Создать' и ждите магию!",
        placement: "top",
      },
      {
        target: "[data-tour='gallery']",
        title: "🖼️ Галерея",
        content: "Ваши работы появятся здесь",
        placement: "left",
      },
    ],
  },
}

const STORAGE_PREFIX = "synapse_tour_completed_"

// Provider component
interface TourProviderProps {
  children: ReactNode
}

export const TourProvider = ({ children }: TourProviderProps) => {
  const [tours, setTours] = useState<Record<string, TourConfig>>(TOUR_CONFIGS)
  const [currentTour, setCurrentTour] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const isActive = currentTour !== null

  // Check if tour was completed
  const isTourCompleted = useCallback((tourId: string) => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + tourId) === "true"
    } catch {
      return false
    }
  }, [])

  // Mark tour as completed
  const markTourCompleted = useCallback((tourId: string) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + tourId, "true")
    } catch (e) {
      console.warn("Could not save tour completion status")
    }
  }, [])

  // Reset tour completion
  const resetTourCompletion = useCallback((tourId: string) => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + tourId)
    } catch (e) {
      console.warn("Could not reset tour completion status")
    }
  }, [])

  // Start a tour
  const startTour = useCallback((tourId: string) => {
    if (tours[tourId]) {
      resetTourCompletion(tourId) // Allow re-running the tour
      setCurrentTour(tourId)
      setCurrentStep(0)
    }
  }, [tours, resetTourCompletion])

  // End tour
  const endTour = useCallback(() => {
    if (currentTour) {
      markTourCompleted(currentTour)
    }
    setCurrentTour(null)
    setCurrentStep(0)
    setTargetRect(null)
  }, [currentTour, markTourCompleted])

  // Skip tour
  const skipTour = useCallback(() => {
    if (currentTour) {
      markTourCompleted(currentTour)
    }
    setCurrentTour(null)
    setCurrentStep(0)
    setTargetRect(null)
  }, [currentTour, markTourCompleted])

  // Next step
  const nextStep = useCallback(() => {
    if (!currentTour) return
    const tour = tours[currentTour]
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour()
    }
  }, [currentTour, currentStep, tours, endTour])

  // Previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Register a custom tour
  const registerTour = useCallback((config: TourConfig) => {
    setTours(prev => ({ ...prev, [config.id]: config }))
  }, [])

  // Auto-start tour for new users
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Check if chat tour should auto-start
      if (!isTourCompleted("chat")) {
        // Only start if we're on the chat view (check if element exists)
        const chatInput = document.querySelector("[data-tour='chat-input']")
        if (chatInput) {
          startTour("chat")
        }
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [isTourCompleted, startTour])

  // Update target rect when step changes
  useEffect(() => {
    if (!currentTour) {
      setTargetRect(null)
      return
    }

    const tour = tours[currentTour]
    const step = tour.steps[currentStep]
    
    // Find target element
    const updateTargetRect = () => {
      const target = document.querySelector(step.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)
      } else {
        setTargetRect(null)
      }
    }

    updateTargetRect()
    
    // Update on scroll/resize
    window.addEventListener("scroll", updateTargetRect, true)
    window.addEventListener("resize", updateTargetRect)
    
    return () => {
      window.removeEventListener("scroll", updateTargetRect, true)
      window.removeEventListener("resize", updateTargetRect)
    }
  }, [currentTour, currentStep, tours])

  return (
    <TourContext.Provider
      value={{
        startTour,
        endTour,
        nextStep,
        prevStep,
        skipTour,
        currentTour,
        currentStep,
        isActive,
        registerTour,
      }}
    >
      {children}
      {isActive && currentTour && (
        <TourOverlay
          tour={tours[currentTour]}
          step={currentStep}
          targetRect={targetRect}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
        />
      )}
    </TourContext.Provider>
  )
}

// Tour overlay component
interface TourOverlayProps {
  tour: TourConfig
  step: number
  targetRect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

const TourOverlay = ({ tour, step, targetRect, onNext, onPrev, onSkip }: TourOverlayProps) => {
  const currentStepData = tour.steps[step]
  const isFirstStep = step === 0
  const isLastStep = step === tour.steps.length - 1
  const padding = 8

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }

    const placement = currentStepData.placement || "bottom"
    const tooltipWidth = 320
    const tooltipHeight = 200
    const offset = 16

    switch (placement) {
      case "top":
        return {
          top: `${targetRect.top - tooltipHeight - offset}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipWidth / 2}px`,
        }
      case "bottom":
        return {
          top: `${targetRect.bottom + offset}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipWidth / 2}px`,
        }
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2 - tooltipHeight / 2}px`,
          left: `${targetRect.left - tooltipWidth - offset}px`,
        }
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2 - tooltipHeight / 2}px`,
          left: `${targetRect.right + offset}px`,
        }
      default:
        return {
          top: `${targetRect.bottom + offset}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipWidth / 2}px`,
        }
    }
  }

  const tooltipPosition = getTooltipPosition()

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.3))" }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.85)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border/glow effect */}
      {targetRect && (
        <div
          className="absolute pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderRadius: "12px",
            border: "2px solid rgba(99, 102, 241, 0.6)",
            boxShadow: "0 0 30px rgba(99, 102, 241, 0.4), inset 0 0 20px rgba(99, 102, 241, 0.1)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute w-80 pointer-events-auto animate-in fade-in zoom-in-95 duration-300"
        style={tooltipPosition}
      >
        <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-[#222]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-[#666] font-medium uppercase tracking-wider">
                  Шаг {step + 1} из {tour.steps.length}
                </span>
              </div>
              <button
                onClick={onSkip}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-[#666] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-[#999] leading-relaxed">
              {currentStepData.content}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-2">
            <div className="h-1 bg-[#222] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / tour.steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3">
            <button
              onClick={onSkip}
              className="text-sm text-[#666] hover:text-white transition-colors"
            >
              Пропустить
            </button>
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>
              )}
              <button
                onClick={onNext}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
              >
                {isLastStep ? "Готово" : "Далее"}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to check if tour should run
export const useShouldShowTour = (tourId: string) => {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_PREFIX + tourId) === "true"
      setShouldShow(!completed)
    } catch {
      setShouldShow(false)
    }
  }, [tourId])

  return shouldShow
}
