(function () {
  "use strict";
  /*global angular */

  /**
   * This is the logic service for Cheat. The game state is represented by the
   * following elements:
   *      white, black, middle, claim, stage, "cards"
   *
   * White (player 0): It's an array and its elements are indexes of Cards indicating
   * the cards the white player are holding on.
   *
   * Black (player 1): It's an array and its elements are indexes of Cards indicating
   * the cards the black player are holding on.
   *
   * Middle: It's an array and its elements are indexes of Cards indicating
   * the cards in the middle area.
   *
   * Claim: An array with the following format [int, string] where the
   * first element is the number of cards and the second element is the rank of
   * the cards.
   *
   * Stage: "setUp", "doClaim", "claimCheater", "checkClaim", "endGame"
   *
   * "Cards": 52 objects representing 52 cards (no jokers) such as:
   * {key: "Card0", value: "C2"}
   * {key: "Card10", value: "DQ"}
   * {key: "Card20", value: "HK"}
   * {key: "Card30", value: "S6"}
   * {key: "Card40", value: null} // This card is not visible to the player...
   *
   * Here is the table of representation of suits and ranks in the game state:
   * Suits: CLUBS ---- C
   *        DIAMONDS - D
   *        HEARTS --- H
   *        SPADES --- S
   * Ranks: TWO ------ 2
   *        THREE ---- 3
   *        FOUR ----- 4
   *        FIVE ----- 5
   *        SIX ------ 6
   *        SEVEN ---- 7
   *        EIGHT ---- 8
   *        NINE ----- 9
   *        TEN ------ 10
   *        JACK ----- J
   *        QUEEN ---- Q
   *        KING ----- K
   *        ACE ------ A
   *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   *
   * There're four types of operations:
   *
   * (If there's a last claim, then the claimed rank must be close to or equal
   * to the last claimed rank...)
   * I. Doing a claim
   *      setTurn:
   *          0 - {setTurn: {turnIndex: 1}}
   *      setBoard:
   *          1 - {set: {key: 'white', value: [0, 1, 2, ..., 21] }}
   *          2 - {set: {key: 'middle', value: [22, 23, 24, 25] }}
   *      setClaim:
   *          3 - {set: {key: 'claim', value: [4, A] }}
   *      setState:
   *          4 - {set: {key: 'stage', value: STAGE.DECLARE_CHEATER }}
   *      setVisibility to all claimed cards:
   *          5 - 8  {setVisibility: {key: 'card22', visibleToPlayerIndexes: []}...
   *
   * (Must claim a cheater if the opponent has no cards in his hand...)
   * II. Claiming a cheater
   *    a. Claiming player 0 cheater
   *      setTurn:
   *          0 - {setTurn: {turnIndex: 1}}
   *      setState:
   *          1 - {set: {key: 'stage', value: STAGE.CHECK_CLAIM }}
   *      setVisibility of each card in the middle area to player 0:
   *          2 - 5 {setVisibility: {key: 'card22', visibleToPlayerIndexes: [0]}...
   *    b. Not claiming player 0 cheater
   *      setTurn:
   *          0 - {setTurn: {turnIndex: 1}}
   *      setState:
   *          1 - {set: {key: 'stage', value: STAGE.DO_CLAIM }}
   *
   * III. Check if we had a cheater (Can be skipped by not claiming a cheater)
   *    a. Player 0 is cheater
   *      setTurn:
   *          0 - {setTurn: {turnIndex: 1}}
   *      setBoard:
   *          1 - {set: {key: 'white', value: [0, 1, 2, ..., 25] }}
   *          2 - {set: {key: 'middle', value: [] }}
   *      setState:
   *          3 - {set: {key: 'stage', value: STAGE.DO_CLAIM }}
   *      setVisibility of each card in the middle area to player 0:
   *          4 - 7 {setVisibility: {key: 'card22', visibleToPlayerIndexes: [0]}...
   *    b. Player 0 is not cheater
   *      setTurn:
   *          0 - {setTurn: {turnIndex: 1}}
   *      setBoard:
   *          1 - {set: {key: 'black', value: [22, 23,..., 51] }}
   *          2 - {set: {key: 'middle', value: [] }}
   *      setState:
   *          3 - {set: {key: 'stage', value: STAGE.DO_CLAIM }}
   *      setVisibility of each card in the middle area to player 0:
   *          4 - 7 {setVisibility: {key: 'card22', visibleToPlayerIndexes: [1]}...
   *
   * IV. Win the game by get rid of all cards. (White player wins)
   *      endMatch:
   *          0 - {endMatch: {endMatchScores: [1, 0]}}
   *
   * V. Initial move
   *      setTurn:
   *          0 - {setTurn: {turnIndex: 0}}
   *      setBoard:
   *          1 - {set: {key: 'white', value: [0, 1, 2, ..., 25] }}
   *          2 - {set: {key: 'black', value: [26, 27, ..., 51] }}
   *          3 - {set: {key: 'middle', value: [] }}
   *      setStage:
   *          4 - {set: {key: 'stage', value: STAGE.DO_CLAIM }}
   *      setCards:
   *          5 - {set: {key: 'card0', value: "C2" }}...
   *          56 - {set: {key: 'card51', value: "SA" }}
   *      setVisibility:
   *          57 - {setVisibility: {key: 'card0', value: []}...
   *          108 - {setVisibility: {key: 'card52', value: []}
   *      shuffle
   *          109 - {shuffle: ["card0", ..., "card51"]}
   *
   * Note: Operation III, IV and V are automatically made in the right situation.
   */
  angular.module('myApp', []).factory('cheatLogicService',
      function () {
        /**
         * Check if the object is empty
         *
         * @param obj the object to be checked
         * @returns true if is empty, otherwise false.
         */
        function isEmptyObj(obj) {
          var prop;

          for (prop in obj) {
            if (obj.hasOwnProperty(prop)) {
              return false;
            }
          }

          return true;
        }

        // Stage
        var STAGE = {
          SET_UP: "SET_UP",
          DO_CLAIM: "DO_CLAIM",
          DECLARE_CHEATER: "DECLARE_CHEATER",
          CHECK_CLAIM: "CHECK_CLAIM",
          WIN: "WIN"
        };

        // Suit
        var SUIT = {
          DIAMONDS: "D",
          HEARTS: "H",
          SPADES: "S",
          CLUBS: "C"
        };

        // Rank
        var RANK = {
          TWO: '2',
          THREE: '3',
          FOUR: '4',
          FIVE: '5',
          SIX: '6',
          SEVEN: '7',
          EIGHT: '8',
          NINE: '9',
          TEN: '10',
          JACK: 'J',
          QUEEN: 'Q',
          KING: 'K',
          ACE: 'A'
        };

        /**
         * Get the rank score.
         * @param rank
         * @returns {number}
         */
        function getRankScore(rank) {
          switch (rank) {
            case '2':
              return 1;
            case '3':
              return 2;
            case '4':
              return 3;
            case '5':
              return 4;
            case '6':
              return 5;
            case '7':
              return 6;
            case '8':
              return 7;
            case '9':
              return 8;
            case '10':
              return 9;
            case 'J':
              return 10;
            case 'Q':
              return 11;
            case 'K':
              return 12;
            case 'A':
              return 13;
            default:
              throw new Error("Illegal rank!");
          }

        }

        /**
         * Concat two array by appending the later one to the former one...
         * @param array an array
         * @param append an array
         * @return array
         */
        Array.prototype.selfConcat = function(append) {
          for (var i = 0; i < append.length; i++) {
            this.push(append[i]);
          }
        };

        /**
         * Subtract elements from original arrays
         * @param elementsToRemove
         */
        Array.prototype.subtract = function(elementsToRemove) {
          var originalLength = this.length;
          check(this.containsAll(elementsToRemove));
          this.removeAll(elementsToRemove);
          check(originalLength === this.length + elementsToRemove.length);
        };

        /**
         * Check if the array contains all the elements.
         * @param elementsToCheck
         * @returns {boolean}
         */
        Array.prototype.containsAll = function(elementsToCheck) {
          for (var i = 0; i < elementsToCheck.length; i++) {
            if (this.indexOf(elementsToCheck[i]) == -1) {
              return false;
            }
          }
          return true;
        };

        /**
         * Remove all elements from the array
         * @param elementsToRemove
         */
        Array.prototype.removeAll = function(elementsToRemove) {
          for (var i = 0; i < elementsToRemove.length; i++) {
            var index = this.indexOf(elementsToRemove[i]);
            this.splice(index, 1);
          }
        };

        /**
         * Return a clone array
         * @returns {Array.<T>}
         */
        Array.prototype.clone = function() {
          return this.slice(0);
        };

        function check(val) {
          if (!val) {
            throw new Error('Fails the check!!!');
          }
        }

        /**
         * Get a card string according the index
         * @param i
         * @returns {*}
         */
        function getCard(i) {
          var suit,
            rank;

          if (i < 13) {
            suit = SUIT.CLUBS;
          } else if (i < 26) {
            suit = SUIT.DIAMONDS;
          } else if (i < 39) {
            suit = SUIT.HEARTS;
          } else if (i < 52) {
            suit = SUIT.SPADES;
          }

          switch (i % 13) {
            case 0:
              rank = RANK.TWO;
              break;
            case 1:
              rank = RANK.THREE;
              break;
            case 2:
              rank = RANK.FOUR;
              break;
            case 3:
              rank = RANK.FIVE;
              break;
            case 4:
              rank = RANK.SIX;
              break;
            case 5:
              rank = RANK.SEVEN;
              break;
            case 6:
              rank = RANK.EIGHT;
              break;
            case 7:
              rank = RANK.NINE;
              break;
            case 8:
              rank = RANK.TEN;
              break;
            case 9:
              rank = RANK.JACK;
              break;
            case 10:
              rank = RANK.QUEEN;
              break;
            case 11:
              rank = RANK.KING;
              break;
            case 12:
              rank = RANK.ACE;
              break;
          }

          return suit + rank;
        }

        /**
         * Check if the two rank are close by 1 or equal
         * @param rank
         * @param rankToCompare
         * @returns {boolean}
         */
        function isCloseRank(rank, rankToCompare) {
          var diff = Math.abs(getRankScore(rank) - getRankScore(rankToCompare));
          return diff <= 1;
        }

        function getWinner(state) {
          if (state.white.length === 0) {
            return 0;
          } else if (state.balck.length === 0) {
            return 1;
          } else {
            return -1;
          }
        }

        /**
         * Get the initial move which shuffles and deals all the cards.
         * @returns {Array}
         */
        function getInitialMove() {
          var operations = [],
            white = [],
            black = [],
            setCards = [],
            setVisibilities = [],
            shuffleKeys = [],
            i;

          for (i = 0; i < 26; i++) {
            white[i] = i;
          }
          for (i = 26; i < 52; i++) {
            black[i - 26] = i;
          }

          for (i = 0; i < 52; i++) {
            setCards[i] = {set: {key: 'card' + i, value: getCard(i)}};
            if (i < 26) {
              setVisibilities[i] = {setVisibility: {key: 'card' + i, visibleToPlayerIndexes: [0]}};
            } else {
              setVisibilities[i] = {setVisibility: {key: 'card' + i, visibleToPlayerIndexes: [1]}};
            }
            shuffleKeys[i] = 'card' + i;
          }

          operations.selfConcat([{setTurn: {turnIndex: 0}}]);
          operations.selfConcat([{set: {key: 'white', value: white}}]);
          operations.selfConcat([{set: {key: 'black', value: black}}]);
          operations.selfConcat([{set: {key: 'middle', value: []}}]);
          operations.selfConcat([{set: {key: 'stage', value: STAGE.DO_CLAIM}}]);
          operations.selfConcat(setCards);
          operations.selfConcat(setVisibilities);
          operations.selfConcat([{shuffle: {keys: shuffleKeys}}]);

          return operations;
        }

        /**
         * Get the move operations for declaring cheat
         * @param state
         * @param turnIndexBeforeMove
         * @returns {Array}
         */
        function getDeclareCheaterMove(state, turnIndexBeforeMove, lastMove) {
          var operations = [];
          check(lastMove[1].set.value === STAGE.DO_CLAIM || lastMove[1].set.value === STAGE.CHECK_CLAIM);
          if (lastMove[1].set.value === STAGE.DO_CLAIM) {
            // Skip declaring cheater if the opponent does not empty all cards
            if (turnIndexBeforeMove === 0) {
              // White
              check(state.black.length !== 0);
            } else {
              check(state.white.length !== 0);
            }
            operations.selfConcat([{setTurn: {turnIndex: turnIndexBeforeMove}}]);
            operations.selfConcat([{set: {key: 'stage', value: STAGE.DO_CLAIM }}]);
          } else if (lastMove[1].set.value === STAGE.CHECK_CLAIM) {
            // No skipping
            operations.selfConcat([{setTurn: {turnIndex: turnIndexBeforeMove}}]);
            operations.selfConcat([{set: {key: 'stage', value: STAGE.CHECK_CLAIM }}]);

            var setVisibilities = [];
            for (var i = 0; i < state.middle.length; i++) {
              setVisibilities.selfConcat([{setVisibility: {key: 'card' + state.middle[i], visibleToPlayerIndexes: [turnIndexBeforeMove]}}]);
            }
            operations.selfConcat(setVisibilities);
          }

          return operations;
        }

        /**
         * Check if the claim is indeed a cheat...
         * @param state
         * @returns {boolean}
         */
        function didCheat(state) {
          var lastClaim = state.claim;
          var lastM = state.middle;
          for (var i = lastM.length - 1; i >= lastM.length - lastClaim[0]; i--) {
            if (state['card' + lastM[i]].substring(1) !== lastClaim[1]) {
              return true;
            }
          }
          return false;
        }

        function getMoveCheckIfCheated(state, turnIndexBeforeMove, lastMove) {
          var loserIndex = didCheat(state) ? 1 - turnIndexBeforeMove : turnIndexBeforeMove,
            loserCards = [],
            loserNewCards,
            operations = [],
            setVisibilities = [];

          if (loserIndex === 0) {
            loserCards = state.white;
          } else {
            loserCards = state.black;
          }
          loserNewCards = loserCards.concat(state.middle);

          operations.selfConcat([{setTurn: {turnIndex: 1 - turnIndexBeforeMove}}]);

          if (loserIndex === 0) {
            operations.selfConcat([{set: {key: 'white', value: loserNewCards}}]);
          } else {
            operations.selfConcat([{set: {key: 'black', value: loserNewCards}}]);
          }

          operations.selfConcat([{set: {key: 'middle', value: []}}]);
          operations.selfConcat([{set: {key: 'stage', value: STAGE.DO_CLAIM}}]);

          for (var i = 0; i < state.middle.length; i++) {
            if (loserIndex === 0) {
              setVisibilities.selfConcat([{setVisibility: {key: 'card' + state.middle[i], visibleToPlayerIndexes: [0]}}]);
            } else {
              setVisibilities.selfConcat([{setVisibility: {key: 'card' + state.middle[i], visibleToPlayerIndexes: [1]}}]);
            }
          }

          operations.selfConcat(setVisibilities);

          return operations;
        }

        function getClaimMove(state, turnIndexBeforeMove, claim, cardsToMoveToMiddle) {
          // First check if number of cards claimed is legal and the number of
          // cards move to middle match the number of cards claimed
          check(cardsToMoveToMiddle.length >= 1 && cardsToMoveToMiddle.length <= 4);
          check(cardsToMoveToMiddle.length === claim[0]);

          var lastClaim = state.claim,
            lastWorB,
            newWorB,
            lastM,
            newM;

          if (!angular.isUndefined(lastClaim)) {
            // If the last claim exists, the rank of the latest claim must be
            // close or equal to the last claim.
            check(isCloseRank(lastClaim[1], claim[1]));
          }

          // Get the cards of the player who makes the claim
          if (turnIndexBeforeMove === 0) {
            lastWorB = state.white;
          } else {
            lastWorB = state.black;
          }

          newWorB = lastWorB.clone();
          newWorB.subtract(cardsToMoveToMiddle);

          lastM = state.middle;
          newM = lastM.concat(cardsToMoveToMiddle);

          var operations = [];
          operations.selfConcat([{setTurn: {turnIndex: 1 - turnIndexBeforeMove}}]);
          if (turnIndexBeforeMove === 0) {
            operations.selfConcat([{set: {key: 'white', value: newWorB}}]);
            operations.selfConcat([{set: {key: 'middle', value: newM}}]);
          } else {
            operations.selfConcat([{set: {key: 'black', value: newWorB}}]);
            operations.selfConcat([{set: {key: 'middle', value: newM}}]);
          }
          var setVisibilities = [];
          for (var i = 0; i < cardsToMoveToMiddle.length; i++) {
            setVisibilities.selfConcat([{setVisibility: {key: 'card' + cardsToMoveToMiddle[i], visibleToPlayerIndexes: []}}]);
          }
          operations.selfConcat([{set: {key: 'claim', value: claim}}]);
          operations.selfConcat([{set: {key: 'stage', value: STAGE.DECLARE_CHEATER }}]);
          operations.selfConcat(setVisibilities);

          return operations;
        }

        function getWinMove(state) {
          var winner = getWinner(state);
          if (winner === 0) {
            return [{endMatch: {endMatchScores: [1, 0]}}]
          } else if (winner === 1) {
            return [{endMatch: {endMatchScores: [0, 1]}}]
          }
          throw new Error("No one wins!")
        }

        /**
         * Check if the move is OK.
         *
         * @param params the match info which contains stateBeforeMove,
         *              stateAfterMove, turnIndexBeforeMove, turnIndexAfterMove,
         *              move.
         * @returns return true if the move is ok, otherwise false.
         */
        function isMoveOk(params) {
          var stateBeforeMove = params.stateBeforeMove,
            turnIndexBeforeMove = params.turnIndexBeforeMove,
            move = params.move,
            expectedMove;

          /*********************************************************************
           * 1. If the stateBeforeMove is empty, then it should be the first
           *    move, set the board of stateBeforeMove to be the initial board.
           *    If the stateBeforeMove is not empty, then the move operations
           *    array should have a length of 4.
           ********************************************************************/

          try {
            switch (params.stateBeforeMove.stage) {
              case STAGE.DO_CLAIM:
                var claim = move[3].set.value;
                var lastM = stateBeforeMove.middle;
                var newM = move[2].set.value;
                var diffM = newM.clone();
                diffM.subtract(lastM);
                expectedMove = getClaimMove(stateBeforeMove, turnIndexBeforeMove, claim, diffM);
                break;
              case STAGE.DECLARE_CHEATER:
                expectedMove = getDeclareCheaterMove(stateBeforeMove, turnIndexBeforeMove, move);
                break;
              case STAGE.CHECK_CLAIM:
                expectedMove = getMoveCheckIfCheated(stateBeforeMove, turnIndexBeforeMove, move);
                break;
              case STAGE.WIN:
                expectedMove = getWinMove(stateBeforeMove);
                break;
              default:
                if (turnIndexBeforeMove != 0 || angular.isUndefined(stateBeforeMove)) {
                  throw new Error("Illegal initial move!");
                }
                expectedMove = getInitialMove();
                break;
            }
          } catch (e) {
            return false;
          }

          if (!angular.equals(move, expectedMove)) {
            console.log("=========MoveToCheck=========");
            console.log(JSON.stringify(move));
            console.log("=========ExpectMove=========");
            console.log(JSON.stringify(expectedMove));
            console.log("=========END=========");

            return false;
          }

          return true;
        }

        return {
          isMoveOk: isMoveOk,
          getCard: getCard,
          STAGE: STAGE
        };
      });
}());