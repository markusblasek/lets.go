
/**
 * Create a new board by making a move.
 *
 * @param {String} board - A string of n*n characters, with each character
 *                         being one of ' ', 'B' or 'W' describing the
 *                         board.
 * @param {String} turn - Either 'B' or 'W' describing whose turn it is.
 * @param {Number} col - Column of the new stone (0-indexed).
 * @param {Number} row - Row of the new stone (0-indexed).
 * @returns {String} Either a new board or null in case the move isn't legit.
 */
var move = function(board, turn, col, row) {
  var n = Math.sqrt(board.length);

  // quadratic boards only
  if (n % 1 !== 0) {
    return null;
  }

  // ensure that position is within the board
  if (col < 0 || row < 0 || col >= n || row >= n) {
    return null;
  }

  var index = n*row + col;
  var opponent = (turn === 'W') ? 'B' : 'W';

  // check whether the place is already taken
  if (board[index] !== ' ') {
    return null;
  }

  // place our stone
  board = replace(board, index, turn);

  // remove all stones that are dead now
  var neighbors = neighborhood(n, index);
  for (var i = 0; i < neighbors.length; ++i) {
    var neighbor = neighbors[i];
    if (board[neighbor] === opponent) {
      var grp = group(board, n, neighbor % n, Math.floor(neighbor / n));
      if (liberties(board, n, grp) === 0) {
        for (var j = 0; j < grp.length; ++j) {
          board = replace(board, grp[j], ' ');
        }
      }
    }
  }

  var indices = group(board, n, col, row);

  // ensure that it's not a suicide move
  if (liberties(board, n, indices) === 0) {
    return null;
  }

  // TODO: Add check for Ko!

  return board;
};


/**
 * Compare two boards and count the number of prisoners made.
 *
 * @param {String} from - A board string.
 * @param {String} to - A board string.
 * @returns {Object} A mapping from color to made prisoners.
 */
var prisoners = function(from, to) {
  if (from.length != to.length) {
    return null;
  }

  var b = 0, w = 0;

  for (var i = 0; i < from.length; ++i) {
    if (from[i] === 'B') b -= 1;
    if (from[i] === 'W') w -= 1;
    if (to[i] === 'B') b += 1;
    if (to[i] === 'W') w += 1;
  }

  if (!(b === 1 && w <= 0) && !(w === 1 && b <= 0)) {
    return null;
  }

  return (b === 1) ? {B: -w} : {W: -b};
};


/**
 * Create a "death map" derived from a board and a list of already dead stones
 * If the stone is already dead, the stone/group is reborn. The death map
 * denotes dead stones with a 'X'.
 *
 * @param {String} board - A board.
 * @param {String} alreadyDead - Current death map corresponding to the board.
 * @param {Number} column - Column of the dead stone.
 * @param {Number} row - Row of the dead stone.
 * @returns {String} A new death map.
 */
var dead = function(board, alreadyDead, column, row) {
  var n = Math.sqrt(board.length);

  // quadratic boards only
  if (n % 1 !== 0 || board.length !== alreadyDead.length) {
    return null;
  }

  if (board[n*row + column] === ' ') {
    return null;
  }

  var grp = group(board, n, column, row);
  var value = (alreadyDead[n * row + column] === 'X') ? ' ' : 'X';
  for (var i = 0; i < grp.length; ++i) {
    alreadyDead = replace(alreadyDead, grp[i], value);
  }

  return alreadyDead;
};


/**
 * Create a "territory map" by looking at a board and the corresponding
 * "death map". The territory map is made of 'W', 'B' and ' ' characters,
 * where W and B denote the belonging.
 *
 * @param {String} board - The board.
 * @param {String} dead - The corresponding death map.
 * @returns {String} A territory map.
 */
var territory = function(board, dead) {
  var n = Math.sqrt(board.length);

  // quadratic boards only
  if (n % 1 !== 0 || board.length !== dead.length) {
    return null;
  }

  var territory = new Array(board.length + 1).join(' ');

  // remove dead stones
  for (var i = 0; i < dead.length; ++i) {
    if (dead[i] === 'X') {
      board = replace(board, i, ' ');
    }
  }

  // get all territory groups
  var checked = [];
  for (var i = 0; i < board.length; ++i) {
    if (checked.indexOf(i) >= 0 || board[i] !== ' ') {
      continue;
    }

    var grp = group(board, n, i % n, Math.floor(i / n));
    var white = false, black = false;

    // see if they are aligned to one color only
    for (var j = 0; j < grp.length && !(white && black); ++j) {
      var neighbors = neighborhood(n, grp[j]);
      for (var k = 0; k < neighbors.length; ++k) {
        white = white || board[neighbors[k]] === 'W';
        black = black || board[neighbors[k]] === 'B';
      }
    }

    if ((white && black) || (!white && !black)) {
      continue;
    }

    for (var j = 0; j < grp.length; ++j) {
      territory = replace(territory, grp[j], white ? 'W' : 'B');
    }
  }

  return territory;
};


// return 1d indexes of all group members
var group = function(board, n, x, y, checked) {
  var index = y * n + x;

  checked = checked || [];
  checked.push(index);

  var candidates = neighborhood(n, index);
  for (var i = 0; i < candidates.length; ++i) {
    var c = candidates[i];
    if (checked.indexOf(c) === -1 && board[c] === board[index]) {
      group(board, n, c % n, Math.floor(c / n), checked);
    }
  }

  return checked;
};

// return number of free crosses for group
var liberties = function(board, n, indices) {
  var checked = [];
  var count = 0;

  for (var i = 0; i < indices.length; ++i) {
    var candidates = neighborhood(n, indices[i]);
    for (var j = 0; j < candidates.length; ++j) {
      var c = candidates[j];
      if (checked.indexOf(c) === -1 && board[c] === ' ') {
        count += 1;
        checked.push(c);
      }
    }
  }

  return count;
};

// create list of valid neighborhood indices
var neighborhood = function(n, index) {
  var neighborhood = [];
  var x = index % n;
  var y = Math.floor(index / n);

  if (x > 0) neighborhood.push(index - 1);
  if (x < n - 1) neighborhood.push(index + 1);
  if (y > 0) neighborhood.push(index - n);
  if (y < n - 1) neighborhood.push(index + n);

  return neighborhood;
};

// helper method to create new string by replacing a char
var replace = function(board, index, value) {
  return board.substr(0, index) + value + board.substr(index + 1);
};


module.exports = {
  move: move,
  prisoners: prisoners,
  dead: dead,
  territory: territory
};
