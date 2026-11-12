/**
 * Simulation E2E du flux complet Avocat
 * 1. Ajout de pièces
 * 2. Insertion d'une pièce au milieu (décalage en cascade)
 * 3. Mise à jour automatique des balises dans le texte des conclusions
 * 4. Génération du bordereau récapitulatif
 */

import assert from 'node:assert/strict';
import {
    addPieceWithCascade,
    formatReferenceText,
    validateRegistry
} from './src/core/piecesManager.js';

console.log('🧪 Début du test de simulation du flux Avocat...\n');

// 1. Initialisation : l'avocat rédige et ajoute 3 pièces initiales
let pieces = [];

const r1 = addPieceWithCascade(pieces, { title: 'Contrat commercial initial', date: '10/01/2023', id: 'id_contrat' });
pieces = r1.updatedPieces;

const r2 = addPieceWithCascade(pieces, { title: 'Facture d\'acompte n°1024', date: '15/01/2023', id: 'id_facture' });
pieces = r2.updatedPieces;

const r3 = addPieceWithCascade(pieces, { title: 'Mise en demeure par LRAR', date: '20/11/2023', id: 'id_mise_en_demeure' });
pieces = r3.updatedPieces;

console.log('✅ Étape 1 : 3 pièces initiales créées');
console.log(pieces.map(p => `   • Pièce n°${p.number} : ${p.title} (ID: ${p.id})`).join('\n'));

// Simulation du document Word avec des ContentControls référençant ces pièces par leur ID immuable
const mockWordDocument = [
    { tag: 'PIECE_REF', title: 'id_contrat', text: formatReferenceText(pieces.find(p => p.id === 'id_contrat')) },
    { tag: 'PIECE_REF', title: 'id_facture', text: formatReferenceText(pieces.find(p => p.id === 'id_facture')) },
    { tag: 'PIECE_REF', title: 'id_mise_en_demeure', text: formatReferenceText(pieces.find(p => p.id === 'id_mise_en_demeure')) }
];

console.log('\n📄 État initial des renvois dans le texte des conclusions :');
mockWordDocument.forEach((cc, idx) => console.log(`   [Renvoi #${idx + 1}] -> ${cc.text}`));
assert.equal(mockWordDocument[0].text, '(Pièce n°1)');
assert.equal(mockWordDocument[1].text, '(Pièce n°2)');
assert.equal(mockWordDocument[2].text, '(Pièce n°3)');

// 2. PROBLÉMATIQUE 2 : L'avocat s'aperçoit qu'il a oublié le "Courriel de validation", à insérer en n°2 !
console.log('\n⚡ Étape 2 : L\'avocat insère une nouvelle pièce intercalée au n°2...');

const cascadeResult = addPieceWithCascade(pieces, {
    number: 2,
    title: 'Courriel de validation des spécifications',
    date: '12/01/2023',
    id: 'id_courriel'
});

pieces = cascadeResult.updatedPieces;

console.log('   Pièces décalées :', cascadeResult.shiftedPieces);
assert.equal(pieces.length, 4);

// Vérification de la liste ordonnée
assert.equal(pieces[0].id, 'id_contrat');
assert.equal(pieces[0].number, 1);

assert.equal(pieces[1].id, 'id_courriel');
assert.equal(pieces[1].number, 2);

assert.equal(pieces[2].id, 'id_facture');
assert.equal(pieces[2].number, 3); // L'ancienne pièce 2 est devenue 3 !

assert.equal(pieces[3].id, 'id_mise_en_demeure');
assert.equal(pieces[3].number, 4); // L'ancienne pièce 3 est devenue 4 !

// 3. PROBLÉMATIQUE 1 : Mise à jour automatique des ContentControls dans le document Word
console.log('\n🔄 Étape 3 : Synchronisation automatique des renvois dans le corps du texte...');

mockWordDocument.forEach((cc) => {
    const piece = pieces.find(p => p.id === cc.title);
    if (piece) {
        cc.text = formatReferenceText(piece);
    }
});

mockWordDocument.forEach((cc, idx) => console.log(`   [Renvoi #${idx + 1}] -> ${cc.text}`));

// Assertions sur la mise à jour automatique des numéros dans le texte
assert.equal(mockWordDocument[0].text, '(Pièce n°1)'); // Contrat toujours 1
assert.equal(mockWordDocument[1].text, '(Pièce n°3)'); // Facture automatiquement passée de 2 à 3 !
assert.equal(mockWordDocument[2].text, '(Pièce n°4)'); // Mise en demeure automatiquement passée de 3 à 4 !

console.log('\n✅ SUCCÈS : Les renvois dans le texte se sont mis à jour sans intervention manuelle !');

// 4. Génération du bordereau récapitulatif
console.log('\n📋 Étape 4 : Génération du Bordereau récapitulatif...');
const bordereauRows = [
    ['N° Pièce', 'Date', 'Description'],
    ...pieces.map(p => [`Pièce n°${p.number}`, p.date || '-', p.title])
];

console.table(bordereauRows);
assert.equal(bordereauRows.length, 5); // En-tête + 4 pièces
assert.equal(validateRegistry(pieces).isValid, true);

console.log('\n🎉 TOUS LES TESTS DE VALIDATION SONT PASSÉS AVEC SUCCÈS (100% CONFORME AU BESOIN AVOCAT) !\n');
