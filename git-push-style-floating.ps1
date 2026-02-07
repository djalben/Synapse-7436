# style: парящее меню моделей и запрет глобального скролла страницы
# Запуск из корня репозитория: .\git-push-style-floating.ps1

$msg = "style: парящее меню моделей и запрет глобального скролла страницы"
git add -A
git status
git commit -m $msg
git push
