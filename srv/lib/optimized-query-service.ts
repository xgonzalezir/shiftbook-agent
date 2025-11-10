import * as cds from "@sap/cds";
const { SELECT } = cds.ql;

/**
 * Optimized Query Service for ShiftBook Database Operations
 *
 * This service provides optimized database queries that leverage proper indexing
 * and cursor-based pagination for better performance with large datasets.
 */
export class OptimizedQueryService {

  /**
   * Optimized origin + destination workcenter filtering using a single query with EXISTS
   * This replaces the previous approach of separate queries + UNION
   */
  static async getLogsWithWorkcenterFilter(params: {
    werks: string;
    workcenter: string;
    includeDestination: boolean;
    conditions?: any;
    orderBy?: any;
    limit?: number;
    cursor?: string; // cursor for pagination
  }) {
    const { werks, workcenter, includeDestination, conditions = {}, orderBy = { log_dt: "desc" }, limit = 20, cursor } = params;

    // Base conditions
    const baseConditions = {
      werks,
      ...conditions
    };

    if (includeDestination) {
      // Optimized single query using EXISTS subquery
      // This leverages the new IDX_SHIFTBOOKLOGWC_WORKCENTER_LOGID index
      let query = SELECT.from("ShiftBookLog")
        .where(baseConditions)
        .and("(workcenter = ? OR EXISTS (SELECT 1 FROM ShiftBookLogWC WHERE log_id = ShiftBookLog.ID AND workcenter = ?))",
             workcenter, workcenter);

      // Add cursor-based pagination if cursor is provided
      if (cursor) {
        query = query.and("log_dt < ?", cursor);
      }

      // Apply ordering and limit
      const results = await query.orderBy(orderBy).limit(limit);

      return {
        results,
        nextCursor: results.length > 0 ? results[results.length - 1].log_dt : null,
        hasMore: results.length === limit
      };
    } else {
      // Simple origin-only filtering (existing optimized path)
      baseConditions.workcenter = workcenter;

      let query = SELECT.from("ShiftBookLog").where(baseConditions);

      if (cursor) {
        query = query.and("log_dt < ?", cursor);
      }

      const results = await query.orderBy(orderBy).limit(limit);

      return {
        results,
        nextCursor: results.length > 0 ? results[results.length - 1].log_dt : null,
        hasMore: results.length === limit
      };
    }
  }

  /**
   * Optimized text search using full-text index
   * This leverages the new FTI_SHIFTBOOKLOG_CONTENT full-text index
   */
  static async searchLogsOptimized(params: {
    werks?: string;
    category?: string;
    searchText: string;
    limit?: number;
    cursor?: string;
  }) {
    const { werks, category, searchText, limit = 20, cursor } = params;

    const conditions: any = {};
    if (werks) conditions.werks = werks;
    if (category) conditions.category = category;

    // Use full-text search for better performance
    // This will use the FTI_SHIFTBOOKLOG_CONTENT index in HANA
    let query = SELECT.from("ShiftBookLog")
      .where(conditions)
      .and("CONTAINS((SUBJECT, MESSAGE), ?) = 1", searchText);

    if (cursor) {
      query = query.and("log_dt < ?", cursor);
    }

    const results = await query.orderBy({ log_dt: "desc" }).limit(limit);

    return {
      results,
      nextCursor: results.length > 0 ? results[results.length - 1].log_dt : null,
      hasMore: results.length === limit
    };
  }

  /**
   * Optimized category search with language-specific filtering
   */
  static async searchCategoriesOptimized(params: {
    werks?: string;
    searchText: string;
    language: string;
    limit?: number;
  }) {
    const { werks, searchText, language, limit = 20 } = params;

    const conditions: any = {};
    if (werks) conditions.werks = werks;

    // Search in language-specific descriptions using the new text search index
    const translationResults = await SELECT.from("ShiftBookCategoryLng")
      .where({
        ...conditions,
        lng: language.toUpperCase(),
        desc: { like: `%${searchText}%` }
      })
      .limit(limit);

    // Get the corresponding categories
    const categoryIds = translationResults.map((t: any) => ({
      ID: t.category,
      werks: t.werks
    }));

    if (categoryIds.length === 0) {
      return { results: [], hasMore: false };
    }

    // Fetch category details using optimized batch query
    const categories = await Promise.all(
      categoryIds.map(async (id: { ID: string; werks: string }) =>
        SELECT.one.from("ShiftBookCategory").where(id)
      )
    );

    return {
      results: categories.filter(Boolean),
      hasMore: translationResults.length === limit
    };
  }

  /**
   * Batch insert optimization for ShiftBookLogWC entries
   */
  static async batchInsertLogWorkcenters(entries: Array<{
    log_id: string;
    workcenter: string;
  }>) {
    if (entries.length === 0) return;

    // Use batch insert for better performance
    // This will benefit from the new IDX_SHIFTBOOKLOGWC_WORKCENTER_LOGID index
    const { INSERT } = cds.ql;
    await INSERT.into("ShiftBookLogWC").entries(entries);
  }

  /**
   * Optimized pagination with cursor support
   * This replaces OFFSET-based pagination which is slow on large datasets
   */
  static async getPaginatedLogs(params: {
    werks: string;
    workcenter?: string;
    category?: string;
    includeDestination?: boolean;
    cursor?: string;
    pageSize?: number;
    language?: string;
  }) {
    const {
      werks,
      workcenter,
      category,
      includeDestination = false,
      cursor,
      pageSize = 20,
      language = 'en'
    } = params;

    const baseConditions: any = { werks };
    if (category) baseConditions.category = category;

    let results: {
      results: any[];
      nextCursor: string | null;
      hasMore: boolean;
    };

    if (workcenter) {
      // Use the optimized workcenter filter
      results = await this.getLogsWithWorkcenterFilter({
        werks,
        workcenter,
        includeDestination,
        conditions: category ? { category } : {},
        cursor,
        limit: pageSize
      });
    } else {
      // Simple query without workcenter filtering
      let query = SELECT.from("ShiftBookLog").where(baseConditions);

      if (cursor) {
        query = query.and("log_dt < ?", cursor);
      }

      const logs = await query.orderBy({ log_dt: "desc" }).limit(pageSize);

      results = {
        results: logs,
        nextCursor: logs.length > 0 ? logs[logs.length - 1].log_dt : null,
        hasMore: logs.length === pageSize
      };
    }

    // Enhance with language-specific category descriptions
    const enhancedLogs = await Promise.all(
      results.results.map(async (log: any) => {
        try {
          // Get category translation
          const translation = await SELECT.one
            .from("ShiftBookCategoryLng")
            .where({
              category: log.category,
              werks: log.werks,
              lng: language.toUpperCase()
            });

          // Fallback to English if no translation found
          let fallbackTranslation = null;
          if (!translation && language !== 'en') {
            fallbackTranslation = await SELECT.one
              .from("ShiftBookCategoryLng")
              .where({
                category: log.category,
                werks: log.werks,
                lng: 'EN'
              });
          }

          return {
            ...log,
            category_desc: translation?.desc || fallbackTranslation?.desc || `Category ${log.category}`,
            category_language: translation ? language : fallbackTranslation ? 'en' : 'none'
          };
        } catch (error) {
          console.warn(`Failed to get category description for log ${log.ID}:`, error);
          return log;
        }
      })
    );

    return {
      logs: enhancedLogs,
      nextCursor: results.nextCursor,
      hasMore: results.hasMore,
      pagination: {
        cursorBased: true,
        pageSize
      }
    };
  }
}

export default OptimizedQueryService;