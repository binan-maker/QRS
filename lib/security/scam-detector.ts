/**
 * QR Code Scam Detector
 * 
 * Detects common scam patterns in QR codes including:
 * - Payment fraud (fake UPI, PayPal, bank transfers)
 * - Phone scams (premium rate numbers, fake support)
 * - Messaging scams (fake WhatsApp, Telegram verification)
 * - Urgency-based phishing ("account suspended", "verify now")
 * - Fake brand impersonation
 */

export interface ScamDetectionResult {
  isScamLikely: boolean;
  confidence: number; // 0-100
  scamType: string | null;
  warnings: string[];
  details: {
    paymentRelated?: boolean;
    phoneRelated?: boolean;
    messagingRelated?: boolean;
    urgencyDetected?: boolean;
    brandImpersonation?: string | null;
    suspiciousKeywords?: string[];
  };
}

// Keywords indicating payment requests
const PAYMENT_KEYWORDS = [
  'pay', 'payment', 'upi', 'gpay', 'phonepe', 'paytm', 'amazon pay',
  'bank transfer', 'wire transfer', 'send money', 'receive payment',
  'paypal.me', 'paypal.com/pay', 'cashapp', 'venmo', 'zelle',
  'bitcoin', 'crypto', 'wallet', 'invoice', 'bill', 'fee',
  'reward', 'claim', 'prize', 'lottery', 'winner'
];

// Patterns for UPI IDs and payment links
const UPI_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
const PAYPAL_ME_PATTERN = /paypal\.me\/[a-zA-Z0-9_]+/i;
const CRYPTO_ADDRESS_PATTERN = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/;

// Premium rate and suspicious phone number patterns
const PHONE_SCAM_PATTERNS = [
  /^\+?[0-9]{1,4}[-.\s]?[89][0-9]{2,3}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{4}$/, // Premium rate pattern
  /^1-800-[0-9]{3}-[0-9]{4}$/, // Fake toll-free
  /^00[0-9]{9,15}$/, // International format abuse
];

// Common scam phone country codes
const HIGH_RISK_COUNTRY_CODES = ['+234', '+254', '+233', '+62', '+92', '+7'];

// Messaging app scam patterns
const MESSAGING_KEYWORDS = [
  'whatsapp', 'telegram', 'signal', 'wechat', 'line', 'viber',
  'verify', 'verification code', 'otp', 'confirm', 'activate',
  'join group', 'add contact', 'message us', 'chat support'
];

// Urgency and fear tactics
const URGENCY_KEYWORDS = [
  'urgent', 'immediate', 'expire', 'suspended', 'locked', 'disabled',
  'terminated', 'fraud', 'unauthorized', 'suspicious', 'alert',
  'action required', 'verify now', 'update now', 'confirm immediately',
  'last chance', 'final notice', 'account closed', 'legal action',
  'police', 'arrest', 'warrant', 'court', 'fine', 'penalty'
];

// Brand names commonly impersonated
const IMPERSONATED_BRANDS = [
  'Amazon', 'PayPal', 'Microsoft', 'Apple', 'Google', 'Netflix',
  'Bank of America', 'Chase', 'Wells Fargo', 'IRS', 'Social Security',
  'FedEx', 'UPS', 'DHL', 'WhatsApp', 'Telegram', 'Instagram',
  'Facebook', 'LinkedIn', 'Dropbox', 'Adobe', 'DocuSign'
];

// Fake support/scam URL patterns
const FAKE_SUPPORT_PATTERNS = [
  /support\.[a-z]+-[a-z]+\.com/i, // support-brand-something.com
  /help\.[a-z]+[0-9]+\.com/i, // help with numbers
  /secure\./i, // secure.something
  /verify\./i, // verify.something
  /account-.*update/i, // account-update-xyz
  /login-.*verify/i, // login-verify-xyz
];

export function detectScam(content: string): ScamDetectionResult {
  const result: ScamDetectionResult = {
    isScamLikely: false,
    confidence: 0,
    scamType: null,
    warnings: [],
    details: {
      suspiciousKeywords: []
    }
  };

  const lowerContent = content.toLowerCase();
  let confidenceScore = 0;
  const warnings: string[] = [];
  const suspiciousKeywords: string[] = [];

  // === 1. PAYMENT FRAUD DETECTION ===
  const hasPaymentKeyword = PAYMENT_KEYWORDS.some(keyword => 
    lowerContent.includes(keyword)
  );
  
  if (hasPaymentKeyword) {
    result.details.paymentRelated = true;
    confidenceScore += 15;
    
    // Check for UPI ID pattern
    if (UPI_PATTERN.test(content.trim())) {
      confidenceScore += 20;
      warnings.push('Contains a UPI payment address - verify recipient before sending money');
      suspiciousKeywords.push('upi-address');
      result.scamType = 'payment-fraud';
    }
    
    // Check for PayPal.me links
    if (PAYPAL_ME_PATTERN.test(content)) {
      confidenceScore += 15;
      warnings.push('PayPal.me link detected - ensure you trust the recipient');
      suspiciousKeywords.push('paypal-me');
    }
    
    // Check for crypto addresses
    if (CRYPTO_ADDRESS_PATTERN.test(content.trim())) {
      confidenceScore += 25;
      warnings.push('Cryptocurrency wallet address detected - transactions cannot be reversed');
      suspiciousKeywords.push('crypto-address');
      result.scamType = 'crypto-scam';
    }
    
    // Payment keywords + urgency = high risk
    const hasUrgency = URGENCY_KEYWORDS.some(k => lowerContent.includes(k));
    if (hasUrgency && hasPaymentKeyword) {
      confidenceScore += 30;
      warnings.push('Payment request combined with urgency - classic scam tactic');
      result.scamType = 'payment-phishing';
    }
  }

  // === 2. PHONE SCAM DETECTION ===
  const phonePatternMatch = PHONE_SCAM_PATTERNS.some(pattern => 
    pattern.test(content.trim())
  );
  
  const hasHighRiskCountryCode = HIGH_RISK_COUNTRY_CODES.some(code => 
    content.startsWith(code) || content.includes(code)
  );
  
  if (phonePatternMatch || hasHighRiskCountryCode) {
    result.details.phoneRelated = true;
    confidenceScore += 20;
    warnings.push('Phone number detected - be cautious of premium rate or international scams');
    suspiciousKeywords.push('suspicious-phone');
    
    if (hasHighRiskCountryCode) {
      confidenceScore += 15;
      warnings.push('Number from a country commonly associated with phone scams');
      result.scamType = 'phone-scam';
    }
  }

  // === 3. MESSAGING APP SCAM DETECTION ===
  const hasMessagingKeyword = MESSAGING_KEYWORDS.some(keyword => 
    lowerContent.includes(keyword)
  );
  
  if (hasMessagingKeyword) {
    result.details.messagingRelated = true;
    confidenceScore += 10;
    
    // Messaging + verification = likely scam
    const hasVerification = ['verify', 'verification', 'otp', 'code'].some(k => 
      lowerContent.includes(k)
    );
    
    if (hasVerification) {
      confidenceScore += 25;
      warnings.push('Messaging app verification request - never share OTP codes');
      suspiciousKeywords.push('messaging-verification');
      result.scamType = 'messaging-scam';
    }
    
    // Check for fake WhatsApp/Telegram links
    if (lowerContent.includes('whatsapp') && !content.includes('whatsapp.com')) {
      confidenceScore += 20;
      warnings.push('Suspicious WhatsApp-related link - may be impersonation');
      suspiciousKeywords.push('fake-whatsapp');
    }
  }

  // === 4. URGENCY AND FEAR TACTICS ===
  const urgencyCount = URGENCY_KEYWORDS.filter(k => lowerContent.includes(k)).length;
  
  if (urgencyCount > 0) {
    result.details.urgencyDetected = true;
    confidenceScore += Math.min(urgencyCount * 10, 30);
    warnings.push(`Uses urgency/fear tactics (${urgencyCount} indicators) - common in phishing`);
    suspiciousKeywords.push('urgency-tactics');
    
    if (!result.scamType) {
      result.scamType = 'phishing';
    }
  }

  // === 5. BRAND IMPERSONATION ===
  for (const brand of IMPERSONATED_BRANDS) {
    const brandLower = brand.toLowerCase();
    if (lowerContent.includes(brandLower)) {
      // Check if it's NOT from official domain
      const officialDomains = getOfficialDomain(brandLower);
      const isFromOfficial = officialDomains.some(domain => 
        content.includes(domain)
      );
      
      if (!isFromOfficial) {
        confidenceScore += 25;
        result.details.brandImpersonation = brand;
        warnings.push(`Mentions "${brand}" but not from official source`);
        suspiciousKeywords.push('brand-impersonation');
        
        if (!result.scamType) {
          result.scamType = 'brand-impersonation';
        }
        break;
      }
    }
  }

  // === 6. FAKE SUPPORT URL PATTERNS ===
  const hasFakeSupportPattern = FAKE_SUPPORT_PATTERNS.some(pattern => 
    pattern.test(content)
  );
  
  if (hasFakeSupportPattern) {
    confidenceScore += 30;
    warnings.push('URL matches known fake support site patterns');
    suspiciousKeywords.push('fake-support');
    result.scamType = 'tech-support-scam';
  }

  // === 7. COMBINED RISK FACTORS ===
  // Multiple risk factors = exponentially higher risk
  const riskFactorCount = [
    result.details.paymentRelated,
    result.details.phoneRelated,
    result.details.messagingRelated,
    result.details.urgencyDetected,
    result.details.brandImpersonation !== null
  ].filter(Boolean).length;
  
  if (riskFactorCount >= 3) {
    confidenceScore += 25;
    warnings.push('Multiple scam indicators detected - extremely high risk');
  } else if (riskFactorCount === 2) {
    confidenceScore += 15;
    warnings.push('Multiple risk factors present - proceed with extreme caution');
  }

  // === FINAL ASSESSMENT ===
  result.confidence = Math.min(confidenceScore, 100);
  result.warnings = warnings;
  result.details.suspiciousKeywords = suspiciousKeywords;
  
  // Threshold for marking as likely scam
  result.isScamLikely = result.confidence >= 50;
  
  return result;
}

function getOfficialDomain(brandLower: string): string[] {
  const brandDomains: Record<string, string[]> = {
    'amazon': ['amazon.com', 'amazon.in', 'aws.amazon.com'],
    'paypal': ['paypal.com', 'paypal.me'],
    'microsoft': ['microsoft.com', 'office.com', 'live.com'],
    'apple': ['apple.com', 'icloud.com'],
    'google': ['google.com', 'gmail.com', 'youtube.com'],
    'netflix': ['netflix.com'],
    'whatsapp': ['whatsapp.com', 'wa.me'],
    'telegram': ['telegram.org', 't.me'],
    'facebook': ['facebook.com', 'fb.com', 'messenger.com'],
    'instagram': ['instagram.com'],
    'linkedin': ['linkedin.com'],
    'fedex': ['fedex.com'],
    'ups': ['ups.com'],
    'dhl': ['dhl.com'],
  };
  
  return brandDomains[brandLower] || [];
}

export function getScamTypeLabel(scamType: string | null): string {
  if (!scamType) return 'No Scam Detected';
  
  const labels: Record<string, string> = {
    'payment-fraud': 'Payment Fraud',
    'crypto-scam': 'Cryptocurrency Scam',
    'payment-phishing': 'Payment Phishing',
    'phone-scam': 'Phone Scam',
    'messaging-scam': 'Messaging App Scam',
    'phishing': 'Phishing Attempt',
    'brand-impersonation': 'Brand Impersonation',
    'tech-support-scam': 'Tech Support Scam',
  };
  
  return labels[scamType] || 'Potential Scam';
}

export function getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' | 'very-high' {
  if (confidence >= 75) return 'very-high';
  if (confidence >= 50) return 'high';
  if (confidence >= 25) return 'medium';
  return 'low';
}
