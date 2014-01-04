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


describe('logic#prisoners', function() {
  it('should fail if boards do not match', function() {
    assert.equal(logic.prisoners('    ', ' B'), null);
  });

  it('should fail if boards are not consecutive', function() {
    assert.equal(logic.prisoners('    ', '    '), null);
    assert.equal(logic.prisoners('    ', 'WB  '), null);
    assert.equal(logic.prisoners('    ', 'BB  '), null);
  });

  it('should properly count prisoners', function() {
    assert.deepEqual(logic.prisoners('    ', 'B   '), {'B': 0});
    assert.deepEqual(logic.prisoners('W   ', 'WB  '), {'B': 0});
    assert.deepEqual(logic.prisoners('W   ', ' B  '), {'B': 1});
    assert.deepEqual(logic.prisoners('BB W', '  WW'), {'W': 2});
  });
});


describe('logic#dead', function() {
  it('should fail if board and death map do not match', function() {
    assert.equal(logic.dead('    ', '  X', 0, 0), null);
    assert.equal(logic.dead('   ', '  X', 0, 0), null);
  });

  it('should fail if marked position is empty', function() {
    assert.equal(logic.dead('    ', '    ', 0, 0), null);
  });

  it('should mark living stones/groups as dead', function() {
    assert.equal(logic.dead('W BW', '    ', 0, 0), 'X   ');
    assert.equal(logic.dead('W WB', '    ', 0, 0), 'X X ');
    assert.equal(logic.dead('W WB', 'X X ', 1, 1), 'X XX');
  });

  it('should mark dead stones/groups as not dead', function() {
    assert.equal(logic.dead('W BW', 'X   ', 0, 0), '    ');
    assert.equal(logic.dead('W WB', 'X X ', 0, 0), '    ');
    assert.equal(logic.dead('W WB', 'X XX', 1, 1), 'X X ');
  });
});


describe('logic#territory', function() {
  it('should fail if board and death map do not match', function() {
    assert.equal(logic.territory('    ', '  X'), null);
    assert.equal(logic.territory('   ', '  X'), null);
  });

  it('should not count undefined area', function() {
    assert.equal(logic.territory('    ', '    '), '    ');
    assert.equal(logic.territory('WB  ', '    '), '    ');
    assert.equal(logic.territory(' W W B B ', '         '), 'W       B');
  });

  it('should count multiple areas', function() {
    assert.equal(logic.territory(' W WWB W ', '         '), 'W     W  ');
    assert.equal(logic.territory(' W W W W ', '         '), 'W W W W W');
  });

  it('should count areas with dead stones in', function() {
    assert.equal(logic.territory('B  WWWB  ', 'X        '), 'WWW      ');
    assert.equal(logic.territory('B WWW    ', 'X X      '), 'WWW  WWWW');
  });
});
