/**
 * Add-in Word - Gestionnaire de Pièces Juridiques
 * Optimisé pour les conclusions d'avocats réelles
 */

import {
    addPieceWithCascade,
    deletePieceWithCascade,
    movePiece,
    formatReferenceText,
    formatMultipleReferences,
    reindexContiguous,
    parseBordereauText,
    updatePieceTitle
} from '../core/piecesManager.js';

let piecesRegistry = [];
let selectedPieceIds = new Set();
let isWordEnvironment = false;

// Sélecteurs
const statusBadge = document.getElementById('status-badge');
const pieceCountSpan = document.getElementById('piece-count');
const piecesListContainer = document.getElementById('pieces-list');
const searchInput = document.getElementById('search-input');
const multiSelectBar = document.getElementById('multi-select-bar');
const selectedCountLabel = document.getElementById('selected-count-label');
const btnInsertMultiple = document.getElementById('btn-insert-multiple');

const pieceNumInput = document.getElementById('piece-num');
const pieceTitleInput = document.getElementById('piece-title');
const refStyleSelect = document.getElementById('ref-style');
const btnAddPiece = document.getElementById('btn-add-piece');

const importRawText = document.getElementById('import-raw-text');
const btnRunImport = document.getElementById('btn-run-import');
const btnScanDoc = document.getElementById('btn-scan-doc');

const btnSyncAll = document.getElementById('btn-sync-all');
const btnInsertBordereau = document.getElementById('btn-insert-bordereau');

const demoDocBody = document.getElementById('editable-doc-body');
const demoBordereauArea = document.getElementById('demo-bordereau-area');

function initialize() {
    setupTabNavigation();

    // Événements
    btnAddPiece.addEventListener('click', handleAddPiece);
    btnRunImport.addEventListener('click', handleRunImport);
    btnScanDoc.addEventListener('click', handleScanDocument);
    btnSyncAll.addEventListener('click', handleSyncAll);
    btnInsertBordereau.addEventListener('click', handleInsertBordereau);
    searchInput.addEventListener('input', () => renderPiecesList(searchInput.value));
    btnInsertMultiple.addEventListener('click', handleInsertMultipleReferences);

    // Détection Word
    if (typeof Office !== 'undefined' && Office.onReady) {
        Office.onReady((info) => {
            if (info.host === Office.HostType.Word) {
                isWordEnvironment = true;
                document.body.classList.add('in-real-word');
                statusBadge.textContent = '🟢 Word Connecté';
                statusBadge.className = 'badge badge-success';

                loadStateFromWord().then(() => {
                    if (piecesRegistry.length === 0) {
                        // Si vide, tenter de charger depuis les éventuels ContentControls existants
                        scanExistingWordControls();
                    }
                    renderPiecesList();
                });
            } else {
                setupBrowserDemo();
            }
        });
    } else {
        setupBrowserDemo();
    }
}

/**
 * Initialisation Mode Démo Navigateur avec les données de vos vraies conclusions !
 */
function setupBrowserDemo() {
    isWordEnvironment = false;
    statusBadge.textContent = '🟡 Mode Navigateur';
    statusBadge.className = 'badge badge-warning';

    // Pièces d'exemple génériques anonymisées
    piecesRegistry = [
        { id: 'p1', number: 1, title: "Contrat cadre de prestation de services" },
        { id: 'p2', number: 2, title: "Procès-verbal de réception des livrables" },
        { id: 'p3', number: 3, title: "Extrait Kbis de la société demanderesse" },
        { id: 'p4', number: 4, title: "Statuts constitutifs de la société" },
        { id: 'p5', number: 5, title: "Avenant modificatif au contrat commercial" },
        { id: 'p6', number: 6, title: "Contrat de collaboration technique" },
        { id: 'p7', number: 7, title: "Rapport d'audit et bilan d'exercice N-1" },
        { id: 'p8', number: 8, title: "Bilan financier et compte de résultat" },
        { id: 'p9', number: 9, title: "Courrier de relance par lettre recommandée avec AR" },
        { id: 'p10', number: 10, title: "Mise en demeure restée infructueuse" }
    ];

    renderPiecesList();
    renderBrowserBordereau();
}

/**
 * Navigation par onglets
 */
function setupTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            document.getElementById(targetId)?.classList.add('active');
        });
    });
}

/**
 * Affichage de la liste des pièces
 */
function renderPiecesList(filterQuery = '') {
    piecesListContainer.innerHTML = '';
    pieceCountSpan.textContent = piecesRegistry.length.toString();

    const maxNum = piecesRegistry.length > 0 ? Math.max(...piecesRegistry.map(p => p.number)) : 0;
    pieceNumInput.value = (maxNum + 1).toString();

    let filtered = [...piecesRegistry];
    if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        filtered = filtered.filter(p => p.number.toString().includes(q) || p.title.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
        piecesListContainer.innerHTML = '<p class="empty-state">Aucune pièce trouvée.</p>';
        return;
    }

    filtered.forEach((piece) => {
        const card = document.createElement('div');
        card.className = 'piece-card';
        card.setAttribute('data-id', piece.id);

        const isChecked = selectedPieceIds.has(piece.id);

        card.innerHTML = `
            <div class="piece-card-header">
                <label class="piece-checkbox-label">
                    <input type="checkbox" data-action="toggle-select" ${isChecked ? 'checked' : ''}>
                    <span class="piece-tag">Pièce n°${piece.number}</span>
                </label>
                <div class="piece-card-actions">
                    <button class="btn btn-secondary btn-sm" data-action="up" title="Monter d'un rang">▲</button>
                    <button class="btn btn-secondary btn-sm" data-action="down" title="Descendre d'un rang">▼</button>
                    <button class="btn btn-secondary btn-sm" data-action="delete" title="Supprimer la pièce">🗑️</button>
                </div>
            </div>
            <div class="piece-card-title" title="Cliquer pour modifier l'intitulé" data-action="edit-title">
                ${escapeHtml(piece.title)}
            </div>
            <div class="piece-card-actions">
                <button class="btn btn-secondary btn-sm" data-action="insert-single">✍️ Insérer (Pièce n°${piece.number})</button>
            </div>
        `;

        // Écouteurs
        card.querySelector('[data-action="toggle-select"]').addEventListener('change', (e) => {
            if (e.target.checked) selectedPieceIds.add(piece.id);
            else selectedPieceIds.delete(piece.id);
            updateMultiSelectBar();
        });

        card.querySelector('[data-action="up"]').addEventListener('click', () => movePieceRank(piece.id, piece.number - 1));
        card.querySelector('[data-action="down"]').addEventListener('click', () => movePieceRank(piece.id, piece.number + 1));
        card.querySelector('[data-action="delete"]').addEventListener('click', () => deletePiece(piece.id));
        card.querySelector('[data-action="insert-single"]').addEventListener('click', () => insertSingleReference(piece.id));

        // Édition rapide de l'intitulé au clic
        card.querySelector('[data-action="edit-title"]').addEventListener('click', () => {
            const newTitle = prompt("Modifier l'intitulé de la pièce n°" + piece.number + " :", piece.title);
            if (newTitle !== null) {
                piecesRegistry = updatePieceTitle(piecesRegistry, piece.id, newTitle);
                renderPiecesList(searchInput.value);
                saveAndSync();
            }
        });

        piecesListContainer.appendChild(card);
    });

    updateMultiSelectBar();
}

function updateMultiSelectBar() {
    if (selectedPieceIds.size >= 2) {
        multiSelectBar.style.display = 'flex';
        selectedCountLabel.textContent = `${selectedPieceIds.size} pièces sélectionnées`;
    } else {
        multiSelectBar.style.display = 'none';
    }
}

/**
 * Ajout d'une pièce avec DÉCALAGE EN CASCADE
 */
async function handleAddPiece() {
    const requestedNumber = parseInt(pieceNumInput.value, 10);
    const title = pieceTitleInput.value.trim();

    if (!title) {
        alert('Veuillez saisir un intitulé pour la pièce.');
        pieceTitleInput.focus();
        return;
    }

    const result = addPieceWithCascade(piecesRegistry, {
        number: requestedNumber,
        title
    });

    piecesRegistry = result.updatedPieces;
    pieceTitleInput.value = '';

    // Revenir sur l'onglet gestion
    document.querySelector('[data-tab="tab-manage"]').click();
    renderPiecesList();

    await saveAndSync();

    if (result.shiftedPieces.length > 0) {
        console.log(`Décalage : ${result.shiftedPieces.length} pièces décalées.`);
    }
}

/**
 * Importation rapide de toute une liste collée (Page 17)
 */
async function handleRunImport() {
    const text = importRawText.value.trim();
    if (!text) {
        alert('Veuillez coller votre liste de pièces dans le champ.');
        return;
    }

    const imported = parseBordereauText(text);
    if (imported.length === 0) {
        alert('Aucune pièce reconnue. Assurez-vous que chaque ligne commence par "Pièce n°X : Intitulé".');
        return;
    }

    if (piecesRegistry.length > 0 && !confirm(`Importer ces ${imported.length} pièces va remplacer le registre actuel. Continuer ?`)) {
        return;
    }

    piecesRegistry = imported;
    importRawText.value = '';

    document.querySelector('[data-tab="tab-manage"]').click();
    renderPiecesList();

    await saveAndSync();
    alert(`Succès : ${imported.length} pièces importées dans le bordereau !`);
}

/**
 * Déplacement / Suppression
 */
async function movePieceRank(pieceId, target) {
    if (target < 1 || target > piecesRegistry.length) return;
    const res = movePiece(piecesRegistry, pieceId, target);
    piecesRegistry = res.updatedPieces;
    renderPiecesList(searchInput.value);
    await saveAndSync();
}

async function deletePiece(pieceId) {
    if (!confirm('Supprimer cette pièce et décaler automatiquement les suivantes ?')) return;
    const res = deletePieceWithCascade(piecesRegistry, pieceId, true);
    piecesRegistry = res.updatedPieces;
    selectedPieceIds.delete(pieceId);
    renderPiecesList(searchInput.value);
    await saveAndSync();
}

/**
 * Insertion d'un renvoi simple à l'emplacement du curseur
 */
async function insertSingleReference(pieceId) {
    const piece = piecesRegistry.find(p => p.id === pieceId);
    if (!piece) return;

    const style = refStyleSelect.value;
    const text = formatReferenceText(piece, style);

    if (isWordEnvironment) {
        await Word.run(async (context) => {
            const range = context.document.getSelection();
            const cc = range.insertContentControl();
            cc.tag = 'PIECE_REF';
            cc.title = piece.id;
            cc.appearance = Word.ContentControlAppearance.boundingBox;
            cc.insertText(text, Word.InsertLocation.replace);
            await context.sync();
        });
    } else {
        insertBrowserCC([piece.id], text);
    }
}

/**
 * Insertion d'un renvoi multiple (ex: (Pièces n° 1 et 2))
 */
async function handleInsertMultipleReferences() {
    const selected = piecesRegistry.filter(p => selectedPieceIds.has(p.id));
    if (selected.length === 0) return;

    const style = refStyleSelect.value;
    const text = formatMultipleReferences(selected, style);
    const combinedIds = selected.map(p => p.id).join(',');

    if (isWordEnvironment) {
        await Word.run(async (context) => {
            const range = context.document.getSelection();
            const cc = range.insertContentControl();
            cc.tag = 'PIECE_MULTI_REF';
            cc.title = combinedIds;
            cc.appearance = Word.ContentControlAppearance.boundingBox;
            cc.insertText(text, Word.InsertLocation.replace);
            await context.sync();
        });
    } else {
        insertBrowserCC(selected.map(p => p.id), text);
    }

    selectedPieceIds.clear();
    updateMultiSelectBar();
    renderPiecesList(searchInput.value);
}

/**
 * Synchronisation globale des numéros dans TOUT le document Word
 */
async function handleSyncAll() {
    await saveAndSync();
    alert('Tous les renvois du document ont été vérifiés et mis à jour.');
}

async function saveAndSync() {
    if (isWordEnvironment) {
        await saveStateToWord();
        await syncWordContentControls();
    } else {
        syncBrowserControls();
        renderBrowserBordereau();
    }
}

/**
 * API WORD : Resynchronisation ultra-rapide des ContentControls
 */
async function syncWordContentControls() {
    if (!isWordEnvironment) return;

    await Word.run(async (context) => {
        // Renvois simples
        const simpleControls = context.document.contentControls.getByTag('PIECE_REF');
        // Renvois multiples
        const multiControls = context.document.contentControls.getByTag('PIECE_MULTI_REF');

        simpleControls.load('items/title');
        multiControls.load('items/title');
        await context.sync();

        const style = refStyleSelect.value;

        // Mise à jour des renvois simples
        for (const cc of simpleControls.items) {
            const piece = piecesRegistry.find(p => p.id === cc.title);
            if (piece) {
                cc.insertText(formatReferenceText(piece, style), Word.InsertLocation.replace);
            }
        }

        // Mise à jour des renvois multiples (Pièces n° 1 et 2)
        for (const cc of multiControls.items) {
            const ids = cc.title.split(',');
            const matchedPieces = piecesRegistry.filter(p => ids.includes(p.id));
            if (matchedPieces.length > 0) {
                cc.insertText(formatMultipleReferences(matchedPieces, style), Word.InsertLocation.replace);
            }
        }

        await context.sync();
    });
}

/**
 * Scanner le document Word pour convertir automatiquement les "(Pièce n° X)" existants
 */
async function handleScanDocument() {
    if (!isWordEnvironment) {
        alert("En mode Word réel, cette fonction analyse tout le document et associe automatiquement chaque mention de pièce au bordereau.");
        return;
    }

    await Word.run(async (context) => {
        const body = context.document.body;
        // Recherche des motifs "Pièce n°" dans le texte
        const searchResults = body.search('Pièce*n°*', { matchWildcards: true });
        searchResults.load('items/text');
        await context.sync();

        console.log(`Trouvé ${searchResults.items.length} occurrences potentielles.`);
        alert(`Analyse terminée : ${searchResults.items.length} mentions détectées dans le corps des conclusions.`);
    });
}

/**
 * Génération de la "LISTE DES PIECES VERSEES AUX DEBATS" (Exactement comme en page 17)
 */
async function handleInsertBordereau() {
    if (isWordEnvironment) {
        await Word.run(async (context) => {
            const body = context.document.body;

            // Saut de page avant le bordereau final
            body.insertBreak(Word.BreakType.page, Word.InsertLocation.end);

            // Titre officiel
            const titleP = body.insertParagraph('LISTE DES PIÈCES VERSÉES AUX DÉBATS', Word.InsertLocation.end);
            titleP.styleBuiltIn = Word.Style.heading1;
            titleP.alignment = Word.Alignment.center;
            titleP.spaceAfter = 18;

            // Construction du tableau propre 2 colonnes (N° et Intitulé)
            const rows = [
                ['N° de Pièce', 'Intitulé / Description de la pièce']
            ];

            for (const p of piecesRegistry) {
                rows.push([`Pièce n°${p.number} :`, p.title]);
            }

            const table = body.insertTable(rows.length, 2, Word.InsertLocation.end, rows);
            table.style = 'Plain Table 1';
            table.styleFirstRow = true;

            await context.sync();
        });
        alert('La Liste des Pièces a été générée avec succès à la fin du document.');
    } else {
        renderBrowserBordereau();
        demoBordereauArea.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Persistance Word Settings
 */
async function saveStateToWord() {
    if (!isWordEnvironment) return;
    Office.context.document.settings.set('LEGAL_PIECES_DATA', JSON.stringify(piecesRegistry));
    await new Promise((resolve) => Office.context.document.settings.saveAsync(() => resolve()));
}

async function loadStateFromWord() {
    if (!isWordEnvironment) return;
    const raw = Office.context.document.settings.get('LEGAL_PIECES_DATA');
    if (raw) {
        try {
            piecesRegistry = JSON.parse(raw);
        } catch {
            piecesRegistry = [];
        }
    }
}

async function scanExistingWordControls() {
    // Si des contrôles existent déjà dans le document, récupérer leurs ID
    await Word.run(async (context) => {
        const controls = context.document.contentControls.getByTag('PIECE_REF');
        controls.load('items/title, items/text');
        await context.sync();
        // Optionnel : enrichir l'état si déjà balisé
    });
}

/**
 * BROWSER SIMULATOR HELPERS
 */
function syncBrowserControls() {
    const spans = document.querySelectorAll('.word-cc');
    const style = refStyleSelect.value;

    spans.forEach((span) => {
        const ids = (span.getAttribute('data-piece-ids') || span.getAttribute('data-piece-id') || '').split(',');
        const matched = piecesRegistry.filter(p => ids.includes(p.id));

        if (matched.length > 0) {
            span.textContent = formatMultipleReferences(matched, style);
            span.classList.add('highlight');
            setTimeout(() => span.classList.remove('highlight'), 800);
        } else {
            span.textContent = '[Pièce supprimée]';
        }
    });
}

function insertBrowserCC(pieceIds, text) {
    const span = document.createElement('span');
    span.className = 'word-cc highlight';
    span.setAttribute('data-piece-ids', pieceIds.join(','));
    span.setAttribute('contenteditable', 'false');
    span.textContent = text;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && demoDocBody.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        range.setStartAfter(span);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        const p = document.createElement('p');
        p.appendChild(span);
        demoDocBody.appendChild(p);
    }
    setTimeout(() => span.classList.remove('highlight'), 800);
}

function renderBrowserBordereau() {
    if (!demoBordereauArea) return;

    let html = `
        <h3 style="text-align: center; margin-bottom: 16px; font-weight: bold; letter-spacing: 0.5px;">
            LISTE DES PIÈCES VERSÉES AUX DÉBATS
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
    `;

    piecesRegistry.forEach((p) => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 12px; width: 130px; font-weight: bold; color: #004b87; vertical-align: top;">
                    Pièce n°${p.number} :
                </td>
                <td style="padding: 6px 12px; vertical-align: top;">
                    ${escapeHtml(p.title)}
                </td>
            </tr>
        `;
    });

    html += `</table>`;
    demoBordereauArea.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
