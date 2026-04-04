/**
 * PROFANITY FILTER SERVICE
 * 
 * Security Fix P1: Comment Profanity Filter
 * Risk: Legal liability under DPDP Act 2023
 * 
 * Filters offensive language, hate speech, and inappropriate content
 * in user-generated comments and QR code content.
 */

// Comprehensive list of profanity patterns (English + common variations)
const PROFANITY_PATTERNS: { pattern: RegExp; severity: 'mild' | 'moderate' | 'severe'; category: string }[] = [
  // Severe - Hate speech, slurs
  { pattern: /\b(nigga|nigger)\b/gi, severity: 'severe', category: 'hate_speech' },
  { pattern: /\b(fag|faggot|queer)\b/gi, severity: 'severe', category: 'hate_speech' },
  { pattern: /\b(racist|slant-eye)\b/gi, severity: 'severe', category: 'hate_speech' },
  
  // Severe - Threats
  { pattern: /\b(kill\s+you|murder|death\s+to|die\b)/gi, severity: 'severe', category: 'threats' },
  { pattern: /\b(rape|rapist)\b/gi, severity: 'severe', category: 'threats' },
  
  // Moderate - Strong profanity
  { pattern: /\b(fuck|fucker|fucking|fucked)\b/gi, severity: 'moderate', category: 'profanity' },
  { pattern: /\b(shit|shitty)\b/gi, severity: 'moderate', category: 'profanity' },
  { pattern: /\b(bitch|bitches)\b/gi, severity: 'moderate', category: 'profanity' },
  { pattern: /\b(damn|dammit)\b/gi, severity: 'moderate', category: 'profanity' },
  { pattern: /\b(hell\b)/gi, severity: 'moderate', category: 'profanity' },
  
  // Mild - Offensive terms
  { pattern: /\b(stupid|idiot|dumb|asshole|bastard)\b/gi, severity: 'mild', category: 'offensive' },
  { pattern: /\b(piss|pissed)\b/gi, severity: 'mild', category: 'offensive' },
  
  // Sexual content
  { pattern: /\b(porn|sex|xxx|nude|naked)\b/gi, severity: 'moderate', category: 'sexual' },
  
  // Spam/Scam indicators
  { pattern: /\b(click\s+here|free\s+money|win\s+now|claim\s+prize)\b/gi, severity: 'mild', category: 'spam' },
];

// Hindi/Hinglish profanity patterns
const HINDI_PROFANITY: { pattern: RegExp; severity: 'mild' | 'moderate' | 'severe'; category: string }[] = [
  { pattern: /\b(गांड|चूत|लौड़ा|बहनचोद|मादरचोद)\b/gi, severity: 'severe', category: 'profanity' },
  { pattern: /\b(bc|mc|bsdk|chutiya)\b/gi, severity: 'moderate', category: 'profanity' },
];

export interface ProfanityCheckResult {
  isBlocked: boolean;
  matchedWords: string[];
  categories: string[];
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  sanitizedText?: string;
}

/**
 * Check text for profanity and inappropriate content
 */
export function checkProfanity(text: string): ProfanityCheckResult {
  if (!text || typeof text !== 'string') {
    return { isBlocked: false, matchedWords: [], categories: [], severity: 'none' };
  }

  const matchedWords: string[] = [];
  const categories = new Set<string>();
  let maxSeverity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
  let sanitizedText = text;

  const allPatterns = [...PROFANITY_PATTERNS, ...HINDI_PROFANITY];

  for (const { pattern, severity, category } of allPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      matchedWords.push(...matches.map(m => m.toLowerCase()));
      categories.add(category);
      
      // Update max severity
      if (severity === 'severe') maxSeverity = 'severe';
      else if (severity === 'moderate' && maxSeverity !== 'severe') maxSeverity = 'moderate';
      else if (severity === 'mild' && maxSeverity === 'none') maxSeverity = 'mild';
      
      // Sanitize by replacing with asterisks
      sanitizedText = sanitizedText.replace(pattern, (match) => '*'.repeat(match.length));
    }
  }

  // Remove duplicates
  const uniqueWords = Array.from(new Set(matchedWords));
  
  // Block if severe or moderate profanity found
  const isBlocked = maxSeverity === 'severe' || maxSeverity === 'moderate';

  return {
    isBlocked,
    matchedWords: uniqueWords,
    categories: Array.from(categories),
    severity: maxSeverity,
    sanitizedText: isBlocked ? undefined : sanitizedText,
  };
}

/**
 * Validate QR code input content for safety
 * This prevents XSS attacks via malicious QR codes
 */
export function validateQrInput(content: string): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Invalid QR code content' };
  }

  // Check for extremely long content (potential DoS)
  if (content.length > 10000) {
    return { valid: false, error: 'QR code content too long' };
  }

  // Check for script injection attempts (XSS prevention)
  const scriptPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,  // onclick=, onerror=, etc.
    /data:text\/html/i,
    /vbscript:/i,
  ];

  for (const pattern of scriptPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: 'Potentially malicious content detected' };
    }
  }

  // Check for profanity in QR content
  const profanityCheck = checkProfanity(content);
  if (profanityCheck.isBlocked) {
    return { 
      valid: false, 
      error: `Inappropriate content detected: ${profanityCheck.categories.join(', ')}` 
    };
  }

  return { valid: true };
}

/**
 * Sanitize comment text before display
 * Removes potentially harmful HTML/script content
 */
export function sanitizeComment(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Basic HTML entity encoding to prevent XSS
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
