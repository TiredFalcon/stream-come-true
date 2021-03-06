// Import the dependencies for testing
const chai = require('chai');
const chaiThings = require('chai-things');

const config = require('../../config');
const ElasticClient = require('../../elasticClient/ElasticClient');
const testUtils = require('../utils');

// Configure chai
chai.should();
chai.use(chaiThings);

const client = new ElasticClient('twitter', config);

describe('ElasticClient.popularUsers()', function popularUsersTest() {
  this.timeout(5000);

  describe('without filters', () => {
    it('should return an array', async () => {
      const res = await client.popularUsers();
      res.should.be.instanceOf(Array);
    });

    it('should contain elements with the correct properties', async () => {
      const res = await client.popularUsers();
      res.forEach((item) => {
        item.should.have.property('user');
        item.should.have.property('count');
      });
    });

    it('should contain elements with properties of the correct types', async () => {
      const res = await client.popularUsers();
      res.forEach((item) => {
        item.user.should.be.a('string');
        item.count.should.be.a('number');
      });
    });
  });

  describe('with text filter', () => {
    const textfilter = testUtils.textFilter;
    const filters = { textfilter };

    it('should return an array', async () => {
      const res = await client.popularUsers(filters);
      res.should.be.instanceOf(Array);
    });

    it('should contain elements with the correct properties', async () => {
      const res = await client.popularUsers(filters);
      res.forEach((item) => {
        item.should.have.property('user');
        item.should.have.property('count');
      });
    });

    it('should contain elements with properties of the correct types', async () => {
      const res = await client.popularUsers(filters);
      res.forEach((item) => {
        item.user.should.be.a('string');
        item.count.should.be.a('number');
      });
    });
  });

  describe('with time frame filter', () => {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const filters = { fromdatetime: oneHourAgo.toISOString() };

    it('should return an array', async () => {
      const res = await client.popularUsers(filters);
      res.should.be.instanceOf(Array);
    });

    it('should contain elements with the correct properties', async () => {
      const res = await client.popularUsers(filters);
      res.forEach((item) => {
        item.should.have.property('user');
        item.should.have.property('count');
      });
    });

    it('should contain elements with properties of the correct types', async () => {
      const res = await client.popularUsers(filters);
      res.forEach((item) => {
        item.user.should.be.a('string');
        item.count.should.be.a('number');
      });
    });
  });
});
