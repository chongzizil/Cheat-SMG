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
      ['$scope', '$animate', '$timeout', '$q', 'cheatLogicService', 'gameService', 'scaleBodyService',
      function ($scope, $animate, $timeout, $q, cheatLogicService, gameService, scaleBodyService) {
        // Get the stage objects for convenience
        var STAGE = cheatLogicService.STAGE;

        // Return true if the card (index) is selected
        $scope.isSelected = function(card) {
          return $scope.selectedCards.indexOf(card) !== -1;
        };

        // Return true if at least one card is selected
        $scope.hasSelectedCards = function() {
          return $scope.selectedCards.length > 0;
        };

        // Select a card
        $scope.selectCard = function(card) {
          if ($scope.isYourTurn) {
            // Must select in the player's turn
            if ($scope.selectedCards.indexOf(card) !== -1) {
              // The card is already selected, hence cancel the selection
              var index = $scope.selectedCards.indexOf(card);
              $scope.selectedCards.splice(index, 1);
            } else if ($scope.selectedCards.length < 4) {
              // Only select at most 4 cards!
              var yourCards = [];
              if ($scope.yourPlayerIndex === 0) {
                yourCards = $scope.state.white;
              } else {
                yourCards = $scope.state.black;
              }

              if (yourCards.indexOf(card) !== -1) {
                // Select!
                $scope.selectedCards.push(card);
              }
            }
          }
        };

        // Check the current stage
        $scope.checkStage = function(stage) {
          if (angular.isUndefined(state)) {
            return false;
          }
          return $scope.state.stage === stage;
        };

        // Update the ranks for claiming
        function updateClaimRanks () {
          if (angular.isUndefined($scope.state.claim)) {
            $scope.claimRanks = cheatLogicService.getRankArray();
          } else {
            var rank = $scope.state.claim[1];
            $scope.claimRanks = cheatLogicService.getRankArray(rank);
          }
        }

        // Make a claim
        $scope.claim = function(rank) {
          var claim = [$scope.selectedCards.length, rank];
          var operations = cheatLogicService.getClaimMove($scope.state, $scope.yourPlayerIndex, claim, $scope.selectedCards);
          gameService.makeMove(operations)
        };

        // Declare a cheater or pass
        $scope.declare = function (declareCheater) {
          var operations = cheatLogicService.getDeclareCheaterMove($scope.state, $scope.yourPlayerIndex, declareCheater);
          gameService.makeMove(operations)
        };

        // Check the declaration
        function checkDeclaration() {
          var operations = cheatLogicService.getMoveCheckIfCheated($scope.state, $scope.yourPlayerIndex);
          gameService.makeMove(operations);
        }

        // Check if the game ends, and if so, send the end game operations
        function checkEndGame() {
          var winner = cheatLogicService.getWinner($scope.state);
          if (winner != -1) {
            var operation = cheatLogicService.getWinMove($scope.state);
            gameService.makeMove(operation);
          }
        }

        // Get the card data value for css usage
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

        // Send computer move
        function sendComputerMove() {
          var operations = cheatLogicService.createComputerMove($scope.state, $scope.currIndex);
          console.log("AI makes a move!");
          gameService.makeMove(operations);

        }

        /**
         * This method update the game's UI.
         */
        function updateUI(params) {
          // Get the new state
          $scope.state = params.stateAfterMove;
          $scope.currIndex = params.turnIndexAfterMove;
          $scope.yourPlayerIndex = params.yourPlayerIndex;
          $scope.isYourTurn = params.turnIndexAfterMove >= 0 && // game is ongoing
              params.yourPlayerIndex === params.turnIndexAfterMove; // it's my turn
          $scope.isAiMode = $scope.isYourTurn
              && params.playersInfo[params.yourPlayerIndex].playerId === '';
          $scope.selectedCards = [];

          if (cheatLogicService.isEmptyObj(params.stateAfterMove)) {
            // Initialize the board...
            gameService.makeMove(cheatLogicService.getInitialMove());
          }

          if (params.playMode === 'playAgainstTheComputer' || params.playMode === 'passAndPlay') {
            $scope.playerOneCards = $scope.state.white;
            $scope.playerTwoCards = $scope.state.black;
          } else {
            if (params.yourPlayerIndex === 0 && $scope.isYourTurn) {
              $scope.playerOneCards =  $scope.state.white;
              $scope.playerTwoCards = $scope.state.black;
            } else {
              $scope.playerOneCards =  $scope.state.black;
              $scope.playerTwoCards = $scope.state.white;
            }
          }

          // In case the board is not updated
          if (!$scope.$$phase) {
            $scope.$apply();
          }

          // If the game ends, send the end game operation
          checkEndGame();

          if ($scope.isYourTurn) {
            switch($scope.state.stage) {
              case STAGE.DO_CLAIM:
                updateClaimRanks();
                break;
              case STAGE.DECLARE_CHEATER:
                break;
              case STAGE.CHECK_CLAIM:
                checkDeclaration();
                break;
              default:
            }
          }

          if ($scope.isAiMode) {
            $scope.isYourTurn = false;
            // Wait 500 milliseconds until animation ends.
            $timeout(sendComputerMove, 1500);
          }
        }

        // Before getting any updateUI, we show an empty board to a viewer (so you can't perform moves).
        //updateUI({playMode: "passAndPlay", stateAfterMove: {}, turnIndexAfterMove: 0, yourPlayerIndex: -2});

        //if ($(window).width() < 800) {
          scaleBodyService.scaleBody({width: 750, height: 1200});
        //}

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
