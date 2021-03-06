const asyncErrorCatch = require('./../../utils/asyncErrorCatch');
const ElasticClient = require('../../elasticClient/ElasticClient');

/**
 * Router for hashtag graph spidering.
 *
 * This router accepts a request for spidering using the graph explore API.
 * This request is forwarded to a previously added source.
 * For adding the source, see the {@link connectSource} middleware.
 *
 * This route also handles filters found at req.filters:
 * textfilter: filters data by text search (e.g. "google")
 * timeframe: filters data by time frame (e.g. 5h)
 *
 * @example
 *    const hashtagGraphSpidering = require('./hashtagGraphSpidering');
 *    // notice: POST request
 *    router.post('/hashtag_graph', hashtagGraphSpidering(config));
 *
 * @param {object} config server configuration
 * @returns {object} Express.js route handler
 */
module.exports = config => asyncErrorCatch(async (req, res) => {
  const { filters } = req;
  const client = ElasticClient.getInstance(req, config);
  const { hashtag, exclude } = req.body;
  const items = await client.spiderFromHashtag(hashtag, exclude, filters);
  res.json(items);
});
