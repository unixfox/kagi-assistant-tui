export function removeLastWord(str: string) {
  return str
    .trim()
    .replace(/\s*\S+$/, "")
    .trim();
}
