export function formatFirstName(name: string): string {
  if (!name) return "";
  let clean = name.trim();
  if (!clean) return "";

  // If name contains an email address (e.g. current users with email as displayName)
  if (clean.includes("@")) {
    clean = clean.split("@")[0].replace(/[._-]/g, " ").trim();
  }

  // Split into tokens by whitespace
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  // Helper: detect if a token is an initial or abbreviation
  // Examples: "H", "K", "A.", "H.", "K.", "H.K.", "A.B."
  const isInitial = (token: string) => {
    const stripped = token.replace(/[^a-zA-Z0-9]/g, "");
    return stripped.length <= 1 || /^([a-zA-Z]\.)+[a-zA-Z]?$/.test(token);
  };

  // Find the first token that is an actual name (not an initial)
  // For "H K Hameed", tokens are ["H", "K", "Hameed"] -> chooses "Hameed"
  // For "Ismail Aboobacker", tokens are ["Ismail", "Aboobacker"] -> chooses "Ismail"
  const substantiveName = tokens.find((t) => !isInitial(t));

  let chosen = substantiveName || tokens[0];

  // Clean edge punctuation
  chosen = chosen.replace(/^[^\w]+|[^\w]+$/g, "");
  if (!chosen) return "";

  // Normalize casing if all lowercase or all uppercase
  if (chosen === chosen.toLowerCase()) {
    chosen = chosen.charAt(0).toUpperCase() + chosen.slice(1);
  } else if (chosen.length > 2 && chosen === chosen.toUpperCase()) {
    chosen = chosen.charAt(0).toUpperCase() + chosen.slice(1).toLowerCase();
  }

  return chosen.length > 14 ? chosen.substring(0, 13) + "…" : chosen;
}

export function smartName(name: string): string {
  if (!name) return "User";
  const first = formatFirstName(name);
  if (name.length <= 18) return name;
  if (first.length <= 18) return first;
  return first.substring(0, 16) + "…";
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}
