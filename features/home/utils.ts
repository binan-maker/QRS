export function getFirstName(name: string): string {
  return name ? name.trim().split(/\s+/)[0] : "";
}
