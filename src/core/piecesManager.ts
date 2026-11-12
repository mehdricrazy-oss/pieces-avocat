export interface Piece {
    id: string;
    number: number;
    title: string;
    date?: string;
    notes?: string;
}

export type ReferenceStyle = 'paren' | 'short' | 'full';

export interface ShiftInfo {
    id: string;
    oldNumber: number;
    newNumber: number;
}

export interface AddPieceResult {
    updatedPieces: Piece[];
    insertedPiece: Piece;
    shiftedPieces: ShiftInfo[];
}

export interface DeletePieceResult {
    updatedPieces: Piece[];
    deletedPiece?: Piece;
    shiftedPieces: ShiftInfo[];
}

export interface MovePieceResult {
    updatedPieces: Piece[];
    movedPiece?: Piece;
    shiftedPieces: ShiftInfo[];
}

/**
 * Génère un identifiant unique immuable pour une pièce.
 */
export function generatePieceId(): string {
    return `piece_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Formate le texte d'un renvoi simple (ex: (Pièce n°3) ou [Pièce n°3])
 */
export function formatReferenceText(piece: Piece, style: ReferenceStyle = 'paren'): string {
    switch (style) {
        case 'short':
            return `[Pièce n°${piece.number}]`;
        case 'full':
            return `[Pièce n°${piece.number} : ${piece.title}]`;
        case 'paren':
        default:
            return `(Pièce n°${piece.number})`;
    }
}

/**
 * Formate un renvoi vers plusieurs pièces (ex: (Pièces n° 1 et 2), (Pièces n° 3, 4 et 5))
 * Conforme aux usages stricts des conclusions d'avocats.
 */
export function formatMultipleReferences(pieces: Piece[], style: ReferenceStyle = 'paren'): string {
    if (!pieces || pieces.length === 0) return '';
    if (pieces.length === 1) return formatReferenceText(pieces[0], style);

    const sorted = [...pieces].sort((a, b) => a.number - b.number);
    const nums = sorted.map(p => p.number);

    let numbersText = '';
    if (nums.length === 2) {
        numbersText = `${nums[0]} et ${nums[1]}`;
    } else {
        const last = nums[nums.length - 1];
        const initial = nums.slice(0, -1).join(', ');
        numbersText = `${initial} et ${last}`;
    }

    switch (style) {
        case 'short':
            return `[Pièces n° ${numbersText}]`;
        case 'full':
            return `[Pièces n° ${numbersText} : ${sorted.map(p => p.title).join(' / ')}]`;
        case 'paren':
        default:
            return `(Pièces n° ${numbersText})`;
    }
}

/**
 * Ajoute une pièce avec décalage en cascade automatique.
 */
export function addPieceWithCascade(
    existingPieces: Piece[],
    params: {
        number?: number;
        title: string;
        date?: string;
        notes?: string;
        id?: string;
    }
): AddPieceResult {
    const list: Piece[] = existingPieces.map(p => ({ ...p }));
    const maxNum = list.length > 0 ? Math.max(...list.map(p => p.number)) : 0;
    
    let targetNumber = params.number && params.number > 0 ? Math.floor(params.number) : maxNum + 1;
    if (targetNumber > maxNum + 1) {
        targetNumber = maxNum + 1;
    }

    const shiftedPieces: ShiftInfo[] = [];

    // Décalage en cascade pour tous les éléments >= targetNumber
    for (const p of list) {
        if (p.number >= targetNumber) {
            shiftedPieces.push({
                id: p.id,
                oldNumber: p.number,
                newNumber: p.number + 1
            });
            p.number += 1;
        }
    }

    const insertedPiece: Piece = {
        id: params.id || generatePieceId(),
        number: targetNumber,
        title: params.title.trim() || `Pièce n°${targetNumber}`,
        notes: params.notes?.trim()
    };

    list.push(insertedPiece);
    list.sort((a, b) => a.number - b.number);

    return {
        updatedPieces: list,
        insertedPiece,
        shiftedPieces
    };
}

/**
 * Supprime une pièce et réindexe les suivantes
 */
export function deletePieceWithCascade(
    existingPieces: Piece[],
    pieceId: string,
    renumberRemaining: boolean = true
): DeletePieceResult {
    const target = existingPieces.find(p => p.id === pieceId);
    if (!target) {
        return {
            updatedPieces: [...existingPieces],
            deletedPiece: undefined,
            shiftedPieces: []
        };
    }

    const list = existingPieces
        .filter(p => p.id !== pieceId)
        .map(p => ({ ...p }));

    const shiftedPieces: ShiftInfo[] = [];

    if (renumberRemaining) {
        for (const p of list) {
            if (p.number > target.number) {
                shiftedPieces.push({
                    id: p.id,
                    oldNumber: p.number,
                    newNumber: p.number - 1
                });
                p.number -= 1;
            }
        }
    }

    list.sort((a, b) => a.number - b.number);

    return {
        updatedPieces: list,
        deletedPiece: target,
        shiftedPieces
    };
}

/**
 * Déplace une pièce (ex: monter / descendre)
 */
export function movePiece(
    existingPieces: Piece[],
    pieceId: string,
    targetNumber: number
): MovePieceResult {
    const target = existingPieces.find(p => p.id === pieceId);
    if (!target || target.number === targetNumber) {
        return {
            updatedPieces: [...existingPieces],
            movedPiece: target,
            shiftedPieces: []
        };
    }

    const max = existingPieces.length;
    const clampedTarget = Math.max(1, Math.min(targetNumber, max));
    const oldNum = target.number;

    const list = existingPieces.map(p => ({ ...p }));
    const shiftedPieces: ShiftInfo[] = [];

    if (clampedTarget > oldNum) {
        for (const p of list) {
            if (p.id !== pieceId && p.number > oldNum && p.number <= clampedTarget) {
                shiftedPieces.push({ id: p.id, oldNumber: p.number, newNumber: p.number - 1 });
                p.number -= 1;
            }
        }
    } else {
        for (const p of list) {
            if (p.id !== pieceId && p.number >= clampedTarget && p.number < oldNum) {
                shiftedPieces.push({ id: p.id, oldNumber: p.number, newNumber: p.number + 1 });
                p.number += 1;
            }
        }
    }

    const currentPiece = list.find(p => p.id === pieceId)!;
    currentPiece.number = clampedTarget;

    list.sort((a, b) => a.number - b.number);

    return {
        updatedPieces: list,
        movedPiece: currentPiece,
        shiftedPieces
    };
}

/**
 * Modifie le titre d'une pièce existante
 */
export function updatePieceTitle(existingPieces: Piece[], pieceId: string, newTitle: string): Piece[] {
    return existingPieces.map(p => {
        if (p.id === pieceId) {
            return { ...p, title: newTitle.trim() || p.title };
        }
        return p;
    });
}

/**
 * Valide l'intégrité de la liste
 */
export function validateRegistry(pieces: Piece[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const seenIds = new Set<string>();
    const seenNumbers = new Set<number>();

    const sorted = [...pieces].sort((a, b) => a.number - b.number);

    for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        if (seenIds.has(p.id)) {
            errors.push(`Identifiant en doublon : ${p.id}`);
        }
        seenIds.add(p.id);

        if (seenNumbers.has(p.number)) {
            errors.push(`Numéro en doublon : Pièce n°${p.number}`);
        }
        seenNumbers.add(p.number);

        const expectedNum = i + 1;
        if (p.number !== expectedNum) {
            errors.push(`Rupture de séquence : pièce n°${p.number} trouvée au rang ${expectedNum}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Réindexe contiguë de 1 à N
 */
export function reindexContiguous(pieces: Piece[]): { updatedPieces: Piece[]; shiftedPieces: ShiftInfo[] } {
    const sorted = [...pieces].sort((a, b) => a.number - b.number);
    const shiftedPieces: ShiftInfo[] = [];

    sorted.forEach((p, index) => {
        const expected = index + 1;
        if (p.number !== expected) {
            shiftedPieces.push({
                id: p.id,
                oldNumber: p.number,
                newNumber: expected
            });
            p.number = expected;
        }
    });

    return {
        updatedPieces: sorted,
        shiftedPieces
    };
}

/**
 * Parseur intelligent d'une liste de pièces existante (copier-coller de conclusions réelles).
 * Exemple accepté :
 * "Pièce n°1 : Décisions de l'associé unique en date du 17 mars 22"
 * "Pièce 2 : Procès-verbal de l'assemblée générale..."
 * "3 - Extrait Kbis..."
 */
export function parseBordereauText(rawText: string): Piece[] {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const result: Piece[] = [];

    // Regex pour détecter "Pièce n°X : Description" ou "Pièce X: Description" ou "X : Description"
    const regex = /^(?:Pi[èe]ce(?:s)?\s*(?:n[°o]\s*|adverse\s*n[°o]\s*|adverse\s*)?)?\s*(\d+)\s*[:\-\.]\s*(.+)$/i;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const num = parseInt(match[1], 10);
            const title = match[2].trim();
            result.push({
                id: generatePieceId(),
                number: num,
                title
            });
        }
    }

    // Tri par numéro
    result.sort((a, b) => a.number - b.number);
    return result;
}
