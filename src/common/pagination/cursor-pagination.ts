export interface EntityWithId {
  created_at?: Date | null;
}

export interface CursorPage<T> {
  total: number;
  data: T[];
  nextCursor: string | null;
}

export class CursorPaginator {
  static buildResponse<T extends EntityWithId>(
    items: T[],
    limit: number,
  ): CursorPage<T> {
    if (items.length === 0) {
      return { total: 0, data: [], nextCursor: null };
    }

    const lastItem = items[items.length - 1];

    return {
      total: items.length,
      data: items,
      nextCursor: lastItem.created_at?.toISOString() || null,
    };
  }
}
