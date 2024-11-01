let midiAccess;
let output;
const keysContainer = document.getElementById('keys');
const velocityLabel = document.getElementById('velocityLabel');
const transposeLabel = document.getElementById('transposeLabel');
const sustainStatus = document.getElementById('sustainStatus');
const sustainToggle = document.getElementById('sustainToggle');

let velocity = 127; // Default velocity
let transpose = 0; // Default transpose value
let shiftHeld = false; // Track if Shift is held
const activeNotes = new Set(); // Track active notes
const noteSustainActive = new Set(); // Track notes played while sustain is on

// Key mapping to MIDI notes
const keyMapping = {
    '1': 36,  '!': 36,
    '2': 38,  '@': 38,
    '3': 40,  '#': 40,
    '4': 41,  '$': 41,
    '5': 43,  '%': 43,
    '6': 45,  '^': 45,
    '7': 47,  '&': 47,
    '8': 48,  '*': 48,
    '9': 50,  '(': 50,
    '0': 52,  ')': 52,
    'Q': 53,  'W': 55,
    'E': 57,  'R': 59,
    'T': 60,  'Y': 62,
    'U': 64,  'I': 65,
    'O': 67,  'P': 69,
    'A': 71,  'S': 72,
    'D': 74,  'F': 76,
    'G': 77,  'H': 79,
    'J': 81,  'K': 83,
    'L': 84,  'Z': 86,
    'X': 88,  'C': 89,
    'V': 91,  'B': 93,
    'N': 95,  'M': 96
};

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
} else {
    console.log('Web MIDI is not supported in this browser.');
}

function onMIDISuccess(midi) {
    midiAccess = midi;
    const outputs = midiAccess.outputs.values();
    output = outputs.next().value; // Select the first MIDI output
    console.log('MIDI ready:', output);
    createKeys();
}

function onMIDIFailure() {
    console.log('Failed to get MIDI access.');
}

function createKeys() {
    Object.keys(keyMapping).forEach(key => {
        const keyButton = document.createElement('button');
        keyButton.className = 'key';
        keyButton.innerText = key;
        keyButton.onclick = () => playNote(keyMapping[key]);
        keysContainer.appendChild(keyButton);
    });
}

function playNote(note) {
    const finalNote = note + transpose + (shiftHeld ? 1 : 0);
    if (output && !activeNotes.has(finalNote)) {
        output.send([0x90, finalNote, velocity]); // Note on
        activeNotes.add(finalNote);
        if (sustainToggle.checked) {
            noteSustainActive.add(finalNote); // Track note for sustain
        }
        console.log(`Note ON: ${finalNote}`);
    }
}

function stopNote(note) {
    const finalNote = note + transpose + (shiftHeld ? 1 : 0);
    if (output && activeNotes.has(finalNote)) {
        output.send([0x80, finalNote, 0]); // Note off
        activeNotes.delete(finalNote);
        console.log(`Note OFF: ${finalNote}`);
    }
}

function sendSustain(pedal) {
    if (output) {
        output.send([0xB0, 64, pedal]); // Control Change for sustain pedal
        sustainStatus.innerText = pedal === 127 ? 'Sustain is ON' : 'Sustain is OFF';

        if (pedal === 0) { // If sustain is being turned off
            noteSustainActive.forEach(note => stopNote(note)); // Stop relevant notes
            noteSustainActive.clear(); // Clear the active notes set
        }
    }
}

sustainToggle.addEventListener('change', () => {
    sendSustain(sustainToggle.checked ? 127 : 0); // Send sustain ON/OFF
});

let spaceHeld = false; // Track if spacebar is held

document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') {
        shiftHeld = true; // Track if Shift is held
    } else if (event.key === ' ') {
        if (!spaceHeld) {
            spaceHeld = true; // Mark space as held
            sustainToggle.checked = false; // Turn off sustain
            sustainToggle.dispatchEvent(new Event('change')); // Trigger change event
        }
    } else {
        const key = event.key.toUpperCase();
        if (keyMapping[key] !== undefined) {
            playNote(keyMapping[key]); // Play note
        }
    }

    if (event.key === 'ArrowUp') {
        changeTranspose(1); // Transpose up
    } else if (event.key === 'ArrowDown') {
        changeTranspose(-1); // Transpose down
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') {
        shiftHeld = false; // Reset shift status
    } else if (event.key === ' ') {
        spaceHeld = false; // Reset space held status
        sustainToggle.checked = true; // Turn on sustain
        sustainToggle.dispatchEvent(new Event('change')); // Trigger change event
    } else {
        const key = event.key.toUpperCase();
        if (keyMapping[key] !== undefined) {
            stopNote(keyMapping[key]); // Stop note
        }
    }
});

function changeTranspose(amount) {
    transpose += amount;
    transposeLabel.innerText = transpose;
}

// Ensure notes stop when the window loses focus
window.addEventListener('blur', () => {
    activeNotes.forEach(note => stopNote(note));
    noteSustainActive.clear(); // Clear any sustain notes
});
