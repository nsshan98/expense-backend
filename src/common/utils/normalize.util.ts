export class NormalizeUtil {
  static normalize(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Strip punctuation
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  }
}
