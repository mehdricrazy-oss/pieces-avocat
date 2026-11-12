/**
 * Logique métier pure - Gestion des pièces juridiques
 */

export function generatePieceId() {
    return `piece_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function formatReferenceText(piece, style = 'paren') {
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

export function formatMultipleReferences(pieces, style = 'paren') {
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

export function addPieceWithCascade(existingPieces, params) {
    const list = existingPieces.map(p => ({ ...p }));
    const maxNum = list.length > 0 ? Math.max(...list.map(p => p.number)) : 0;
    
    let targetNumber = params.number && params.number > 0 ? Math.floor(params.number) : maxNum + 1;
    if (targetNumber > maxNum + 1) {
        targetNumber = maxNum + 1;
    }

    const shiftedPieces = [];

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

    const insertedPiece = {
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

export function deletePieceWithCascade(existingPieces, pieceId, renumberRemaining = true) {
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

    const shiftedPieces = [];

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

export function movePiece(existingPieces, pieceId, targetNumber) {
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
    const shiftedPieces = [];

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

    const currentPiece = list.find(p => p.id === pieceId);
    if (currentPiece) {
        currentPiece.number = clampedTarget;
    }

    list.sort((a, b) => a.number - b.number);

    return {
        updatedPieces: list,
        movedPiece: currentPiece,
        shiftedPieces
    };
}

export function updatePieceTitle(existingPieces, pieceId, newTitle) {
    return existingPieces.map(p => {
        if (p.id === pieceId) {
            return { ...p, title: newTitle.trim() || p.title };
        }
        return p;
    });
}

export function validateRegistry(pieces) {
    const errors = [];
    const seenIds = new Set();
    const seenNumbers = new Set();

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

export function reindexContiguous(pieces) {
    const sorted = [...pieces].sort((a, b) => a.number - b.number);
    const shiftedPieces = [];

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

export function parseBordereauText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const result = [];
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

    result.sort((a, b) => a.number - b.number);
    return result;
}
