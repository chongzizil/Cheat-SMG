(function () {
  'use strict';
  /*global angular, platform, Audio */

  /**
   * This is the controller for cheat.
   *
   * The board has three section, holding the cards of the player one, player
   * two and the middle area's.
   *
   * The section for player one is the main section, from the point of the
   * player's view. All cards are sorted according to ranks.
   *
   * The section for player two is usually hidden which holds the opponent's
   * cards.
   *
   * The section for middle area holds all the claimed and selected cards.
   * Claimed cards will remain hidden and the selected cards are not until
   * claimed.
   */
  angular.module('myApp').controller('CheatCtrl',
      ['$scope', '$animate', '$timeout', '$q', 'cheatLogicService', 'gameService',
      function ($scope, $animate, $timeout, $q, cheatLogicService, gameService) {
        // Get the stage objects for convenience
        var STAGE = cheatLogicService.STAGE;

        // Return true if the card (index) is selected
        $scope.isSelected = function(card) {
          return $scope.middle.indexOf(card) !== -1;
        };

        // Return true if at least one card is selected
        $scope.hasSelectedCards = function() {
          // The cards in the middle area is more than the cards in the state's
          // original middle area
          return $scope.middle.length > $scope.state.middle.length;
        };

        // Return true if the card can be dragged/selected...
        $scope.canDrag = function (card) {
          if ($scope.isYourTurn && $scope.state.stage === STAGE.DO_CLAIM && $scope.state["card" + card] != null) {
            if ($scope.middle.indexOf(card) !== -1) {
              return true;
            } else if ($scope.middle.length - $scope.state.middle.length < 4) {
              return true;
            }
          }

          return false;
        };

        // Store the card for later use during drag and drop
        $scope.storeDraggingCard = function (card) {
          $scope.draggingCard = parseInt(card);
        };

        // Select a card
        $scope.selectCard = function(card) {
          if ($scope.isYourTurn && $scope.state.stage === STAGE.DO_CLAIM) {
            // Must select in the player's turn
            if ($scope.middle.indexOf(card) !== -1) {
              // The card is already selected, hence cancel the selection
              // First delete the card in the middle area, then add it back
              // to the player one area
              $scope.middle.splice($scope.middle.indexOf(card), 1);
              $scope.playerOneCards.push(card);
            } else if ($scope.middle.length - $scope.state.middle.length < 4) {
              // Only select at most 4 cards!
              if ($scope.playerOneCards.indexOf(card) !== -1) {
                // Select the card.
                // First delete it from player one area, then add it to the
                // middle area
                $scope.playerOneCards.splice($scope.playerOneCards.indexOf(card), 1);
                $scope.middle.push(card);
              }
            }
          }
          sortRanks();

          // In case the board is not updated
          if (!$scope.$$phase) {
            $scope.$apply();
          }

        };

        // Check the current stage
        $scope.checkStage = function(stage) {
          if (angular.isUndefined($scope.state)) {
            return false;
          }
          return $scope.state.stage === stage;
        };

        // Make a claim
        $scope.claim = function(rank) {
          var claim = [$scope.middle.length - $scope.state.middle.length, rank];
          var diffM = $scope.middle.clone();
          diffM.selfSubtract($scope.state.middle);
          var operations = cheatLogicService.getClaimMove($scope.state, $scope.currIndex, claim, diffM);
          gameService.makeMove(operations)
        };

        // Declare a cheater or pass
        $scope.declare = function (declareCheater) {
          var operations = cheatLogicService.getDeclareCheaterMove($scope.state, $scope.currIndex, declareCheater);
          gameService.makeMove(operations)
        };

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
                suitChar = "\u2665";
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


        // Sort the cards according to the ranks
        function sortRanks() {
          var sortFunction = function(cardA, cardB) {
            if ($scope.state["card" + cardA] !== null) {
              // Only sort the cards while they are not hidden
              var rankA = $scope.state["card" + cardA].substring(1);
              var rankB = $scope.state["card" + cardB].substring(1);
              var scoreA = cheatLogicService.getRankScore(rankA);
              var scoreB = cheatLogicService.getRankScore(rankB);
              return scoreA - scoreB;
            }
            return 1;
          };
          $scope.playerOneCards.sort(sortFunction);
          $scope.playerTwoCards.sort(sortFunction);
        }

        // Update the ranks for claiming
        function updateClaimRanks () {
          if (angular.isUndefined($scope.state.claim)) {
            $scope.claimRanks = cheatLogicService.getRankArray();
          } else {
            var rank = $scope.state.claim[1];
            $scope.claimRanks = cheatLogicService.getRankArray(rank);
          }
        }


        // Check the declaration
        function checkDeclaration() {
          var operations = cheatLogicService.getMoveCheckIfCheated($scope.state, $scope.currIndex);
          gameService.makeMove(operations);
        }

        // Check if there's a winner
        function hasWinner() {
          return cheatLogicService.getWinner($scope.state) !== -1;
        }

        // Check if the game ends, and if so, send the end game operations
        function checkEndGame() {
          if (hasWinner() && $scope.stage === STAGE.DO_CLAIM) {
            // Only send end game operations in DO_CLAIM stage
            var operation = cheatLogicService.getWinMove($scope.state);
            gameService.makeMove(operation);
          }
        }

        // Send computer move
        function sendComputerMove() {
          var operations = cheatLogicService.createComputerMove($scope.state, $scope.currIndex);
          console.log(JSON.stringify(operations));
          if ($scope.currIndex === 1) {
            gameService.makeMove(operations);
          }
        }

        /**
         * This method update the game's UI.
         */
        function updateUI(params) {
          // If the state is empty, first initialize the board...
          if (cheatLogicService.isEmptyObj(params.stateAfterMove)) {
            gameService.makeMove(cheatLogicService.getInitialMove());
            return;
          }

          // Get the new state
          $scope.state = params.stateAfterMove;
          // Get the current player index (For creating computer move...)
          $scope.currIndex = params.turnIndexAfterMove;
          $scope.isYourTurn = params.turnIndexAfterMove >= 0 && // game is ongoing
              params.yourPlayerIndex === params.turnIndexAfterMove; // it's my turn
          $scope.isAiMode = $scope.isYourTurn
              && params.playersInfo[params.yourPlayerIndex].playerId === '';

          // Get the cards for player one area, player two area and middle area
          $scope.middle = $scope.state.middle.clone();
          if (params.playMode === 'playAgainstTheComputer' || params.playMode === 'passAndPlay') {
            // If the game is played in the same device, use the default setting
            $scope.playerOneCards = $scope.state.white.clone();
            $scope.playerTwoCards = $scope.state.black.clone();
          } else {
            // Otherwise, player one area holds the cards for the player self
            if (params.yourPlayerIndex === 0) {
              $scope.playerOneCards =  $scope.state.white.clone();
              $scope.playerTwoCards = $scope.state.black.clone();
            } else {
              $scope.playerOneCards =  $scope.state.black.clone();
              $scope.playerTwoCards = $scope.state.white.clone();
            }
            console.log(JSON.stringify($scope.playerOneCards));
            console.log(JSON.stringify($scope.playerTwoCards));
          }

          sortRanks();

          // In case the board is not updated
          if (!$scope.$$phase) {
            $scope.$apply();
          }

          // If the game ends, send the end game operation directly
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

          if ($scope.currIndex === 1 && $scope.isAiMode) {
            $scope.isYourTurn = false;
            $timeout(sendComputerMove, 1000);
          }
        }

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
