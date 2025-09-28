/**
 * Text encoding utilities to fix UTF-8 double-encoding issues
 *
 * Common issue: Smart quotes and em dashes from email clients get double-encoded
 * Example: "Ã¢Â€Â'" should be "—" (em dash)
 */

/**
 * Fix double-encoded UTF-8 text commonly found in email subjects
 */
export function fixDoubleEncodedText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Common double-encoded UTF-8 patterns and their fixes
  const doubleEncodingFixes: { [key: string]: string } = {
    // Em dash patterns
    'Ã¢Â€Â"': '—',
    'Ã¢â‚¬â€œ': '—',

    // En dash patterns
    'Ã¢â‚¬â€': '–',

    // Smart quotes
    'Ã¢Â€Âœ': '"',  // Left double quotation mark
    'Ã¢Â€Â': '"',   // Right double quotation mark
    'Ã¢Â€Â˜': "'",   // Left single quotation mark
    'Ã¢Â€Â™': "'",   // Right single quotation mark / apostrophe
    'Ã¢â‚¬Å"': '"',
    'Ã¢â‚¬Â': '"',
    'Ã¢â‚¬Ëœ': "'",
    'Ã¢â‚¬â„¢': "'",

    // Ellipsis
    'Ã¢Â€Â¦': '…',
    'Ã¢â‚¬Â¦': '…',

    // Trademark and copyright
    'Ã‚Â©': '©',
    'Ã¢â€žÂ¢': '™',
    'Ã‚Â®': '®',

    // Common accented characters
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã±': 'ñ',
  };

  let fixedText = text;

  // Apply all double-encoding fixes
  for (const [encoded, decoded] of Object.entries(doubleEncodingFixes)) {
    fixedText = fixedText.replace(new RegExp(encoded, 'g'), decoded);
  }

  return fixedText;
}

/**
 * Clean and normalize email subject lines
 */
export function cleanSubjectLine(subject: string): string {
  if (!subject || typeof subject !== 'string') return subject;

  let cleaned = subject;

  // Fix double-encoding first
  cleaned = fixDoubleEncodedText(cleaned);

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove redundant "Re: Re:" patterns
  cleaned = cleaned.replace(/^(Re:\s*)+/i, 'Re: ');

  return cleaned;
}

/**
 * Safely construct reply subject line
 */
export function createReplySubject(originalSubject: string): string {
  if (!originalSubject || typeof originalSubject !== 'string') {
    return 'Re: (No subject)';
  }

  // Clean the original subject first
  const cleanedSubject = cleanSubjectLine(originalSubject);

  // Add Re: prefix if not already present
  if (!cleanedSubject.toLowerCase().startsWith('re:')) {
    return `Re: ${cleanedSubject}`;
  }

  return cleanedSubject;
}

/**
 * Check if text contains double-encoded UTF-8 characters
 */
export function hasDoubleEncoding(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  // Check for common double-encoding patterns
  const doubleEncodingPatterns = [
    /Ã¢Â€Â[""'—–]/,  // Smart quotes and dashes
    /Ã¢â‚¬[""'—–]/,  // Alternative encoding
    /Ã‚Â[©®]/,        // Copyright/trademark
    /Ã[¡-ÿ]/,        // Accented characters
  ];

  return doubleEncodingPatterns.some(pattern => pattern.test(text));
}

/**
 * Encode text for email headers using RFC 2047 encoded-word format
 * This prevents UTF-8 characters from being corrupted in email subjects
 */
export function encodeEmailHeader(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // First clean any existing double-encoding
  const cleanedText = fixDoubleEncodedText(text);

  // Check if the text contains non-ASCII characters that need encoding
  if (/[\u0080-\uFFFF]/.test(cleanedText)) {
    // Encode using RFC 2047 format: =?UTF-8?B?{base64}?=
    const base64Encoded = Buffer.from(cleanedText, 'utf8').toString('base64');
    return `=?UTF-8?B?${base64Encoded}?=`;
  }

  // Return as-is if only ASCII characters
  return cleanedText;
}

/**
 * Check if text needs RFC 2047 encoding for email headers
 */
export function needsEmailHeaderEncoding(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /[\u0080-\uFFFF]/.test(text);
}