; (function () {
	'use strict';

	angular.module("umbraco").controller("OP10.Backoffice.MultipleMediaPickerSelectProperties.Controller", multipleMediaPickerSelectPropertiesController);

	multipleMediaPickerSelectPropertiesController.$inject = ["$scope", "$filter", "entityResource", "mediaResource", "multipleMediaPickerResource"];

	function multipleMediaPickerSelectPropertiesController($scope, $filter, entityResource, mediaResource, multipleMediaPickerResource) {

		$scope.mediaTypes = [{ name: "loading", properties: [{ name: "loading...", alias: "" }] }];
		$scope.checked = [];

		var preValueScopes = $("[ng-controller='Umbraco.Editors.DataType.EditController']").scope();
		var preValueIndex = preValueScopes.preValues.map(function (e) { return e.alias; }).indexOf("allowItemsOfType");
		$scope.allowItemsOfType = preValueScopes.preValues[preValueIndex];
		if ($scope.allowItemsOfType.value == "") {
			$scope.allowItemsOfType.value = "Image";
		}

		if ($scope.model.value != null) {
			$scope.checked = $scope.model.value;
			removeEmptyMediaTypes();
		}

		$scope.mediaTypes = [];
		multipleMediaPickerResource.getMediaProperties($scope.allowItemsOfType.value).then(function (response) {
			if (response != null && response.length > 0) {
				_.each(response, function (mediaType) {
					var mediaTypeProperties = [];
					var checkedProperties = [];
					mediaType.properties.push({ name: "Name", alias: "defaultNodeName" });
					// add only if has umbracoFile
					var umbracoFileProperty = $filter('filter')(mediaType.properties, { alias: "umbracoFile" })[0];
					if (umbracoFileProperty) {
						mediaType.properties.push({ name: "Physical name", alias: "defaultPhysicalName" });
					}
					_.each(mediaType.properties, function (property, index) {
						if (property.alias == "umbracoFile") {
							property.name = "Image Cropper";
						}

						// Get current sorting
						var checkedMediaType = $filter('filter')($scope.checked, { name: mediaType.name })[0];
						var position = checkedMediaType == undefined ? -1 : checkedMediaType.properties.indexOf(property.alias);
						if (position < 0) {
							position = mediaType.properties.length + index;
						} else {
							checkedProperties.push(property.alias);
						}
						mediaTypeProperties[position] = property;
					});
					// Remove empty array items
					mediaTypeProperties = mediaTypeProperties.filter(function (n) { return n != undefined });
					$scope.mediaTypes.push({ name: mediaType.name, properties: mediaTypeProperties, checked: checkedProperties });
				});
			}
			if ($scope.mediaTypes == null && $scope.mediaTypes.length == 0) {
				$scope.mediaTypes = [{ name: "empty", properties: [{ name: "No custom properties!", alias: "" }] }];
			}
		});

		$scope.toggle = function (mediaTypeName, property) {
			var checkedMediaType = $filter('filter')($scope.checked, { name: mediaTypeName })[0];
			var checkedPos = $scope.checked.map(function (e) { return e.name; }).indexOf(mediaTypeName);

			if (checkedMediaType == undefined) {
				var mediaType = $filter('filter')($scope.mediaTypes, { name: mediaTypeName })[0];
				checkedPos = $scope.checked.length++;
				checkedMediaType = { name: mediaType.name, properties: [] };
			}

			var index = checkedMediaType.properties.indexOf(property);
			if (index == -1) {
				checkedMediaType.properties.push(property);
			} else {
				checkedMediaType.properties.splice(index, 1);
			}

			$scope.checked[checkedPos] = checkedMediaType;

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
				var mediaTypeName = ui.item.data("media-type");
				var mediaType = $filter('filter')($scope.checked, { name: mediaTypeName })[0];
				var mediaTypePos = $scope.checked.map(function (e) { return e.name; }).indexOf(mediaTypeName);

				var newIndex = ui.item.index();
				var movedPrevalueText = $('input', ui.item).val();
				var originalIndex = mediaType.properties.indexOf(movedPrevalueText);

				// Move the element in the model
				if (originalIndex > -1) {
					var movedElement = mediaType.properties[originalIndex];
					mediaType.properties.splice(originalIndex, 1);
					mediaType.properties.splice(newIndex, 0, movedElement);
					$scope.checked[mediaTypePos] = mediaType;
				}

				// Save it
				$scope.model.value = $scope.checked;
			}
		};

		function removeEmptyMediaTypes() {
			var allowedMediaTypes = $scope.allowItemsOfType.value.split(",").map(function (item) {
				return item.trim();
			});
			var toDelete = [];
			_.each($scope.checked, function (mediaType) {
				if (allowedMediaTypes.indexOf(mediaType.name) == -1) {
					toDelete.push($scope.checked.map(function (e) { return e.name; }).indexOf(mediaType.name));
				}
			});
			_.each(toDelete, function (mediaTypePos) {
				$scope.checked.splice(mediaTypePos, 1);
			});
			$scope.model.value = $scope.checked;
		}

	};

}());