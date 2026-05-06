const KEYWORD_BLACKLIST = [
  "double your money", "investment return", "guaranteed profit",
  "send money to", "transfer ₹", "transfer rs", "pay now to",
  "click here to claim", "you have won", "you are selected",
  "congratulations you", "lucky winner",
  "telegram link", "join telegram", "join whatsapp group",
  "earn from home", "earn daily", "work from home earn",
  "forex trading", "crypto investment", "bitcoin profit",
  "share your account", "otp share", "send otp",
  "i will pay you", "i will send money",
  "verify your account", "your account will be blocked",
  "click the link below", "confirm your details",
  "update your kyc", "urgent action required",
  "follow me on", "subscribe to my", "visit my profile",
  "check my link", "dm me for",
  "part time job", "data entry work",
  "free netflix", "free amazon prime",
  "win iphone", "win smartphone",
];

export function checkCommentKeywords(text: string): {
  blocked: boolean;
  matchedKeyword: string | null;
} {
  const lower = text.toLowerCase();
  for (const kw of KEYWORD_BLACKLIST) {
    if (lower.includes(kw)) {
      return { blocked: true, matchedKeyword: kw };
    }
  }
  return { blocked: false, matchedKeyword: null };
}
