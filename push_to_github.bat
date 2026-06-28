@echo off
echo =======================================
echo Pushing CodePilot to GitHub
echo =======================================

:: Check if git is initialized
if not exist .git (
    echo Initializing Git repository...
    git init
)

:: Add all files (node_modules is ignored via .gitignore)
echo Adding files to git...
git add .

:: Commit files
echo Committing files...
git commit -m "Initial commit from CodePilot"

:: Check if remote origin exists
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo No remote origin found.
    set /p repo_url="Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): "
    if "%repo_url%"=="" (
        echo Error: Repo URL cannot be empty.
        pause
        exit /b 1
    )
    git remote add origin %repo_url%
) else (
    echo Remote origin already set.
)

:: Rename branch to main
echo Setting branch name to main...
git branch -M main

:: Push to main
echo Pushing to GitHub...
git push -u origin main

echo =======================================
echo Done!
echo =======================================
pause
