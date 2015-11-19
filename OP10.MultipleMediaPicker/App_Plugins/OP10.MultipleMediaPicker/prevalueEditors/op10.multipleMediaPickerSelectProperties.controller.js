; (function () {
	'use strict';

	angular.module("umbraco").controller("OP10.Backoffice.MultipleMediaPickerSelectProperties.Controller", multipleMediaPickerSelectPropertiesController);

	multipleMediaPickerSelectPropertiesController.$inject = ["$scope", "entityResource", "mediaResource", "multipleMediaPickerResource"];

	function multipleMediaPickerSelectPropertiesController($scope, entityResource, mediaResource, multipleMediaPickerResource) {

		$scope.properties = [{ name: "loading...", alias: "loading" }];
		$scope.checked = [];

		multipleMediaPickerResource.getMediaProperties().then(function (response) {
			var name = { name: "Name", alias: "defaultNodeName" }
			var physicalName = { name: "Physical name", alias: "physicalName" }
			$scope.properties = [];
			$scope.properties.push(name);
			$scope.properties.push(physicalName);
			if (response != null && response.length > 0) {
				for (var i = 0; i < response.length; i++) {
					$scope.properties.push(response[i]);
				}
			}
			if ($scope.properties == null && $scope.properties.length == 0) {
				$scope.properties = [{ name: "No custom properties!", alias: "empty" }];
			}
		});

		if ($scope.model.value != null) {
			$scope.checked = $scope.model.value;
		}

		$scope.toggle = function (value) {
			var index = $scope.checked.indexOf(value);

			if (index == -1) {
				$scope.checked.push(value);
			} else {
				$scope.checked.splice(index, 1);
			}

			$scope.model.value = $scope.checked;
		}
	};

}());