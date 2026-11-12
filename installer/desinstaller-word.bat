@echo off
chcp 65001 >nul
title Desinstallation du Gestionnaire de Pieces Juridiques

echo ============================================================
echo   DESINSTALLATION DE L'ADD-IN WORD
echo ============================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\LegalPiecesAddin"
set "CAT_KEY=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\LegalPiecesAddinCatalog"

:: Suppression de la cle registre
reg delete "%CAT_KEY%" /f >nul 2>&1

:: Suppression du dossier
if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
)

echo Le complement a ete supprime avec succes de Word.
echo.
pause
