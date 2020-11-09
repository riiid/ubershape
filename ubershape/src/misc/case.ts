function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function kebab2camel(kebab: string): string {
  const words = kebab.split('-');
  return words[0] + words.slice(1).map(sentenceCase).join('');
}

export function kebab2pascal(kebab: string): string {
  return kebab.split('-').map(sentenceCase).join('');
}
