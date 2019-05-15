/* eslint-disable no-underscore-dangle */ // _source is in all query results

const { Client } = require('@elastic/elasticsearch');
const createError = require('http-errors');

const datetimeUtils = require('../utils/datetime');

const applyFiltersImpl = require('./filters');
const computeIntervalImpl = require('./computeInterval');
const selectFields = require('./selectFields');

const timeBucketing = require('./queries/timeBucketing');
const significantText = require('./queries/significantText');
const distinctCount = require('./queries/distinctCount');
const termsCount = require('./queries/termsCount');
const sampler = require('./queries/sampler');

/**
 * @class ElasticClient
 */
class ElasticClient {
  constructor(sourceName, config) {
    this.url = config.elasticURL;
    this.index = config.indices[sourceName];
    this.client = new Client({ node: this.url });
    this.queryFields = config.queryFields;
    this.config = config;
  }

  /**
   * Extract the client from the Express request.
   * This is necessary to make the type available for VSCode.
   *
   * @param {Express.Request} req Express.js request object
   * @returns {ElasticClient} the connected client
   */
  static getInstance(req, { sourceFieldName }) {
    return req[sourceFieldName];
  }

  /**
   * Get all items from the index with the given filters applied.
   *
   * @public
   * @param {Filters} filters text and time frame filters
   * @returns {Promise<Array<Item>>}
   */
  async all(filters) {
    const query = this.applyFilters(filters);

    const { dateField, textField } = this.queryFields;
    const sortByDate = { [dateField]: { order: 'desc' } };
    const highlight = { fields: { [textField]: {} }, number_of_fragments: 0 };

    return this.client
      .search({
        index: this.index,
        body: {
          ...query,
          sort: [sortByDate],
          highlight,
        },
        size: 15,
      })
      .then(res => res.body.hits.hits)
      .then(hits => hits.map(this.extractHighlightIfTextFilter(filters)))
      .then(hits => hits.map(el => el._source))
      .then(items => items.map(selectFields.all));
  }

  /**
   * Get the items over time aggregation with the given filters applied.
   *
   * @public
   * @param {Filters} filters text and time frame filters
   * @returns {Promise<Array<ItemsOverTimeElement>>} items over time
   */
  async itemsOverTime(filters) {
    const aggName = 'items_over_time';
    const query = this.applyFilters(filters);
    const queryWithAgg = {
      ...query,
      ...timeBucketing(aggName, this.queryFields.dateField, this.computeInterval(filters)),
    };
    const resultExtractor = aggResult => aggResult.buckets.map(selectFields.itemsOverTime);

    return this.aggregation(queryWithAgg, aggName, resultExtractor);
  }

  /**
   * Get the users count over time aggregation with the given filters applied.
   *
   * @public
   * @param {Filters} filters text and time frame filters
   * @returns {Promise<Array<UsersOverTimeElement>>} users over time
   */
  async usersOverTime(filters) {
    const aggName = 'users_over_time';
    const query = this.applyFilters(filters);
    const timeBucketsAgg = timeBucketing(
      aggName,
      this.queryFields.dateField,
      this.computeInterval(filters),
    );
    const distinctUsersAgg = distinctCount('users_count', 'screen_name');

    // Nest aggregations and define result extractor
    const usersOverTimeAgg = ElasticClient.nestAgg(timeBucketsAgg, aggName, distinctUsersAgg);
    const queryWithAgg = {
      ...query,
      ...usersOverTimeAgg,
    };
    const resultExtractor = aggResult => aggResult.buckets.map(selectFields.usersOverTime);

    return this.aggregation(queryWithAgg, aggName, resultExtractor);
  }

  /**
   * Get the popular keywords aggregation with the given filters applied.
   *
   * @public
   * @param {Filters} filters text and time frame filters
   * @returns {Promise<Array<PopularKeyword>>} popular keywords
   */
  async popularKeywords(filters) {
    const parentAggName = 'sample';
    const childAggName = 'popular_keywords';
    const query = this.applyFilters(filters);
    const samplerAgg = sampler(parentAggName, this.config.samplerSize);
    const significantTextAgg = significantText(childAggName, this.queryFields.textField);

    // Nest significant text into sampler and define result extractor
    const sampledSignificantTextAgg = ElasticClient.nestAgg(
      samplerAgg,
      parentAggName,
      significantTextAgg,
    );
    const queryWithAgg = {
      ...query,
      ...sampledSignificantTextAgg,
    };
    const resultExtractor = aggResult => aggResult[childAggName]
      .buckets.map(selectFields.popularKeywords);

    return this.aggregation(queryWithAgg, parentAggName, resultExtractor);
  }

  /**
   * Get the popular users aggregation with the given filters applied.
   *
   * @public
   * @param {Filters} filters text and time frame filters
   * @returns {Promise<Array<PopularUser>>} popular users
   */
  async popularUsers(filters) {
    const aggName = 'popular_users';
    const query = this.applyFilters(filters);
    const queryWithAgg = {
      ...query,
      ...termsCount(aggName, 'screen_name'),
    };
    const resultExtractor = aggResult => aggResult.buckets.map(selectFields.popularUsers);

    return this.aggregation(queryWithAgg, aggName, resultExtractor);
  }

  /**
   * Create simple query with filters applied.
   * The default for the time frame filter is '5h'.
   *
   * @private
   * @param {Filters} filters text and time frame filters
   * @returns {object} ElasticSearch query with filters applied
   */
  applyFilters(filters) {
    return applyFiltersImpl(this.config)(
      filters,
      this.queryFields.dateField,
      this.queryFields.textField,
    );
  }

  /**
   * If the passed filters are defined and contain a textfilter, returns a mapper that takes an
   * ElasticSearch hit object, extracts the first string in the highlight field and uses it as a
   * replacement for the textField of the `_source` object of the hit.
   *
   * This is used to return an {@link Item} that already has the text with the text filter match
   * highlighted.
   *
   * If the passed filters are undefined or the textfilter is not specified, this function returns
   * the identity function.
   *
   * @function HitMapper
   * @param {{ _source: { text: string }, highlight?: object }} hit ElasticSearch hit with _source
   *                                                                and optional highlight field
   * @returns {{ _source: { text: string }}} the same hit, with the first highlight string inserted
   *                                         in the field _source.text
   *
   * @param {Filters} filters text and time frame filters
   * @returns {HitMapper}
   */
  extractHighlightIfTextFilter({ textfilter = '' } = {}) {
    if (!textfilter) return hit => hit;

    const { textField } = this.queryFields;
    return ({ _source, highlight, ...rest }) => ({
      ...rest,
      _source: {
        ..._source,
        [textField]: highlight[textField][0],
      },
    });
  }

  /**
   * Computes a reasonable interval given a time frame.
   *
   * @private
   * @param {Filters} filters text and time frame filters
   * @returns {string} an interval in Date Math syntax, e.g. 5h
   */
  computeInterval(filters = {}) {
    const { fromdatetime: candidateFromdatetime, todatetime = new Date().toISOString() } = filters;
    const fromdatetime = candidateFromdatetime
      || datetimeUtils.minusHours(todatetime, this.config.defaultHourRange);
    const seconds = (new Date(todatetime).getTime() - new Date(fromdatetime).getTime()) / 1000;
    return computeIntervalImpl(this.config, seconds);
  }

  /**
   * Nest an aggregation in a given parent aggregation.
   * The argument parentAggName is needed to know how the parent
   * aggregation is called.
   *
   * @param {{aggs: object}} parentAgg
   * @param {string} parentAggName
   * @param {{aggs: object}} aggToNest
   */
  static nestAgg(parentAgg, parentAggName, aggToNest) {
    const parentAggInternal = parentAgg.aggs[parentAggName];
    return {
      aggs: {
        [parentAggName]: {
          ...parentAggInternal,
          ...aggToNest,
        },
      },
    };
  }

  /**
   * Send an aggregation search query the ElasticSearch instance and get a result.
   * This is a private method used internally
   *
   * @typedef AggItem
   * @type {ItemsOverTimeElement | UsersOverTimeElement | PopularKeyword | PopularUser}
   *
   * @function AggResultExtractor
   * @param {Object} result aggregation result
   * @returns {Array<AggItem>}
   *
   * @private
   * @param {Object} query an ElasticSearch query object (see QueryDSL in ES docs)
   * @param {AggResultExtractor} resultExtractor a function that extracts data from the result
   *                                             and returns an Array of AggItem
   * @returns {Promise<Array<AggItem>>}
   */
  async aggregation(query, aggName, resultExtractor) {
    if (!query.aggs[aggName]) throw createError(500, `Aggregation ${aggName} is not specified in the given query`);
    return this.client
      .search({
        index: this.index,
        body: query,
      })
      .then(res => res.body.aggregations[aggName])
      .then(resultExtractor);
  }
}

module.exports = ElasticClient;
