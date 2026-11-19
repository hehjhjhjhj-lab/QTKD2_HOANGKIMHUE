@echo off
chcp 65001 >nul
title Hoang Kim Hue Project - Tac Gia: Hoang Kim Hue | BI & AI Agent Analytics Portal
cls
echo ==============================================================================
echo   👑 HOANG KIM HUE PROJECT | BI & AI AGENT ANALYTICS PORTAL
echo   Tac gia: HOANG KIM HUE (Chuyen gia BI & AI Agent - AI301 De 07)
echo   API Key da tich hop san: AQ.Ab8RN6IV4VsXRh-yjZBccjHuGqK2bil_6k3FmBEBAX8HEiGCZA
echo   Server dang chay tai dia chi: http://localhost:8080/
echo ==============================================================================
echo.
echo Dang mo trinh duyet Web...
start http://localhost:8080/
echo.
echo Dang duy tri HTTP Server tren cong 8080 (Nhan Ctrl+C de dung server)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0http_server.ps1" -Port 8080
pause
