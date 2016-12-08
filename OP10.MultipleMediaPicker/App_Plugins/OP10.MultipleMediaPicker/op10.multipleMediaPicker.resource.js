; (function () {
	'use strict';

	angular.module("umbraco.resources").factory("multipleMediaPickerResource", multipleMediaPickerResource);

	multipleMediaPickerResource.$inject = ["$http", "umbRequestHelper"];

	function multipleMediaPickerResource($http, umbRequestHelper) {
		var resource = {
			saveMedia: saveMedia,
			getMediaProperties: getMediaProperties,
			getUmbracoVersion: getUmbracoVersion
		};

		return resource;

		// Private functions

		function saveMedia(id, properties) {
			return umbRequestHelper.resourcePromise(
                $http.post("/umbraco/backoffice/OP10/MultipleMediaPickerApi/PostMedia", {
                	id: id,
                	properties: properties
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

		function getUmbracoVersion() {
			return umbRequestHelper.resourcePromise(
                $http.get("/umbraco/backoffice/OP10/MultipleMediaPickerApi/GetUmbracoVersion"),
                "Could not get Umbraco Version!"
            );
		};

	};

}());