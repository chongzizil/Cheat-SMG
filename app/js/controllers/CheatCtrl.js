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
  angular.module('myApp').controller('CheatCtrl',
      ['$scope', '$animate', '$timeout', '$q', 'cheatLogicService', 'gameService',
        function ($scope, $animate, $timeout, $q, cheatLogicService, gameService) {

        // Test state
        //$scope.state = {};
        //$scope.state.white = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        //$scope.state.black = [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51];
        //$scope.state.middle = [22, 23, 24, 25];
        //$scope.state.stage = cheatLogicService.STAGE.DO_CLAIM;
        //for (var i = 0; i < 52; i++) {
        //  $scope.state['card' + i] = cheatLogicService.getCard(i);
        //}
        //  console.log(JSON.stringify($scope.state));

        $scope.getCardDataValue = function(i) {
          var dataValue = " ";
          if ($scope.state['card' + i] !== null) {
            var card = $scope.state['card' + i];
            var suit = card.substring(0, 1);
            var suitChar;
            var rank = card.substring(1);
            switch (suit) {
              case "D":
                suitChar = '\u2666';
                break;
              case "H":
                suitChar = "\u2764";
                break;
              case "S":
                suitChar = "\u2660";
                break;
              case "C":
                suitChar = "\u2663";
                break;
            }
            dataValue = rank + " " + suitChar;
          }

          return dataValue;
        };

        /**
         * This method update the game's UI.
         * @param params
         */
        function updateUI(params) {
          var turnIndexBeforeMove = params.turnIndexBeforeMove;
          // Get the new state
          $scope.state = params.stateAfterMove;
          $scope.yourPlayerIndex = params.yourPlayerIndex;

          if (cheatLogicService.isEmptyObj($scope.state)) {
            // Initialize the board...
            gameService.makeMove(cheatLogicService.getInitialMove());
          } else {
            $scope.isYourTurn = params.turnIndexAfterMove >= 0 && // game is ongoing
            params.yourPlayerIndex === params.turnIndexAfterMove; // it's my turn

            $scope.isAiMode = $scope.isYourTurn
            && params.playersInfo[params.yourPlayerIndex].playerId === '';

            if ($scope.isAiMode) {
              $scope.isYourTurn = false;
              // Wait 500 milliseconds until animation ends.
              $timeout(aiMakeMove, 500);
            }
          }
        }

        // Before getting any updateUI, we show an empty board to a viewer (so you can't perform moves).
        //updateUI({playMode: "passAndPlay", stateAfterMove: {}, turnIndexAfterMove: 0, yourPlayerIndex: -2});

        /**
         * Set the game!
         */
        gameService.setGame({
          gameDeveloperEmail: "yl1949@nyu.edu",
          minNumberOfPlayers: 2,
          maxNumberOfPlayers: 2,
          //exampleGame: checkersLogicService.getExampleGame(),
          //riddles: checkersLogicService.getRiddles(),
          isMoveOk: cheatLogicService.isMoveOk,
          updateUI: updateUI
        });
      }]);
}());