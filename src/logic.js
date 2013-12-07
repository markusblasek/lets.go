/**
 * Create a new board by making a move.
 * @param {String} board - A string of n*n characters, with each character
 *                         being one of ' ', 'B' or 'W' describing the
 *                         board.
 * @param {String} turn - Either 'B' or 'W' describing whose turn it is.
 * @param {Number} col - Column of the new stone (0-indexed).
 * @param {Number} row - Row of the new stone (0-indexed).
 * @returns {String} Either a new board or null in case the move isn't legit.
 */
function move(board, turn, col, row) {
    var n = Math.sqrt(board.length);

    // quadratic boards only
    if (n % 1 !== 0) {
        return null;
    }

    // check whether the place is already taken
    if (board[n*row + col] !== ' ') {
        return null;
    }

    // TODO: Incorporate check for KO, that requires a history of boards though!

    var index = n*row + col;
    board = board.substr(0, index) + turn + board.substr(index + 1);

    // TODO: Remove dead stones!

    return board;
}

module.exports = {
    move: move
};
