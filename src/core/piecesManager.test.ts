import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    addPieceWithCascade,
    deletePieceWithCascade,
    movePiece,
    formatReferenceText,
    formatMultipleReferences,
    validateRegistry,
    reindexContiguous,
    parseBordereauText,
    updatePieceTitle
} from './piecesManager.js';
import type { Piece } from './piecesManager.ts';

describe('PiecesManager - Tests Avocat Conclusions Réelles', () => {

    it('devrait formater des renvois multiples conformes aux conclusions (Pièces n° 1 et 2)', () => {
        const p1: Piece = { id: 'p1', number: 1, title: 'Contrat commercial' };
        const p2: Piece = { id: 'p2', number: 2, title: 'Avenant n°1' };
        const p3: Piece = { id: 'p3', number: 3, title: 'Kbis' };

        // Test 1 pièce
        assert.equal(formatMultipleReferences([p1]), '(Pièce n°1)');

        // Test 2 pièces : "(Pièces n° 1 et 2)"
        assert.equal(formatMultipleReferences([p1, p2]), '(Pièces n° 1 et 2)');

        // Test 3 pièces : "(Pièces n° 1, 2 et 3)"
        assert.equal(formatMultipleReferences([p1, p2, p3]), '(Pièces n° 1, 2 et 3)');
    });

    it('devrait parser une liste brute de bordereau comme dans les vraies conclusions (page 17)', () => {
        const rawText = `
Pièce n°1 : Décisions de l'associé unique en date du 17 mars 22
Pièce n°2 : Procès-verbal de l'assemblée générale mixte en date du 26 juin 2024
Pièce n°3 : Extrait Kbis de la société Ready4digital
Pièce n°4 : Statuts de la société Reandy4digital
Pièce n°29 : Courriel de Madame Magali SCHEIRS en date du 18 mars 2024
        `;

        const parsed = parseBordereauText(rawText);
        assert.equal(parsed.length, 5);
        assert.equal(parsed[0].number, 1);
        assert.equal(parsed[0].title, "Décisions de l'associé unique en date du 17 mars 22");
        assert.equal(parsed[1].number, 2);
        assert.equal(parsed[4].number, 29);
        assert.equal(parsed[4].title, "Courriel de Madame Magali SCHEIRS en date du 18 mars 2024");
    });

    it('devrait insérer en cascade au milieu et décaler sans date requise', () => {
        let pieces: Piece[] = [
            { id: 'p1', number: 1, title: 'Pièce 1' },
            { id: 'p2', number: 2, title: 'Pièce 2' },
            { id: 'p3', number: 3, title: 'Pièce 3' }
        ];

        // Insère au n°2
        const res = addPieceWithCascade(pieces, {
            number: 2,
            title: 'Nouvelle pièce intercalée'
        });

        assert.equal(res.updatedPieces.length, 4);
        assert.equal(res.insertedPiece.number, 2);
        assert.equal(res.updatedPieces.find(p => p.id === 'p2')?.number, 3);
        assert.equal(res.updatedPieces.find(p => p.id === 'p3')?.number, 4);
    });

    it('devrait permettre de mettre à jour le titre d’une pièce', () => {
        const pieces: Piece[] = [{ id: 'p1', number: 1, title: 'Ancien titre' }];
        const updated = updatePieceTitle(pieces, 'p1', 'Nouveau titre rectifié');
        assert.equal(updated[0].title, 'Nouveau titre rectifié');
    });
});
