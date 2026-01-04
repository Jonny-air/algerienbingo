// ============================================================================
// Configuration & Data
// ============================================================================

// Google Sheets API URL - Luzi, wenn du das liesst, mach kein Scheiss ;) Bin zu faul das geheim zu halten.
const GOOGLE_SHEET_API = 'https://script.google.com/macros/s/AKfycbzVo7cbezt0yHChCXvoz6t-cy-1mOdH5nigyY6IB6i-HPAOs1da20p2aapOv0vigAfb/exec';

// Random Bingo Items - diese sollten später aus einer .txt Datei geladen werden
const BINGO_ITEMS = [
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen",
    "Wenn du dieses Item siehst, ist etwas schief gelaufen"
];

// ============================================================================
// Core Hash & Random Functions
// ============================================================================

/**
 * Generates SHA-256 hash from a string
 * @param {string} message - Input string to hash
 * @returns {Promise<number[]>} Array of hash bytes
 */
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray;
}

/**
 * Seeded Random Number Generator (Mulberry32 algorithm)
 * @param {number} seed - 32-bit integer seed
 * @returns {Function} Random number generator function (0-1)
 */
function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/**
 * Fisher-Yates shuffle with seeded RNG
 * @param {Array} array - Array to shuffle
 * @param {Function} rng - Random number generator function
 * @returns {Array} Shuffled array copy
 */
function shuffleArray(array, rng) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================================================
// Bingo Sheet Generation
// ============================================================================

/**
 * Generates a deterministic 5x5 Bingo sheet based on player name
 * @param {string} name - Player name (used as seed)
 * @returns {Promise<Array[]>} 5x5 array of cell objects
 */
async function generateBingoSheet(name) {
    // Generate hash from normalized name
    const hashArray = await sha256(name.toLowerCase().trim());
    
    // Convert hash to 32-bit seed
    const seed = hashArray.reduce((acc, val, idx) => {
        return acc + (val << ((idx % 4) * 8));
    }, 0) >>> 0;
    
    // Create seeded RNG and shuffle items
    const rng = mulberry32(seed);
    const shuffled = shuffleArray(BINGO_ITEMS, rng);
    
    // Build 5x5 grid with FREE space in center
    const bingoSheet = [];
    let itemIndex = 0;
    
    for (let row = 0; row < 5; row++) {
        bingoSheet[row] = [];
        for (let col = 0; col < 5; col++) {
            if (row === 2 && col === 2) {
                // Center cell is always FREE
                bingoSheet[row][col] = { text: "FREE", isFree: true };
            } else {
                bingoSheet[row][col] = { 
                    text: shuffled[itemIndex] || `Item ${itemIndex + 1}`, 
                    isFree: false 
                };
                itemIndex++;
            }
        }
    }
    
    return bingoSheet;
}

// ============================================================================
// UI Rendering
// ============================================================================

/**
 * Creates a clickable cell element
 * @param {Object} cell - Cell data {text, isFree}
 * @returns {HTMLDivElement} Cell DOM element
 */
function createCellElement(cell) {
    const cellDiv = document.createElement('div');
    cellDiv.className = cell.isFree ? 'cell free' : 'cell';
    cellDiv.textContent = cell.text;
    
    // Add click handler for non-FREE cells
    if (!cell.isFree) {
        cellDiv.onclick = () => {
            cellDiv.classList.toggle('marked');
        };
    }
    
    return cellDiv;
}

/**
 * Renders the bingo sheet to the DOM
 * @param {string} name - Player name
 * @param {Array[]} sheet - 5x5 bingo sheet data
 */
function renderBingoBoard(name, sheet) {
    const grid = document.getElementById('bingoGrid');
    const board = document.getElementById('bingoBoard');
    const playerName = document.getElementById('playerName');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Clear and update UI
    grid.innerHTML = '';
    playerName.textContent = `Spieler: ${name}`;
    
    // Render all cells
    sheet.forEach(row => {
        row.forEach(cell => {
            grid.appendChild(createCellElement(cell));
        });
    });
    
    // Show board and download button
    board.style.display = 'block';
    downloadBtn.style.display = 'block';
}

// ============================================================================
// Player Tracking
// ============================================================================

/**
 * Tracks player in Google Sheets (only adds if new)
 * @param {string} name - Player name
 */
async function trackPlayer(name) {
    if (!GOOGLE_SHEET_API || GOOGLE_SHEET_API.includes('DEINE_URL_HIER')) {
        console.log('Google Sheets tracking not configured');
        return;
    }
    
    try {
        await fetch(GOOGLE_SHEET_API, {
            method: 'POST',
            mode: 'no-cors', // Important for Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name
            })
        });
        
        console.log('Player tracked:', name);
    } catch (error) {
        console.warn('Could not track player:', error);
    }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Main function to generate and display bingo sheet
 */
async function generateBingo() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Bitte gib deinen Vornamen ein!');
        return;
    }
    
    // Track player
    trackPlayer(name);
    
    const sheet = await generateBingoSheet(name);
    renderBingoBoard(name, sheet);
}

/**
 * Generates and downloads PDF of current bingo sheet
 */
async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const name = document.getElementById('nameInput').value.trim();
    const sheet = await generateBingoSheet(name);
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('BINGO', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Spieler: ${name}`, 105, 30, { align: 'center' });
    
    // Draw grid
    const startX = 20;
    const startY = 50;
    const cellSize = 34;
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const x = startX + col * cellSize;
            const y = startY + row * cellSize;
            const cell = sheet[row][col];
            
            // Draw cell border
            doc.rect(x, y, cellSize, cellSize);
            
            // Fill FREE cell
            if (cell.isFree) {
                doc.setFillColor(102, 126, 234);
                doc.rect(x, y, cellSize, cellSize, 'F');
                doc.setTextColor(255, 255, 255);
            }
            
            // Add text
            doc.setFontSize(cell.isFree ? 12 : 8);
            const lines = doc.splitTextToSize(cell.text, cellSize - 4);
            const textY = y + cellSize / 2 + (lines.length * 2);
            doc.text(lines, x + cellSize / 2, textY, { 
                align: 'center',
                baseline: 'middle'
            });
            
            // Reset colors
            if (cell.isFree) {
                doc.setTextColor(0, 0, 0);
            }
        }
    }
    
    doc.save(`Bingo_${name}.pdf`);
}

// ============================================================================
// Event Listeners
// ============================================================================

// Allow Enter key to generate bingo
document.getElementById('nameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        generateBingo();
    }
});

// ============================================================================
// Optional: Load items from external file
// ============================================================================

/**
 * Loads bingo items from a text file
 * Uncomment this section to load items from items.txt
 */
async function loadBingoItems() {
    try {
        const response = await fetch('items.txt');
        const text = await response.text();
        const items = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (items.length > 0) {
            BINGO_ITEMS.length = 0;
            BINGO_ITEMS.push(...items);
        }
    } catch (error) {
        console.warn('Could not load items.txt, using default items:', error);
    }
}

// Load items when page loads
loadBingoItems();