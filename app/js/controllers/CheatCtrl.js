(function () {
  'use strict';
  /*global angular, platform, Audio */

  /**
   * This is the controller for Checkers.
   *
   * TO be clear in case of confusion, the state has two different format in the
   * controller:
   *
   * TO be clear, the state has two different format in the controller:
   * 1. uiState: It's represented as an array of objects with length of 64. Each
   *             element is a square which contains all its information such as
   *             is it a white crown (king) or black crown (king).
   *             Unlike the game API state, All light squares are also stored.
   * e.g. [{
   *         isBlackMan: boolean,
   *         isBlackCro: boolean,
   *         isWhiteMan: boolean,
   *         isWhiteCro: boolean,
   *         isEmpty: boolean,
   *         isDark: boolean,
   *         isLight: boolean,
   *         canSelect: boolean,
   *         isSelected: boolean,
   *         // Background image path
   *         bgSrc: string,
   *         // Piece image path
   *         pieceSrc: string
   *      }...]
   *
   * 2. GameApiState: It's represented as an object. The game board within is a
   *                  two dimensional array (8*8).
   *
   *             0     1     2     3     4     5     6     7
   * 0:even  [['--', 'BM', '--', 'BM', '--', 'BM', '--', 'BM'],
   * 1:odd    ['BM', '--', 'BM', '--', 'BM', '--', 'BM', '--'],
   * 2:even   ['--', 'BM', '--', 'BM', '--', 'BM', '--', 'BM'],
   * 3:odd    ['DS', '--', 'DS', '--', 'DS', '--', 'DS', '--'],
   * 4:even   ['--', 'DS', '--', 'DS', '--', 'DS', '--', 'DS'],
   * 5:odd    ['WM', '--', 'WM', '--', 'WM', '--', 'WM', '--'],
   * 6:even   ['--', 'WM', '--', 'WM', '--', 'WM', '--', 'WM'],
   * 7:odd    ['WM', '--', 'WM', '--', 'WM', '--', 'WM', '--']]
   */
  angular.module('myApp').controller('CheckersCtrl',
      ['$scope', '$animate', '$timeout', '$location', '$q',
        'checkersLogicService', 'checkersAiService', 'constantService', 'gameService',
        function ($scope, $animate, $timeout, $location, $q,
                  checkersLogicService, checkersAiService, constantService, gameService) {
        var CONSTANT = constantService,
          moveAudio,
          board,
          selectedSquares = [];

          moveAudio = new Audio('audio/move.wav');
          moveAudio.load();

        /**
         * Check if the square of the delta is dark square
         * @param row
         * @param col
         * @returns {boolean}
         */
        function isDarkSquare(row, col) {
          var isEvenRow = false,
            isEvenCol = false;

          isEvenRow = row % 2 === 0;
          isEvenCol = col % 2 === 0;

          return ((!isEvenRow && isEvenCol) || (isEvenRow && !isEvenCol));
        }

        /**
         * Convert the delta to UI state index
         * @param row
         * @param col
         * @returns {*}
         */
        $scope.convertDeltaToUiIndex = function(row, col) {
          return row * CONSTANT.COLUMN + col;
        };

        /**
         * Return the id of a square. Basically it's the same as
         * $scope.convertDeltaToUiIndex... Just adds process of rotate...
         * @param row
         * @param col
         * @returns {*}
         */
        $scope.getId = function(row, col) {
          if ($scope.needRotate) {
            row = 7 - row;
            col = 7 - col;
          }
          return row * CONSTANT.COLUMN + col;
        };

        /**
         * Convert the UI state index to delta object
         * @param uiIndex
         * @returns {{row: number, col: number}}
         */
        function convertUiIndexToDelta(uiIndex) {
          var delta = {row: -1, col: -1};

          delta.row = Math.floor(uiIndex / CONSTANT.ROW);
          delta.col = uiIndex % CONSTANT.COLUMN;

          return delta;
        }

        /**
         * Set all squares unselectable.
         */
        function setAllSquareUnselectable() {
          var i;

          for (i = 0; i < CONSTANT.ROW *
              CONSTANT.COLUMN; i += 1) {
            $scope.uiState[i].canSelect = false;
          }
        }

        /**
         * return the square object of the ui state.
         * @returns square object of the ui state
         */
        $scope.getSquare = function(row, col) {
          // If the board need to rotate 180 degrees, simply change the row and
          // column for the UI... ($scope.uiState remains intact)
          if ($scope.needRotate) {
            row = 7 - row;
            col = 7 - col;
          }
          var index = $scope.convertDeltaToUiIndex(row, col);
          return $scope.uiState[index];
        };

        /**
         * Get the indexes necessary for the animation.
         *
         * @returns {{
         *             fromUiIndex: number,
         *             toUiIndex: number,
         *             jumpedUiIndex: number,
         *             column: number
         *          }}
         */
        function getAnimationIndexes() {
          var fromUiIndex = selectedSquares[0],
            toUiIndex = selectedSquares[1],
            jumpedUiIndex = -1,
            fromDelta = convertUiIndexToDelta(fromUiIndex),
            toDelta = convertUiIndexToDelta(toUiIndex),
            jumpDelta = checkersLogicService.getJumpedDelta(
              fromDelta,
              toDelta
            );

          jumpedUiIndex =
              $scope.convertDeltaToUiIndex(jumpDelta.row, jumpDelta.col);

          return {
            fromUiIndex: fromUiIndex,
            toUiIndex: toUiIndex,
            jumpedUiIndex: jumpedUiIndex,
            column: CONSTANT.COLUMN
          };
        }

        /**
         * Add animation class so the animation may be performed accordingly
         *
         * @param callback makeMove function which will be called after the
         *                 animation is completed.
         */
        function addAnimationClass(callback) {
          var animationIndexes = getAnimationIndexes(),
            column = animationIndexes.column,
            fromUiIndex = animationIndexes.fromUiIndex,
            toUiIndex = animationIndexes.toUiIndex,
            jumpedUiIndex = animationIndexes.jumpedUiIndex;

          // Add the corresponding animation class
          switch (toUiIndex - fromUiIndex) {
          case -column - 1:
            // Simple move up left
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'move_down_right', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'move_up_left', callback);
            }
            break;
          case -column + 1:
            // Simple move up right
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'move_down_left', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'move_up_right', callback);
            }
            break;
          case column - 1:
            // Simple move down left
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'move_up_right', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'move_down_left', callback);
            }
            break;
          case column + 1:
            // Simple move down right
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'move_up_left', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'move_down_right', callback);
            }
            break;
          case -(2 * column) - 2:
            // Jump move up left
            $animate.addClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'jump_down_right', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'jump_up_left', callback);
            }
            break;
          case -(2 * column) + 2:
            // Jump move up right
            $animate.addClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'jump_down_left', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'jump_up_right', callback);
            }
            break;
          case (2 * column) - 2:
            // Jump move down left
            $animate.addClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'jump_up_right', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'jump_down_left', callback);
            }
            break;
          case (2 * column) + 2:
            // Jump move down right
            $animate.addClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.addClass(('#' + fromUiIndex), 'jump_up_left', callback);
            } else {
              $animate.addClass(('#' + fromUiIndex), 'jump_down_right', callback);
            }
            break;
          }
        }

        /**
         * remove animation class when the animation finishes.
         */
        function removeAnimationClass() {
          var animationIndexes = getAnimationIndexes(),
            column = animationIndexes.column,
            fromUiIndex = animationIndexes.fromUiIndex,
            toUiIndex = animationIndexes.toUiIndex,
            jumpedUiIndex = animationIndexes.jumpedUiIndex;

          // remove the corresponding animation class
          switch (toUiIndex - fromUiIndex) {
          case -column - 1:
            // Simple move up left
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'move_down_right');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'move_up_left');
            }
            break;
          case -column + 1:
            // Simple move up right
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'move_down_left');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'move_up_right');
            }
            break;
          case column - 1:
            // Simple move down left
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'move_up_right');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'move_down_left');
            }
            break;
          case column + 1:
            // Simple move down right
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'move_up_left');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'move_down_right');
            }
            break;
          case -(2 * column) - 2:
            // Jump move up left
            $animate.removeClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'jump_down_right');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'jump_up_left');
            }
            break;
          case -(2 * column) + 2:
            // Jump move up right
            $animate.removeClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'jump_down_left');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'jump_up_right');
            }
            break;
          case (2 * column) - 2:
            // Jump move down left
            $animate.removeClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'jump_up_right');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'jump_down_left');
            }
            break;
          case (2 * column) + 2:
            // Jump move down right
            $animate.removeClass(('#' + jumpedUiIndex), 'jumped');
            if ($scope.needRotate) {
              $animate.removeClass(('#' + fromUiIndex), 'jump_up_left');
            } else {
              $animate.removeClass(('#' + fromUiIndex), 'jump_down_right');
            }
            break;
          }
          // Initialize the selectedSquares after the animation class is removed
          selectedSquares = [];
        }

        /**
         * For each piece, set its property 'canSelect' to true only if it can
         * makes a jump move or a simple move if there's no mandatory jumps.
         */
        function setInitialSelectableSquares() {
          var uiIndex,
            row,
            col,
            darkUiSquare,
            possibleMoves,
            delta,
            hasMandatoryJump = checkersLogicService
                .hasMandatoryJumps(board, $scope.yourPlayerIndex);

          // First reset all squares to unselectable.
          setAllSquareUnselectable();

          for (row = 0; row < CONSTANT.ROW; row += 1) {
            for (col = 0; col < CONSTANT.COLUMN; col += 1) {
              // Check all dark squares
              if (isDarkSquare(row, col)) {
                uiIndex = $scope.convertDeltaToUiIndex(row, col);
                darkUiSquare = $scope.uiState[uiIndex];
                delta = {row: row, col: col};
                // If there exists a piece within the darkUiSquare and is the
                // current player's color, then check if it can make a move,
                // otherwise set it's 'canSelect' property to false.
                if (checkersLogicService.isOwnColor($scope.yourPlayerIndex,
                    board[row][col].substr(0, 1))) {

                  // If there's at least one mandatory jump, then only check the
                  // possible jump moves.
                  if (hasMandatoryJump) {
                    possibleMoves = checkersLogicService
                        .getJumpMoves(board, delta, $scope.yourPlayerIndex);
                  } else {
                    possibleMoves = checkersLogicService
                        .getSimpleMoves(board, delta, $scope.yourPlayerIndex);
                  }

                  // If there's at least one possible move, then the
                  // darkUiSquare can be select.
                  if (possibleMoves.length > 0) {
                    darkUiSquare.canSelect = true;
                  } else {
                    darkUiSquare.canSelect = false;
                  }
                } else {
                  // It's not the player's piece, so can not be selected.
                  darkUiSquare.canSelect = false;
                }
              }
            }
          }
        }

        /**
         * Set the possible move destination squares' canSelect to true and
         * others remain the same.
         *
         * @param squareUiIndex the square selected.
         */
        function setSelectableSquares(squareUiIndex) {
          var i,
            fromDelta,
            row,
            col,
            uiIndex,
            possibleMoves;

          fromDelta = convertUiIndexToDelta(squareUiIndex);
          possibleMoves =
              checkersLogicService.getAllPossibleMoves(board, fromDelta,
                    $scope.yourPlayerIndex);

          if (possibleMoves.length > 0) {
            // If the possible moves are jump moves, then only keep the
            // destination square indexes.
            for (i = 0; i < possibleMoves.length; i += 1) {
              row = possibleMoves[i].row;
              col = possibleMoves[i].col;
              uiIndex = $scope.convertDeltaToUiIndex(row, col);
              $scope.uiState[uiIndex].canSelect = true;
            }
          }
        }

        /**
         * Update the square of the UI state according to the new square of
         * the game API state in order to update the graphics.
         *
         * @param gameApiSquare the square of the game API state.
         * @param uiSquare the square of the UI state.
         */
        function updateUiSquare(gameApiSquare, uiSquare) {
          // Reset the information of the content within the square
          uiSquare.isEmpty = false;
          uiSquare.isBlackMan = false;
          uiSquare.isBlackCro = false;
          uiSquare.isWhiteMan = false;
          uiSquare.isWhiteCro = false;
          uiSquare.canSelect = false;
          uiSquare.isSelected = false;

          switch (gameApiSquare) {
          case CONSTANT.WHITE_MAN:
            uiSquare.isWhiteMan = true;
            uiSquare.pieceSrc = 'img/white_man';
            break;
          case CONSTANT.WHITE_KING:
            uiSquare.isWhiteCro = true;
            uiSquare.pieceSrc = 'img/white_cro';
            break;
          case CONSTANT.BLACK_MAN:
            uiSquare.isBlackMan = true;
            uiSquare.pieceSrc = 'img/black_man';
            break;
          case CONSTANT.BLACK_KING:
            uiSquare.isBlackCro = true;
            uiSquare.pieceSrc = 'img/black_cro';
            break;
          default:
            uiSquare.isEmpty = true;
            uiSquare.pieceSrc = 'img/empty';
          }
        }

          /**
         * Initialize the game, in another word create an empty board.
         *
         * For each square, it is represented as an object in the ui state:
         * e.g. [{
         *        isBlackMan: boolean,
         *        isBlackCro: boolean,
         *        isWhiteMan: boolean,
         *        isWhiteCro: boolean,
         *        isEmpty: boolean,
         *        isDark: boolean,
         *        isLight: boolean,
         *        canSelect: boolean,
         *        isSelected: boolean,
         *        // Background image path
         *        bgSrc: string,
         *        // Piece image path
         *        pieceSrc: string
         *       }...]
         */
        function initializeUiState() {
          // Initialize the ui state as an array first
          $scope.uiState = [];

          var lightUiSquare,
            darkUiSquare,
            defaultUiSquare = {
              isBlackMan: false,
              isBlackCro: false,
              isWhiteMan: false,
              isWhiteCro: false,
              isEmpty: true,
              isDark: false,
              isLight: false,
              canSelect: false,
              isSelected: false,
              bgSrc: '',
              pieceSrc: 'img/empty'
            },
            row,
            col,
            uiSquareIndex;

          // Each time initialize two square at once, one dark and one light
          for (row = 0; row < CONSTANT.ROW; row += 1) {
            for (col = 0; col < CONSTANT.COLUMN; col += 1) {
              if (isDarkSquare(row, col)) {
                // Dark square
                darkUiSquare = angular.copy(defaultUiSquare);

                darkUiSquare.isDark = true;
                darkUiSquare.bgSrc = 'img/dark_square.png';

                uiSquareIndex = $scope.convertDeltaToUiIndex(row, col);
                $scope.uiState[uiSquareIndex] = darkUiSquare;
              } else {
                // Light square
                lightUiSquare = angular.copy(defaultUiSquare);

                lightUiSquare.isLight = true;
                lightUiSquare.bgSrc = 'img/light_square.png';
                // Since light square will not be used and clicked, no piece
                // image will be set for it.
                lightUiSquare.isEmpty = false;
                lightUiSquare.pieceSrc = '';

                uiSquareIndex = $scope.convertDeltaToUiIndex(row, col);
                $scope.uiState[uiSquareIndex] = lightUiSquare;
              }
            }
          }
        }

        /**
         * Update the UI state after the last move.
         */
        function updateUiState() {
          var deferred = $q.defer(),
            gameApiSquare,
            darkUiSquare,
            darkUiSquareIndex,
            fromUiIndex,
            toUiIndex,
            jumpedUiIndex,
            fromDelta,
            toDelta,
            jumpedDelta,
            row,
            col;

          if (selectedSquares.length === 0) {
            // If the selectedSquares is empty, then the last move should be the
            // first move made by the black player in order to initialize th
            // game. So update each dark squares.
            for (row = 0; row < CONSTANT.ROW; row += 1) {
              for (col = 0; col < CONSTANT.COLUMN; col += 1) {
                gameApiSquare = board[row][col];
                if (isDarkSquare(row, col)) {
                  darkUiSquareIndex = $scope.convertDeltaToUiIndex(row, col);
                  darkUiSquare = $scope.uiState[darkUiSquareIndex];
                  updateUiSquare(gameApiSquare, darkUiSquare);
                }
              }
            }
          } else {
            // It's not the first move, so check the selectedSquares for the
            // squares need to be updated.

            // UI state index
            fromUiIndex = selectedSquares[0];
            toUiIndex = selectedSquares[1];
            jumpedUiIndex = -1;

            // Game API state index
            fromDelta = convertUiIndexToDelta(fromUiIndex);
            toDelta = convertUiIndexToDelta(toUiIndex);

            // Get the jumped square's index. If it's a simple move, then this
            // index is illegal, yet will not be used.
            jumpedDelta =
                checkersLogicService.getJumpedDelta(fromDelta, toDelta);

            // Update those squares
            updateUiSquare(board[fromDelta.row][fromDelta.col],
                $scope.uiState[fromUiIndex]);
            updateUiSquare(board[toDelta.row][toDelta.col],
                $scope.uiState[toUiIndex]);
            if (jumpedDelta.row !== -1) {
              jumpedUiIndex = $scope.convertDeltaToUiIndex(jumpedDelta.row,
                  jumpedDelta.col);

              updateUiSquare(board[jumpedDelta.row][jumpedDelta.col],
                  $scope.uiState[jumpedUiIndex]);
            }
          }

          // In case the board is not updated
          if (!$scope.$$phase) {
            $scope.$apply();
          }

          deferred.resolve('Success');

          return deferred.promise;
        }

        /**
         * Update the graphics (UI state) according to the new game API state
         * and set initial selectable squares.
         *
         * @param isAiMode true if it's in ai mode
         * @param callback callback function
         */
        function updateCheckersGraphics(isAiMode, callback) {
          // Update the board first, when the graphics is updated then move on
          updateUiState().then(function () {
            // Remove the animation classes, whether the animation class is
            // added or not (is Dnd or not) before is not important. Otherwise
            // the square image with the unmoved animation class will not be
            // placed in the right position even if the image is correct.
            if (selectedSquares.length !== 0) {
              removeAnimationClass();
            }

            // If the state is not empty, then set the the selectablility for
            // each square.
            if (!checkersLogicService.isEmptyObj(board)) {
              if (isAiMode && $scope.yourPlayerIndex === 1) {
                // It's ai's turn, the player can not select any squares
                setAllSquareUnselectable();
              } else {
                // It's not in ai's mode nor ai's turn, so set selectable
                // squares according to the player index.
                setInitialSelectableSquares($scope.yourPlayerIndex);
              }
            }
            // Call the callback function
            callback();
          });
        }

        /**
         * This function will play the animation by adding proper class to the
         * element if the move is not made by drag and drop. During the
         * animation all squares will also be set to unselectable.
         *
         * @param isDnD true if the move is made by drag and drop, otherwise
         *              false
         * @param callback makeMove function which will be called after the
         *                 animation is completed.
         */
        function playAnimation(isDnD, callback) {
          // Disable all squares, so the player can not click any squares before
          // the move is done and the board is updated.
          setAllSquareUnselectable();

          // If the move is made by drag and drop, just call the callback
          // function
          if (isDnD) {
            callback();
            return;
          }

          // Add the animation class in order to play the animation
          addAnimationClass(callback);
        }

        /**
         * Make the move by first playing the sound effect, then send the
         * corresponding operations to the makeMoveCallback.
         *
         * @param isDnD true if the move is made by drag and drop, otherwise
         *              false
         */
        function makeMove(isDnD) {
          // Play the animation first!!!
          playAnimation(isDnD, function () {
            // Callback function. It's called when the animation is completed.
            var operations,
              fromDelta = convertUiIndexToDelta(selectedSquares[0]),
              toDelta = convertUiIndexToDelta(selectedSquares[1]);

//            console.log('Move delta: '
//                + ($scope.yourPlayerIndex === 0 ? 'Black' : 'White')
//                + ' Move from [' + fromDelta.row + ', ' + fromDelta.col
//                + '] to [' + toDelta.row + ', ' + toDelta.col + ']');

            // Get the operations
            operations = checkersLogicService
                .createMove(angular.copy(board),
                fromDelta, toDelta, $scope.yourPlayerIndex);

            // Now play the audio.
            moveAudio.play();
            gameService.makeMove(operations);
          });
        }

        /**
         * Select a piece, change the validation of all squares accordingly and
         * send the move if the move is complete and valid.
         *
         * @param index the piece selected.
         * @param isDnD is drag and drop or is not
         */
        $scope.cellClicked = function (row, col, isDnD) {
          if ($scope.needRotate) {
            row = 7 - row;
            col = 7 - col;
          }

          var index = row * CONSTANT.ROW + col,
            square = $scope.uiState[index],
            currSelectedDelta = convertUiIndexToDelta(index),
            prevSelectedDelta;

          $scope.isYourTurn = false; // to prevent making another move

          // Proceed only if it's dark square and it's selectable.
          if (square.isDark && square.canSelect) {
            if (selectedSquares.length === 0 && !square.isEmpty) {
              // If no piece is selected, select it
              square.isSelected = true;
              selectedSquares[0] = index;

              setSelectableSquares(index);
            } else if (selectedSquares.length === 1) {
              // One square is already selected
              prevSelectedDelta = convertUiIndexToDelta(selectedSquares[0]);
              if (checkersLogicService
                  .getColor(board[currSelectedDelta.row][currSelectedDelta.col])
                  === checkersLogicService.getColor(
                    board[prevSelectedDelta.row][prevSelectedDelta.col]
                  )) {
                // It the second selected piece is still the player's, no matter
                // it's the same one or a different one, just change the first
                // selected square to the new one.
                $scope.uiState[selectedSquares[0]].isSelected = false;
                square.isSelected = true;
                selectedSquares[0] = index;

                // Reinitialize all the selectable squares
                setInitialSelectableSquares();
                // Set the new selectable squares according to the selected one
                setSelectableSquares(index);

              } else if (square.isEmpty) {
                // If the second selected is an empty square
                selectedSquares[1] = index;
              }
            }

            // If two squares are selected, then a move can be made
            if (selectedSquares.length === 2) {
              $scope.uiState[selectedSquares[0]].isSelected = false;

              makeMove(isDnD);
            }
          }
        };

        /**
         * Handle the drag start, which select the dragged piece and set valid
         * droppable squares.
         *
         * @param index the index of the dragged piece
         */
        $scope.handleDragStart = function (index) {
          var square = $scope.uiState[index],
            isDnD = true;
          if (square.isDark && square.canSelect) {
            var delta = convertUiIndexToDelta(index);
            // Since the index/id passed in maybe changed if the board is
            // rotated... so I have to change them back because cellClicked will
            // process them one more time... This is unnecessary and will be
            // refactored in the future... (I guess)
            if ($scope.needRotate) {
              delta.row = 7 - delta.row;
              delta.col = 7 - delta.col;
            }
            $scope.cellClicked(delta.row, delta.col, isDnD);
          }
        };

        /**
         * Handle the drop event, which select the piece being dropped on and
         * makes the move without animation.
         *
         * @param index the index of the dropped on piece
         */
        $scope.handleDrop = function (index) {
          var square = $scope.uiState[index],
            isDnD = true;
          if (square.isDark && square.canSelect) {
            var delta = convertUiIndexToDelta(index);
            // Since the index/id passed in maybe changed if the board is
            // rotated... so I have to change them back because cellClicked will
            // process them one more time... This is unnecessary and will be
            // refactored in the future... (I guess)
            if ($scope.needRotate) {
              delta.row = 7 - delta.row;
              delta.col = 7 - delta.col;
            }
            $scope.cellClicked(delta.row, delta.col, isDnD);
          }
          // The target is not droppable, nothing will happen.
        };

        /**
         * This function use the alpha beta pruning algorithm to calculate a
         * best move for the ai, then make the move and play the animation and
         * sound effect.
         */
        function aiMakeMove() {
          var isDnD = false,
            bestMove,
            depth = 10,
            timeLimit = 800,
            timer = {
              startTime: Date.now(),
              timeLimit: timeLimit
            };

          // Move on only after the best move is calculated.
          checkersAiService.
              findBestMove(angular.copy(board),
              $scope.yourPlayerIndex, depth, timer)
              .then(function (data) {
              bestMove = data;
              // Set the selected squares according to the best move.
              selectedSquares = [
                $scope.convertDeltaToUiIndex(bestMove[0].row, bestMove[0].col),
                $scope.convertDeltaToUiIndex(bestMove[1].row, bestMove[1].col)
              ];
              makeMove(isDnD);
            });
        }

        /**
         * This method update the game's UI.
         * @param params
         */
        function updateUI(params) {
          // If the play mode is neither pass and play nor play against the
          // computer, then "rotate" the board for the player. Therefore the
          // board will always look from the point of view of the player in
          // single player mode...
          if (params.playMode === "playAgainstTheComputer"
              || (params.playMode !== "passAndPlay" && params.playMode !== "playAgainstTheComputer" &&
              params.yourPlayerIndex === 0)) {
            // Since the first player will be the black player, so in ai mode
            // and multi-window for black player, the board will rotate...
            $scope.needRotate = true;
          } else {
            $scope.needRotate = false;
          }

          var turnIndexBeforeMove = params.turnIndexBeforeMove;
          // Get the new state
          board = params.stateAfterMove.board;
          $scope.yourPlayerIndex = params.yourPlayerIndex;
          $scope.playersInfo = params.playersInfo;

          if (board === undefined) {
            // Initialize the board...
            //gameService.makeMove(checkersLogicService.getFirstMove());
            board = checkersLogicService.getInitialBoard();
            initializeUiState();
            updateUiState();
            setInitialSelectableSquares();
            $scope.yourPlayerIndex = 0;
          } else {
            $scope.isYourTurn = params.turnIndexAfterMove >= 0 && // game is ongoing
            params.yourPlayerIndex === params.turnIndexAfterMove; // it's my turn

            $scope.isAiMode = $scope.isYourTurn
            && params.playersInfo[params.yourPlayerIndex].playerId === '';

            // The game is properly initialized, let's make a move :)
            // But first update the graphics (isAiMode: true)
            updateCheckersGraphics($scope.isAiMode, function () {
              // If it's the AI mode and it's the AI turn, then let the AI
              // makes the move.

              if ($scope.isAiMode) {
                $scope.isYourTurn = false;
                // Wait 500 milliseconds until animation ends.
                $timeout(aiMakeMove, 500);
              }
            });
          }
        }

        // Before getting any updateUI, we show an empty board to a viewer (so you can't perform moves).
        updateUI({playMode: "passAndPlay", stateAfterMove: {}, turnIndexAfterMove: 0, yourPlayerIndex: -2});

        /**
         * Set the game!
         */
        gameService.setGame({
          gameDeveloperEmail: "yl1949@nyu.edu",
          minNumberOfPlayers: 2,
          maxNumberOfPlayers: 2,
          //exampleGame: checkersLogicService.getExampleGame(),
          //riddles: checkersLogicService.getRiddles(),
          isMoveOk: checkersLogicService.isMoveOk,
          updateUI: updateUI
        });
      }]);
}());