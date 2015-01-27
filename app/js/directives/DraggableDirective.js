(function () {
  'use strict';
  /*global angular */

  // Copied from:
  // http://coderdiaries.com/2014/03/09/drag-and-drop-with-angularjs/
  angular.module('myApp').directive('ddDraggable', [function () {
    return {
      restrict: "A",
      link: function (scope, element) {
        element.draggable({
          revert: true,
          start: function () {
            var id = element[0].id;
            // Store the card for later use
            scope.storeDraggingCard(id);
          }
        });
      }
    };
  }]);
}());