/**
 * Shared TypeScript types and interfaces.
 * Feature-specific types will be added as features are built.
 */

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
