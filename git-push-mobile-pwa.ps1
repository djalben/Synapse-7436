# fix: мобильная версия Full Screen, локализация Cookie/PWA, Bottom Sheet
# Запуск из корня репозитория: .\git-push-mobile-pwa.ps1

$msg = @"
fix: мобильная версия Full Screen и локализация баннеров

- Скрыт футер на мобильных (Full Screen App Mode)
- Область сообщений: pt-28 на мобильных, чтобы не перекрывать центральный текст
- Bottom Sheet моделей: max-h-[50vh] (пол-экрана), чёрный фон
- Cookie: русский текст и кнопки «Принять» / «Отклонить»
- PWA: текст «Установите Synapse на рабочий стол для быстрого доступа», задержка 3 мин после Cookie
- Иконка приложения — синяя звезда (icon.svg)
"@
git add -A
git status
git commit -m $msg
git push
