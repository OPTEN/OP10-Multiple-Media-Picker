; (function () {
	'use strict';

	angular.module("umbraco").controller("OP10.Backoffice.MultipleMediaPickerSelectProperties.Controller", multipleMediaPickerSelectPropertiesController);

	multipleMediaPickerSelectPropertiesController.$inject = ["$scope", "entityResource", "mediaResource", "multipleMediaPickerResource"];

	function multipleMediaPickerSelectPropertiesController($scope, entityResource, mediaResource, multipleMediaPickerResource) {

		$scope.properties = [{ name: "loading...", alias: "loading" }];
		$scope.checked = [];

		if ($scope.model.value != null) {
			$scope.checked = $scope.model.value;
		}

		multipleMediaPickerResource.getMediaProperties().then(function (response) {
			$scope.properties = [];
			response.push({ name: "Name", alias: "defaultNodeName" });
			response.push({ name: "Physical name", alias: "defaultPhysicalName" });
			if (response != null && response.length > 0) {
				for (var i = 0; i < response.length; i++) {
					if (response[i].alias == "umbracoFile") {
						response[i].name = "Image Cropper";
					}

					// Get current sorting
					var position = $scope.checked.indexOf(response[i].alias);
					if (position < 0) {
						position = response.length + i;
					}
					$scope.properties[position] = response[i];
				}
			}
			if ($scope.properties == null && $scope.properties.length == 0) {
				$scope.properties = [{ name: "No custom properties!", alias: "empty" }];
			}
			// Remove empty array items
			$scope.properties = $scope.properties.filter(function (n) { return n != undefined });
		});

		$scope.toggle = function (value) {
			var index = $scope.checked.indexOf(value);

			if (index == -1) {
				$scope.checked.push(value);
			} else {
				$scope.checked.splice(index, 1);
			}

			$scope.model.value = $scope.checked;
		}

		$scope.sortableOptions = {
			axis: 'y',
			containment: 'parent',
			cursor: 'move',
			items: '> div.control-group',
			tolerance: 'pointer',
			update: function (e, ui) {
				// Get the new and old index for the moved element
				var newIndex = ui.item.index();
				var movedPrevalueText = $('input', ui.item).val();
				var originalIndex = $scope.checked.indexOf(movedPrevalueText);

				// Move the element in the model
				if (originalIndex > -1) {
					var movedElement = $scope.checked[originalIndex];
					$scope.checked.splice(originalIndex, 1);
					$scope.checked.splice(newIndex, 0, movedElement);
				}

				// Save it
				$scope.model.value = $scope.checked;
			}
		};

	};

}());