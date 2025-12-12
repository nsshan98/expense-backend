import Fuse from 'fuse.js';

export class FuzzyUtil {
  static search(list: string[], pattern: string) {
    const fuse = new Fuse(list, {
      includeScore: true,
      threshold: 0.4,
    });
    return fuse.search(pattern);
  }
}
