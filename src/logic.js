var _ = require('underscore');

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
  // quadratic boards only
  var n = Math.sqrt(board.length);
  if (n % 1 !== 0) {
    return null;
  }

  // ensure that position is within the board
  if (col < 0 || row < 0 || col >= n || row >= n) {
    return null;
  }

  // check whether the place is already taken
  var index = n*row + col;
  if (board[index] !== ' ') {
    return null;
  }

  // place our stone
  board = replace(board, index, turn);

  // remove all stones that are dead now
  board = _
    .chain(neighborhood(n, index))
    .filter(function(neighbor) {
      return board[neighbor] !== turn && board[neighbor] !== ' ';
    })
    .map(function(neighbor) {
      return group(board, n, neighbor % n, Math.floor(neighbor / n));
    })
    .filter(function(grp) {
      return liberties(board, n, grp) === 0;
    })
    .flatten()
    .reduce(function(board, stone) {
      return replace(board, stone, ' ');
    }, board).value();

  // ensure that it's not a suicide move
  if (liberties(board, n, group(board, n, col, row)) === 0) {
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

  var minus = _(from).countBy(_.identity);
  var plus = _(to).countBy(_.identity);
  var black = (plus.B || 0) - (minus.B || 0);
  var white = (plus.W || 0) - (minus.W || 0);

  if (!(black === 1 && white <= 0) && !(white === 1 && black <= 0)) {
    return null;
  }

  return (black === 1) ? {B: -white} : {W: -black};
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
  if (n % 1 !== 0 || board.length !== alreadyDead.length) {
    return null;
  }

  if (board[n * row + column] === ' ') {
    return null;
  }

  var value = alreadyDead[n * row + column] === 'X' ? ' ' : 'X';

  return _(group(board, n, column, row)).reduce(function(dead, index) {
    return replace(dead, index, value);
  }, alreadyDead);
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
  if (n % 1 !== 0 || board.length !== dead.length) {
    return null;
  }

  // remove dead stones
  board = _(dead).reduce(function(board, dead, index) {
    return dead === 'X' ? replace(board, index, ' ') : board;
  }, board);

  // get all territory groups
  var checked = [];
  return _(board).reduce(function(territory, stone, index) {
    if (!_(checked).contains(index) && stone === ' ') {
      var grp = group(board, n, index % n, Math.floor(index / n));
      var colors = _
        .chain(grp)
        .map(_.partial(neighborhood, n))
        .flatten()
        .map(function(neighbor) {
          return board[neighbor];
        })
        .countBy(_.identity).value();

      if ((colors.B && !colors.W) || (!colors.B && colors.W)) {
        _(grp).each(function(stone) {
          territory = replace(territory, stone, colors.B ? 'B' : 'W');
        });
      }

      _(grp).each(function(stone) {
        checked.push(stone);
      });
    }
    return territory;
  }, new Array(board.length + 1).join(' '));
};


// return 1d indexes of all group members
var group = function(board, n, x, y, checked) {
  var index = y * n + x;

  (checked = checked || []).push(index);

  _(neighborhood(n, index)).each(function(neighbor) {
    if (!_(checked).contains(neighbor) && board[neighbor] === board[index]) {
      group(board, n, neighbor % n, Math.floor(neighbor / n), checked);
    }
  });

  return checked;
};

// return number of free crosses for group
var liberties = function(board, n, indices) {
  var checked = [];
  var count = 0;

  _.chain(indices).map(_.partial(neighborhood, n)).flatten().each(function(n) {
    if (!_(checked).contains(n) && board[n] === ' ') {
      count += 1;
      checked.push(n);
    }
  });

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
