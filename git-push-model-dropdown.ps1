# feat: умный выпадающий список моделей с характеристиками
# Запуск из корня репозитория: .\git-push-model-dropdown.ps1

$msg = "feat: умный выпадающий список моделей с характеристиками"
git add -A

git stat
git commit -m $msg
git push
