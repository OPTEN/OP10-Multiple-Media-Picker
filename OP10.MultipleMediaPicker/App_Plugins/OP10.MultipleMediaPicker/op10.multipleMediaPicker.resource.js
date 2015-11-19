; (function () {
	'use strict';

	angular.module("umbraco.resources").factory("multipleMediaPickerResource", multipleMediaPickerResource);

	multipleMediaPickerResource.$inject = ["$http", "umbRequestHelper"];

	function multipleMediaPickerResource($http, umbRequestHelper) {
		var resource = {
			saveMedia: saveMedia,
			getMediaProperties: getMediaProperties
		};

		return resource;

		// Private functions

		function saveMedia(id, name, properties, changePhysicalName, physicalName) {
			return umbRequestHelper.resourcePromise(
                $http.post("/umbraco/backoffice/OP10/MultipleMediaPickerApi/PostMedia", {
                	id: id,
                	name: name,
                	properties: properties,
                	changePhysicalName: changePhysicalName,
                	physicalName: physicalName
                }),
                "Media could not be saved!"
            );
		};

		function getMediaProperties() {
			return umbRequestHelper.resourcePromise(
                $http.get("/umbraco/backoffice/OP10/MultipleMediaPickerApi/GetMediaProperties"),
                "Could not get Media properties!"
            );
		};
	};

}());