export class PagePaginator {
  static buildResponse<T>({
    items,
    total,
    page,
    perPage,
  }: {
    items: T[];
    total: number;
    page: number;
    perPage: number;
  }) {
    const totalPages = Math.ceil(total / perPage);

    return {
      data: items,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }
}
