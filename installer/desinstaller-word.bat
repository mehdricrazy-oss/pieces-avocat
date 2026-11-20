@echo off
chcp 65001 >nul
title Desinstallation du Gestionnaire de Pieces Juridiques

echo ============================================================
echo   DESINSTALLATION DE L'ADD-IN WORD
echo ============================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\LegalPiecesAddin"
set "SHARE_NAME=LegalPiecesAddin"
set "CAT_KEY=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{A1B2C3D4-E5F6-4789-A012-3456789ABCDE}"

:: Suppression du partage reseau (si execute en admin)
net share %SHARE_NAME% /delete >nul 2>&1

:: Suppression des cles registre (nouvelle avec GUID et ancienne eventuelle)
reg delete "%CAT_KEY%" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\LegalPiecesAddinCatalog" /f >nul 2>&1

:: Suppression du dossier
if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
)

echo Le complement a ete supprime avec succes de Word.
echo.
pause
