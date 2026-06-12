import {
  MAX_PAGE_SIZE,
  normalizePagination,
  paginateArray,
} from './pagination';

describe('pagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('uses defaults when params are missing', () => {
    expect(normalizePagination()).toEqual({ page: 1, pageSize: 20 });
  });

  it('caps pageSize at MAX_PAGE_SIZE', () => {
    expect(normalizePagination(1, 500).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('paginates array with meta', () => {
    const result = paginateArray(items, 2, 10);
    expect(result.data).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('returns empty page when beyond range', () => {
    const result = paginateArray(items, 10, 10);
    expect(result.data).toEqual([]);
    expect(result.meta.hasNextPage).toBe(false);
  });
});
