/**
 * Advanced URL Security Analyzer
 * 
 * Provides comprehensive URL analysis including:
 * - Typosquatting detection for popular brands
 * - Suspicious TLD analysis
 * - Contextual risk scoring (0-100)
 * - Homograph attack detection
 * - URL structure analysis
 */

export interface UrlAnalysisResult {
  isValid: boolean;
  isUrl: boolean;
  riskScore: number; // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  details: {
    protocol?: string;
    domain?: string;
    subdomain?: string;
    tld?: string;
    isHttp?: boolean;
    isIpAddress?: boolean;
    isShortened?: boolean;
    hasSuspiciousTLD?: boolean;
    typosquatMatch?: string;
    homographDetected?: boolean;
    suspiciousPatterns?: string[];
  };
}

// Popular brands commonly targeted by typosquatters
const BRAND_DOMAINS = [
  'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com',
  'paypal.com', 'amazon.com', 'apple.com', 'microsoft.com', 'netflix.com',
  'dropbox.com', 'github.com', 'gitlab.com', 'stackoverflow.com',
  'bankofamerica.com', 'chase.com', 'wellsfargo.com', 'citibank.com',
  'icici.com', 'hdfcbank.com', 'sbi.co.in', 'axisbank.com',
  'whatsapp.com', 'telegram.org', 'signal.org', 'zoom.us',
  'office365.com', 'outlook.com', 'gmail.com', 'yahoo.com',
  'adobe.com', 'salesforce.com', 'slack.com', 'discord.com'
];

// Common typosquatting patterns
const TYPOSQUAT_PATTERNS: Record<string, string[]> = {
  'google.com': ['gooogle.com', 'googel.com', 'gogle.com', 'go0gle.com', 'googlee.com'],
  'paypal.com': ['paypai.com', 'paypa1.com', 'paypall.com', 'pyapal.com', 'paypal.com'],
  'amazon.com': ['arnazon.com', 'amazcn.com', 'amaz0n.com', 'amaozn.com'],
  'apple.com': ['app1e.com', 'appe.com', 'appl3.com', 'appple.com'],
  'microsoft.com': ['microsft.com', 'micros0ft.com', 'microsofte.com'],
  'netflix.com': ['netfliix.com', 'netflx.com', 'netfllix.com', 'netfflix.com'],
  'whatsapp.com': ['whatsaap.com', 'whatsapps.com', 'whatssapp.com', 'whatsap.com'],
};

// Suspicious TLDs often used in phishing
const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.club', '.work', '.click', '.link', '.gq', '.ml', '.cf', '.tk', '.ga',
  '.pw', '.cc', '.su', '.ws', '.info', '.biz', '.online', '.site', '.website', '.space'
];

// URL shorteners that could hide destination
const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly',
  'adf.ly', 'j.mp', 'short.link', 'rebrand.ly', 'cutt.ly'
];

// Detect homoglyph/IDN homograph attacks
const CYRILLIC_LOOKALIKES: Record<string, string> = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
  'А': 'A', 'Е': 'E', 'О': 'O', 'Р': 'P', 'С': 'C', 'У': 'Y', 'Х': 'X'
};

export function analyzeUrl(content: string): UrlAnalysisResult {
  const result: UrlAnalysisResult = {
    isValid: true,
    isUrl: false,
    riskScore: 0,
    riskLevel: 'safe',
    warnings: [],
    details: {}
  };

  const trimmedContent = content.trim();
  
  // Check if it's a URL
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i;
  const fullUrlPattern = /^https?:\/\/[^\s]+$/i;
  
  if (!urlPattern.test(trimmedContent) && !fullUrlPattern.test(trimmedContent)) {
    return result;
  }

  result.isUrl = true;
  
  try {
    // Normalize URL
    let normalizedUrl = trimmedContent;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    const url = new URL(normalizedUrl);
    const hostname = url.hostname.toLowerCase();
    
    result.details.protocol = url.protocol;
    result.details.domain = hostname;
    result.details.isHttp = url.protocol === 'http:';
    
    // Extract domain parts
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      result.details.tld = '.' + parts[parts.length - 1];
      result.details.domain = parts.slice(-2).join('.');
      if (parts.length > 2) {
        result.details.subdomain = parts.slice(0, -2).join('.');
      }
    }
    
    // Check for IP address
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    result.details.isIpAddress = ipPattern.test(hostname);
    
    // Check for URL shorteners
    result.details.isShortened = URL_SHORTENERS.some(shortener => 
      hostname.includes(shortener)
    );
    
    // === RISK SCORING ===
    let riskScore = 0;
    const warnings: string[] = [];
    const suspiciousPatterns: string[] = [];
    
    // 1. HTTP without HTTPS (+20 points)
    if (result.details.isHttp) {
      riskScore += 20;
      warnings.push('Uses unencrypted HTTP connection');
      suspiciousPatterns.push('insecure-protocol');
    }
    
    // 2. IP address instead of domain (+25 points)
    if (result.details.isIpAddress) {
      riskScore += 25;
      warnings.push('Uses IP address instead of domain name');
      suspiciousPatterns.push('ip-address');
    }
    
    // 3. Suspicious TLD (+15 points)
    if (result.details.tld && SUSPICIOUS_TLDS.includes(result.details.tld.toLowerCase())) {
      riskScore += 15;
      result.details.hasSuspiciousTLD = true;
      warnings.push(`Uses suspicious top-level domain: ${result.details.tld}`);
      suspiciousPatterns.push('suspicious-tld');
    }
    
    // 4. URL shortener (+10 points)
    if (result.details.isShortened) {
      riskScore += 10;
      warnings.push('Uses URL shortener - destination is hidden');
      suspiciousPatterns.push('url-shortener');
    }
    
    // 5. Typosquatting detection (+40 points)
    const typosquatMatch = detectTyposquatting(hostname);
    if (typosquatMatch) {
      riskScore += 40;
      result.details.typosquatMatch = typosquatMatch;
      warnings.push(`Possible impersonation of ${typosquatMatch}`);
      suspiciousPatterns.push('typosquatting');
    }
    
    // 6. Homograph attack detection (+35 points)
    const hasHomograph = detectHomographAttack(hostname);
    if (hasHomograph) {
      riskScore += 35;
      result.details.homographDetected = true;
      warnings.push('Contains characters that look similar to Latin letters (possible homograph attack)');
      suspiciousPatterns.push('homograph-attack');
    }
    
    // 7. Excessive subdomains (+10 points)
    if (result.details.subdomain && result.details.subdomain.split('.').length > 2) {
      riskScore += 10;
      warnings.push('Multiple subdomains detected - unusual structure');
      suspiciousPatterns.push('excessive-subdomains');
    }
    
    // 8. Long domain name (+5 points)
    if (hostname.length > 50) {
      riskScore += 5;
      warnings.push('Unusually long domain name');
      suspiciousPatterns.push('long-domain');
    }
    
    // 9. Numbers in brand-like domains (+15 points)
    const hasNumbersInDomain = /\d/.test(parts[parts.length - 2] || '');
    const looksLikeBrand = BRAND_DOMAINS.some(brand => {
      const brandBase = brand.split('.')[0];
      return hostname.includes(brandBase) && hasNumbersInDomain;
    });
    
    if (looksLikeBrand) {
      riskScore += 15;
      warnings.push('Domain name contains numbers in brand-like context');
      suspiciousPatterns.push('brand-impersonation');
    }
    
    // 10. Hyphen in domain (+8 points)
    if (hostname.includes('-') && !hostname.startsWith('www.')) {
      const domainWithoutTld = parts.slice(0, -1).join('.');
      if (domainWithoutTld.includes('-')) {
        riskScore += 8;
        warnings.push('Domain contains hyphens - common in phishing sites');
        suspiciousPatterns.push('hyphenated-domain');
      }
    }
    
    result.riskScore = Math.min(riskScore, 100);
    result.warnings = warnings;
    result.details.suspiciousPatterns = suspiciousPatterns;
    
    // Determine risk level
    if (result.riskScore >= 70) {
      result.riskLevel = 'critical';
    } else if (result.riskScore >= 50) {
      result.riskLevel = 'high';
    } else if (result.riskScore >= 30) {
      result.riskLevel = 'medium';
    } else if (result.riskScore >= 15) {
      result.riskLevel = 'low';
    } else {
      result.riskLevel = 'safe';
    }
    
  } catch (error) {
    result.isValid = false;
    result.warnings.push('Invalid URL format');
  }
  
  return result;
}

function detectTyposquatting(hostname: string): string | null {
  // Direct match against known typosquat patterns
  for (const [brand, typos] of Object.entries(TYPOSQUAT_PATTERNS)) {
    if (typos.includes(hostname)) {
      return brand;
    }
  }
  
  // Fuzzy matching - check similarity to brand domains
  for (const brand of BRAND_DOMAINS) {
    if (hostname === brand) continue; // Exact match is fine
    
    const similarity = levenshteinDistance(hostname, brand);
    const maxLen = Math.max(hostname.length, brand.length);
    const similarityRatio = 1 - (similarity / maxLen);
    
    // If very similar (>= 85%) but not exact, likely typosquatting
    if (similarityRatio >= 0.85 && similarity <= 2) {
      return brand;
    }
  }
  
  return null;
}

function detectHomographAttack(hostname: string): boolean {
  for (const char of hostname) {
    if (CYRILLIC_LOOKALIKES.hasOwnProperty(char)) {
      return true;
    }
  }
  return false;
}

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'safe': return '#10B981'; // green
    case 'low': return '#84CC16'; // lime
    case 'medium': return '#F59E0B'; // amber
    case 'high': return '#F97316'; // orange
    case 'critical': return '#EF4444'; // red
    default: return '#6B7280'; // gray
  }
}

export function getRiskLevelLabel(riskScore: number): string {
  if (riskScore >= 70) return 'Critical Risk';
  if (riskScore >= 50) return 'High Risk';
  if (riskScore >= 30) return 'Medium Risk';
  if (riskScore >= 15) return 'Low Risk';
  return 'Safe';
}
