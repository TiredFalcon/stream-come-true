// Import the dependencies for testing
const chai = require('chai');
const chaiThings = require('chai-things');
const config = require('../../config');
const ElasticClient = require('../../elasticClient/ElasticClient');

// Configure chai
chai.should();
chai.use(chaiThings);

const client = new ElasticClient('twitter', config);

describe('ElasticClient.itemsOverTime()', function itemsOverTimeTest() {
  this.timeout(5000);

  describe('without filters', () => {
    it('should return an array', async () => {
      const res = await client.itemsOverTime();
      res.should.be.instanceOf(Array);
    });

    it('should contain elements with the correct properties', async () => {
      const res = await client.itemsOverTime();
      res.forEach((item) => {
        item.should.have.property('time');
        item.should.have.property('count');
      });
    });

    it('should contain elements with properties of the correct types', async () => {
      const res = await client.itemsOverTime();
      res.forEach((item) => {
        item.time.should.be.a('number');
        item.count.should.be.a('number');
      });
    });
  });

  describe('with text filter', () => {
    const textfilter = 'apex';
    const filters = { textfilter };

    it('should return an array', async () => {
      const res = await client.itemsOverTime(filters);
      res.should.be.instanceOf(Array);
    });

    it('should contain elements with the correct properties', async () => {
      const res = await client.itemsOverTime(filters);
      res.forEach((item) => {
        item.should.have.property('time');
        item.should.have.property('count');
      });
    });

    it('should contain elements with properties of the correct types', async () => {
      const res = await client.itemsOverTime(filters);
      res.forEach((item) => {
        item.time.should.be.a('number');
        item.count.should.be.a('number');
      });
    });
  });

  describe('with time frame filter', () => {
    const fiveMinutesAgo = new Date();
    const tenMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 10);
    const filters = {
      fromdatetime: tenMinutesAgo.toISOString(),
      todatetime: fiveMinutesAgo.toISOString(),
    };

    it('should return an array', async () => {
      const res = await client.itemsOverTime(filters);
      res.should.be.instanceOf(Array);
    });

    it('should contain elements with the correct properties', async () => {
      const res = await client.itemsOverTime(filters);
      res.forEach((item) => {
        item.should.have.property('time');
        item.should.have.property('count');
      });
    });

    it('should contain elements with properties of the correct types', async () => {
      const res = await client.itemsOverTime(filters);
      res.forEach((item) => {
        item.time.should.be.a('number');
        item.count.should.be.a('number');
      });
    });

    it('should contain elements that are within the time frame filter', async () => {
      const res = await client.itemsOverTime(filters);
      res.map(item => new Date(item.created_at)).should.all.be.at.most(fiveMinutesAgo);
      res.map(item => new Date(item.created_at)).should.all.be.at.least(tenMinutesAgo);
    });
  });
});
