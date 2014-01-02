var assert = require('assert');

var logic = require('../src/logic');

describe('logic#move', function() {
  it('should fail if position is not empty', function() {
    assert.equal(logic.move('B   ', 'B', 0, 0), null);
    assert.equal(logic.move('B   ', 'W', 0, 0), null);
  });
});
