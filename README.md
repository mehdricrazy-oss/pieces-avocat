# Add-in Word : Gestionnaire de Pièces Juridiques et Bordereau Automatisé

Prototype fonctionnel (MVP) d'Add-in Microsoft Word conçu pour les cabinets d'avocats.
Il résout automatiquement les deux défis majeurs de la rédaction de conclusions :
1. **Mise à jour automatique des numéros de pièces** dans le corps du texte via les Contrôles de Contenu (`Word.ContentControl`).
2. **Décalage en cascade automatique** en cas d'insertion d'une nouvelle pièce intercalée (ex: insérer une nouvelle pièce n°2 décale l'ancienne 2 en 3, la 3 en 4, etc., à la fois dans le texte et dans le bordereau).
3. **Génération et mise à jour dynamique du Bordereau récapitulatif** sous forme de tableau Word officiel.

---

## 📁 Structure du Projet

```text
├── manifest.xml                 # Déclaration officielle du complément Word (Office.js)
├── package.json                 # Scripts de test, build et serveur local
├── server.js                    # Serveur de développement local (HTTP/HTTPS)
├── create-icons.js              # Générateur des icônes pour le ruban Word
├── test-simulation.js           # Simulation E2E du scénario avocat
├── assets/                      # Icônes pour Word (16x16, 32x32, 80x80)
└── src/
    ├── core/
    │   ├── piecesManager.js     # Moteur métier pur (insertion, cascade, suppression, tri)
    │   ├── piecesManager.ts     # Typages TypeScript stricts
    │   └── piecesManager.test.ts# Suite de tests unitaires (Node native runner)
    └── taskpane/
        ├── taskpane.html        # Volet latéral et simulateur de document intégré
        ├── taskpane.css         # Styles Fluent UI / Office
        └── taskpane.js          # Intégration Word API (Word.run, contentControls, settings)
```

---

## ⚡ Exécution des Tests

Les tests unitaires et la simulation de flux juridique s'exécutent directement sans dépendances tierces :

```bash
npm test
```

Résultats testés et validés :
- ✔ Ajout de pièces au fil de l'eau
- ✔ **Décalage en cascade lors de l'insertion au milieu** (ex: insertion au n°3)
- ✔ Insertion au tout premier rang (n°1)
- ✔ Suppression d'une pièce avec résorption des trous (décalage inverse)
- ✔ Déplacement / réordonnancement (monter / descendre)
- ✔ Formats de renvois (`(Pièce n°X)`, `[Pièce n°X]`, `[Pièce n°X : Intitulé]`)
- ✔ Validation de l'intégrité et détection des ruptures de séquence

---

## 🌐 Test Immédiat dans le Navigateur (Mode Simulation)

Pour tester immédiatement l'interface et le comportement en cascade sans ouvrir Word :

1. Démarrez le serveur local :
   ```bash
   npm start
   ```
2. Ouvrez votre navigateur sur : [http://localhost:3000](http://localhost:3000)
3. Vous disposez d'un volet latéral interactif et d'une fausse page de conclusions Word :
   - Insérez une nouvelle pièce au n°2 : observez les pièces suivantes dans le texte passer immédiatement de (Pièce n°2) à (Pièce n°3).
   - Cliquez sur **Insérer** pour placer un renvoi à l'endroit du curseur.
   - Cliquez sur **Générer le Bordereau** pour créer le tableau récapitulatif.

---

## 🖥️ Installation et Test sur Microsoft Word (Office 365)

### Option A : Sur Word 365 Web (Recommandé pour tester en 1 minute)
1. Démarrez le serveur local : `npm start`
2. Ouvrez [Word Online sur office.com](https://www.office.com) dans votre navigateur.
3. Créez un document vierge.
4. Dans le ruban supérieur, cliquez sur **Insertion** > **Compléments** (ou l'icône de grille d'applications).
5. Cliquez sur **Gérer mes compléments** > **Téléverser mon complément** (*Upload My Add-in*).
6. Sélectionnez le fichier `manifest.xml` situé à la racine du projet.
7. Le bouton apparaît et le volet latéral s'ouvre !

### Option B : Sur Word Version Bureau (Windows)
1. Partagez le dossier du projet en lecture réseau local (Clic droit sur le dossier > *Propriétés* > *Partage*).
2. Dans Word Desktop, allez dans **Fichier** > **Options** > **Centre de gestion de la confidentialité** > **Paramètres du Centre...** > **Catalogues de compléments approuvés**.
3. Renseignez le chemin réseau (ex: `\\localhost\amazing-raman`) et cochez *Afficher dans le menu*.
4. Redémarrez Word, puis allez dans **Insertion** > **Mes compléments** > **Dossier partagé** pour activer le complément.
