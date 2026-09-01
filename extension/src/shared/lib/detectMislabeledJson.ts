export function looksLikeJsonText(text: string): boolean {
  const firstMeaningfulCharacter = text.trimStart()[0];

  return firstMeaningfulCharacter === "{" || firstMeaningfulCharacter === "[";
}
