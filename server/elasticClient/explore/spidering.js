/**
 * Create a graph spidering query (see Explore API at: https://www.elastic.co/guide/en/elasticsearch/reference/current/graph-explore-api.html).
 *
 * @typedef Controls a controls object as described in the documentation
 * @type {Object}
 * @property {boolean} [use_significance = true] whether to use significance or not
 * @property {number} [sample_size = 100] size of sample of the best-matching documents on
 *                                  each shard considered at every hop
 * @property {number} [timeout] milliseconds
 * @property {object} [sample_diversity] avoid the top-matching documents sample being dominated
 *                                       by a single source of results
 * @property {string} [sample_diversity.field]
 * @property {number} [sample_diversity.max_docs_per_value]
 *
 * @param {string} keywordField name of the keyword field to explore on
 * @param {string} startingValue value from which exploration will start
 * @param {Array<string>} excludeValues values that should be excluded in the exploration
 * @param {Controls} controls controld for the Explore API
 * @returns {ExploreAPIQuery} a query object with controls, vertices, connections
 */
const spidering = (keywordField, startingValue, excludeValues, controls) => ({
  controls,
  vertices: [
    {
      field: keywordField,
      size: 5,
      min_doc_count: 3,
      include: [startingValue],
    },
  ],
  connections: {
    vertices: [
      {
        field: keywordField,
        size: 5,
        min_doc_count: 3,
        exclude: excludeValues,
      },
    ],
  },
});

module.exports = spidering;
