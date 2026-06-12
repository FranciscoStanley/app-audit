export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function normalizePagination(
  page?: number,
  pageSize?: number,
): PaginationParams {
  const safePage =
    Number.isFinite(page) && (page as number) > 0
      ? Math.floor(page as number)
      : DEFAULT_PAGE;
  let safeSize =
    Number.isFinite(pageSize) && (pageSize as number) > 0
      ? Math.floor(pageSize as number)
      : DEFAULT_PAGE_SIZE;
  safeSize = Math.min(safeSize, MAX_PAGE_SIZE);
  return { page: safePage, pageSize: safeSize };
}

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const { page: p, pageSize: size } = normalizePagination(page, pageSize);
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / size);
  const start = (p - 1) * size;
  const data = items.slice(start, start + size);

  return {
    data,
    meta: {
      page: p,
      pageSize: size,
      total,
      totalPages,
      hasNextPage: p < totalPages,
      hasPreviousPage: p > 1 && totalPages > 0,
    },
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  const { page: p, pageSize: size } = normalizePagination(page, pageSize);
  const totalPages = total === 0 ? 0 : Math.ceil(total / size);
  return {
    page: p,
    pageSize: size,
    total,
    totalPages,
    hasNextPage: p < totalPages,
    hasPreviousPage: p > 1 && totalPages > 0,
  };
}
