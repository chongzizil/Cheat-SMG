(function () {
  'use strict';
  /*global angular */

  // Copied from:
  // http://coderdiaries.com/2014/03/09/drag-and-drop-with-angularjs/
  angular.module('myApp').directive('ddDropTarget', [function () {
    return {
      restrict: "A",
      link: function (scope, element) {
        element.droppable({
          drop: function () {
            if (scope.canDrag(scope.draggingCard)) {
              scope.selectCard(scope.draggingCard);
            }
          }
        });
      }
    };
  }]);
}());