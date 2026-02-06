# Synapse: финальная полировка интерфейса и расширение Free-зоны
# Выполнить в корне репозитория: .\git-push-improvements.ps1

$commitMessage = @"
feat: полировка интерфейса, Free-зона и PWA (WhatsApp/Telegram style)

Чат:
- Добавлены бесплатные модели Xiaomi MiMo-V2-Flash и Devstral 2 2512 (creditCost: 0, requiredPlan: free)
- OpenRouter: xiaomi/mimo-v2-flash, mistralai/devstral-2512:free
- Обновлены MODEL_MAP, CREDIT_COSTS, MODEL_LOGOS и MODEL_NAMES в чате

Изображения:
- Основная бесплатная модель: Flux.1 [schnell] (creditCost: 0 для text-to-image)

Видео:
- Добавлено бесплатное превью 2 сек (опция «2s (превью)») в Motion Lab
- creditCost: 0 для duration === 2, 30 для 5/10 сек
- validDurations: [2, 5, 10]

Аудио:
- Интеграция бесплатной озвучки (TTS) через Hugging Face Inference API
- При наличии HUGGINGFACE_API_KEY или HF_API_TOKEN — TTS с creditCost: 0
- Fallback на Replicate XTTS (3 кредита) или демо-аудио

PWA и Cookie (без одновременного показа):
- Cookie Banner: показ через 5 с после входа
- Install Prompt: строго через 5 мин или при втором визите, только при установленном cookieConsent
- suppressWhenCookieVisible: PWA-баннер не показывается, пока виден Cookie Banner
- Текст установки на русском: «Установите Synapse для быстрого доступа»
- Обработчик beforeinstallprompt: кнопка «Установить» вызывает deferredPrompt.prompt()

Брендинг и вёрстка:
- Иконки: синяя звезда (sparkles) на чёрном фоне в public/icons/icon.svg, manifest и apple-touch-icon
- Мобильное меню моделей: горизонтальный скролл (overflow-x-auto) в одну строку
- Сообщения и поле ввода выровнены по ширине (max-w-4xl, px-4 md:px-8)
"@

git add -A
git status
git commit -m $commitMessage
git push
