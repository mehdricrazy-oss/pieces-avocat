@echo off
chcp 65001 >nul
title Installation du Gestionnaire de Pieces Juridiques

:: Verification des droits administrateur (requis pour net share)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Veuillez executer ce script en tant qu'Administrateur :
    echo          Clic droit sur le fichier -^> "Executer en tant qu'administrateur".
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo   INSTALLATION DE L'ADD-IN WORD - GESTIONNAIRE DE PIECES
echo ============================================================
echo.

:: 1. Creation du dossier local et partage reseau UNC (exige par Word)
set "TARGET_DIR=%LOCALAPPDATA%\LegalPiecesAddin"
set "SHARE_NAME=LegalPiecesAddin"

if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

echo [1/3] Creation du partage reseau local...
net share %SHARE_NAME% /delete >nul 2>&1
net share %SHARE_NAME%="%TARGET_DIR%" /grant:"%USERNAME%",READ >nul

if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Impossible de creer le partage reseau %SHARE_NAME%.
    pause
    exit /b 1
)

echo [2/3] Telechargement du manifeste officiel...
powershell -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('https://raw.githubusercontent.com/mehdricrazy-oss/pieces-avocat/main/manifest.xml', '%TARGET_DIR%\manifest.xml')"

if not exist "%TARGET_DIR%\manifest.xml" (
    echo [ERREUR] Impossible de telecharger le fichier manifest.xml. Verifiez votre connexion internet.
    pause
    exit /b 1
)

:: 2. Enregistrement dans le registre Windows avec un GUID valide et un chemin UNC
echo [3/3] Configuration de Word (Catalogue approuve)...

set "REG_BASE=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs"
set "CAT_GUID={A1B2C3D4-E5F6-4789-A012-3456789ABCDE}"
set "CAT_KEY=%REG_BASE%\%CAT_GUID%"
set "UNC_PATH=\\localhost\%SHARE_NAME%"

reg add "%CAT_KEY%" /v "Id" /t REG_SZ /d "%CAT_GUID%" /f >nul
reg add "%CAT_KEY%" /v "Url" /t REG_SZ /d "%UNC_PATH%" /f >nul
reg add "%CAT_KEY%" /v "Flags" /t REG_DWORD /d 1 /f >nul

if %ERRORLEVEL% equ 0 (
    echo [OK] Catalogue reseau %UNC_PATH% enregistre avec succes.
) else (
    echo [ATTENTION] Impossible d'ecrire dans le registre Office.
)

echo.
echo ============================================================
echo   SUCCES : Le complement a ete installe sur votre PC !
echo ============================================================
echo.
echo Pour l'utiliser dans Word :
echo   1. Fermez completement Word s'il est ouvert, puis relancez-le.
echo   2. Cliquez sur l'onglet "Insertion" -^> "Mes complements".
echo   3. Cliquez sur l'onglet "DOSSIER PARTAGE" (ou "SHARED FOLDER").
echo   4. Cliquez sur "Gestionnaire de Pieces" puis sur "Ajouter".
echo.
pause
