// A basic list of common English profanity and highly toxic terms.
// This list is not exhaustive and can be expanded as needed.
const badWords = [
    "bitch", "bitches", "bitchy", // b-words
    "fuck", "fucker", "fucking", "fucks", "motherfucker", "motherfucking", // f-words
    "shit", "shitty", "shits", "bullshit", "horseshit", // s-words
    "cunt", "cunts", // c-words
    "asshole", "assholes", "dumbass", "jackass", // a-words
    "dick", "dicks", "dickhead", // d-words
    "pussy", "pussies", // p-words
    "whore", "slut", "skank", // w/s-words
    "bastard", "bastards", // b-words
    "faggot", "fag", "dyke", "tranny", // slurs
    "nigger", "nigga", "spic", "chink", "gook", "kike", // racial slurs
    "kill yourself", "kys", "die", "suicide", // severe toxicity/self-harm
    "rape", "pedophile", "pedo" // severe crimes/toxicity
];

/**
 * Checks if a given text contains any common profanity or highly toxic terms.
 * It uses word boundaries to avoid catching substrings (e.g., "assessment" won't trigger "ass").
 *
 * @param {string} text - The input text to check.
 * @returns {boolean} True if the text contains profanity, false otherwise.
 */
export const containsProfanity = (text) => {
    if (!text) return false;

    // Convert to lowercase to ensure case-insensitive matching
    const lowerText = text.toLowerCase();

    for (let word of badWords) {
        // Use word boundary (\b) to only match whole words
        // We escape the word to safely use it in a regex.
        const regex = new RegExp(`\\b${word}\\b`, 'i');

        if (regex.test(lowerText)) {
            return true;
        }

        // Specific check for phrase-based toxicity like "kill yourself"
        // Sometimes spaces are removed or manipulated, but this handles standard forms.
        if (word.includes(" ") && lowerText.includes(word)) {
            return true;
        }
    }

    return false;
};
