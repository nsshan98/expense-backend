import Fuse, { IFuseOptions } from 'fuse.js';

export class FuseUtil<T> {
  private fuse: Fuse<T>;

  constructor(list: T[], options: IFuseOptions<T>) {
    this.fuse = new Fuse(list, options);
  }

  search(pattern: string) {
    return this.fuse.search(pattern);
  }

  static create<T>(list: T[], options: IFuseOptions<T>) {
    return new FuseUtil(list, options);
  }
}
