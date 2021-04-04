const { expect } = require('chai');
const Homee = require('../homee');

const homee = new Homee('127.0.0.1', 'userxy', 'super-secret');

describe('04 message handling', () => {
  describe('#store node data', () => {
    it('stores nodes from incoming messages', () => {
      const msg = { nodes: [{ id: 27, name: 'device27' }, { id: 28, name: 'device28' }] };
      homee.handleMessage(msg);

      expect(homee.nodes).to.eql(msg.nodes);
    });

    it('updates changed nodes from incoming messages', () => {
      const msg = { node: { id: 27, name: 'device29' } };
      homee.handleMessage(msg);

      expect(homee.nodes).to.eql([{ id: 27, name: 'device29' }, { id: 28, name: 'device28' }]);
    });

    it('adds new nodes from incoming messages', () => {
      const msg = { node: { id: 25, name: 'device25' } };
      homee.handleMessage(msg);

      expect(homee.nodes).to.eql([
        { id: 27, name: 'device29' },
        { id: 28, name: 'device28' },
        { id: 25, name: 'device25' },
      ]);
    });
  });

  describe('#store plan data', () => {
    it('stores plans from incoming messages', () => {
      const msg = { plans: [{ id: 27, name: 'plan27' }, { id: 28, name: 'plan28' }] };
      homee.handleMessage(msg);

      expect(homee.plans).to.eql(msg.plans);
    });

    it('updates changed plans from incoming messages', () => {
      const msg = { plan: { id: 27, name: 'plan29' } };
      homee.handleMessage(msg);

      expect(homee.plans).to.eql([{ id: 27, name: 'plan29' }, { id: 28, name: 'plan28' }]);
    });

    it('adds new plans from incoming messages', () => {
      const msg = { plan: { id: 25, name: 'plan25' } };
      homee.handleMessage(msg);

      expect(homee.plans).to.eql([
        { id: 27, name: 'plan29' },
        { id: 28, name: 'plan28' },
        { id: 25, name: 'plan25' },
      ]);
    });
  });

  describe('#store group data', () => {
    it('stores groups from incoming messages', () => {
      const msg = { groups: [{ id: 27, name: 'group27' }, { id: 28, name: 'group28' }] };
      homee.handleMessage(msg);

      expect(homee.groups).to.eql(msg.groups);
    });

    it('updates changed groups from incoming messages', () => {
      const msg = { group: { id: 27, name: 'group29' } };
      homee.handleMessage(msg);

      expect(homee.groups).to.eql([{ id: 27, name: 'group29' }, { id: 28, name: 'group28' }]);
    });

    it('adds new groups from incoming messages', () => {
      const msg = { group: { id: 25, name: 'group25' } };
      homee.handleMessage(msg);

      expect(homee.groups).to.eql([
        { id: 27, name: 'group29' },
        { id: 28, name: 'group28' },
        { id: 25, name: 'group25' },
      ]);
    });
  });

  describe('#store relationship data', () => {
    it('stores relationships from incoming messages', () => {
      const msg = { relationships: [{ id: 27, name: 'relationship27' }, { id: 28, name: 'relationship28' }] };
      homee.handleMessage(msg);

      expect(homee.relationships).to.eql(msg.relationships);
    });

    it('updates changed relationship from incoming messages', () => {
      const msg = { relationship: { id: 27, name: 'relationship29' } };
      homee.handleMessage(msg);

      expect(homee.relationships).to.eql([{ id: 27, name: 'relationship29' }, { id: 28, name: 'relationship28' }]);
    });

    it('adds new relationships from incoming messages', () => {
      const msg = { relationship: { id: 25, name: 'relationship25' } };
      homee.handleMessage(msg);

      expect(homee.relationships).to.eql([
        { id: 27, name: 'relationship29' },
        { id: 28, name: 'relationship28' },
        { id: 25, name: 'relationship25' },
      ]);
    });
  });

  describe('#attribute handling', () => {
    it('handle attribute changes', () => {
      homee.nodes = [{
        id: 10,
        attributes: [{
          id: 10,
          node_id: 10,
          current_value: 0,
        }],
      }];
      const msg = { attribute: { id: 10, node_id: 10, current_value: 1 } };
      homee.handleMessage(msg);

      expect(homee.nodes).to.eql([{
        id: 10,
        attributes: [{
          id: 10,
          node_id: 10,
          current_value: 1,
        }],
      }]);
    });
  });
});
