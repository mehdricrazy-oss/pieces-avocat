@echo off
chcp 65001 >nul
title Installation du Gestionnaire de Pieces Juridiques

echo ============================================================
echo   INSTALLATION DE L'ADD-IN WORD - GESTIONNAIRE DE PIECES
echo ============================================================
echo.

:: 1. Creation du dossier local pour le manifest
set "TARGET_DIR=%LOCALAPPDATA%\LegalPiecesAddin"
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

echo [1/3] Telechargement du manifeste officiel...
powershell -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('https://raw.githubusercontent.com/mehdricrazy-oss/pieces-avocat/main/manifest.xml', '%TARGET_DIR%\manifest.xml')"

if not exist "%TARGET_DIR%\manifest.xml" (
    echo [ERREUR] Impossible de telecharger le fichier manifest.xml. Verifiez votre connexion internet.
    pause
    exit /b 1
)

:: 2. Enregistrement dans le registre Windows (Trusted Catalogs Office)
echo [2/3] Configuration automatique de Word (Catalogue approuve)...

set "REG_BASE=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs"

:: Creer une cle unique pour notre catalogue
set "CAT_KEY=%REG_BASE%\LegalPiecesAddinCatalog"

:: Inscrire le chemin local et autoriser le catalogue dans le menu
reg add "%CAT_KEY%" /v "Url" /t REG_SZ /d "%TARGET_DIR%" /f >nul
reg add "%CAT_KEY%" /v "Flags" /t REG_DWORD /d 1 /f >nul

if %ERRORLEVEL% equ 0 (
    echo [OK] Registre Word configure avec succes.
) else (
    echo [ATTENTION] Impossible d'ecrire dans le registre Office.
)

:: 3. Message de confirmation
echo [3/3] Finalisation...
echo.
echo ============================================================
echo   SUCCES : Le complement a ete installe sur votre PC !
echo ============================================================
echo.
echo Pour l'utiliser dans Word :
echo   1. Lancez Microsoft Word.
echo   2. Cliquez sur l'onglet "Insertion" -> "Mes complements".
echo   3. Cliquez sur l'onglet "DOSSIER PARTAGE" (ou "SHARED FOLDER").
echo   4. Cliquez sur "Gestionnaire de Pieces" puis sur "Ajouter".
echo.
pause
