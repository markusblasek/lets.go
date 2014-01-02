var assert = require('assert');

var logic = require('../src/logic');

describe('logic#move', function() {
  it('should fail if board is not quadratic', function() {
    assert.equal(logic.move('   ', 'B', 0, 0), null);
  });

  it('should fail if position is off board', function() {
    assert.equal(logic.move('B   ', 'B', -1, 0), null);
    assert.equal(logic.move('B   ', 'W', 0, -1), null);
    assert.equal(logic.move('B   ', 'W', 0, 3), null);
    assert.equal(logic.move('B   ', 'W', 3, 0), null);
  });

  it('should fail if position is not empty', function() {
    assert.equal(logic.move('B   ', 'B', 0, 0), null);
    assert.equal(logic.move('B   ', 'W', 0, 0), null);
  });

  it('should fail if move would be suicide', function() {
    assert.equal(logic.move('B ' +
                            ' B', 'W', 1, 0), null);
    assert.equal(logic.move('BBB' +
                            'B B' +
                            'BB ', 'W', 1, 1), null);
    assert.equal(logic.move(' BW' +
                            ' B ' +
                            '  B', 'W', 2, 1), null);
    assert.equal(logic.move('BBB ' +
                            'BWB ' +
                            'B B ' +
                            'BBB ', 'W', 1, 2), null);
  });

  it('should reflect normal moves without making prisoners', function() {
    assert.equal(logic.move('    ', 'B', 0, 0), 'B   ');
    assert.equal(logic.move('B   ', 'W', 1, 0), 'BW  ');
    assert.equal(logic.move('BW  ', 'B', 0, 1), 'BWB ');
  });

  it('should remove dead stones', function() {
    assert.equal(logic.move('BW  ', 'B', 1, 1), 'B  B');
    assert.equal(logic.move(' BW' +
                            ' BW' +
                            '   ', 'B', 2, 2), ' B  B   B');
    assert.equal(logic.move('BBB' +
                            'BWB' +
                            'B B', 'B', 1, 2), 'BBBB BBBB');
    assert.equal(logic.move('WWWW' +
                            'WBBW' +
                            'WBWW' +
                            'W WW', 'W', 1, 3), 'WWWWW  WW WWWWWW');
  });
});
