; (function () {
	'use strict';

	angular.module("umbraco").controller("OP10.Backoffice.MultipleMediaPicker.Controller", multipleMediaPickerController);

	multipleMediaPickerController.$inject = ["$scope", "$q", "umbPropEditorHelper", "dialogService", "entityResource", "mediaResource", "mediaHelper", "multipleMediaPickerResource", "notificationsService", "$timeout"];

	function multipleMediaPickerController($scope, $q, umbPropEditorHelper, dialogService, entityResource, mediaResource, mediaHelper, multipleMediaPickerResource, notificationsService, $timeout) {

		// get the content item form
	    var contentForm = angular.element('form[name=contentForm]').scope();
	    if (contentForm != undefined) {
	        $scope.contentForm = contentForm.contentForm;
	    }
		//check the pre-values for multi-picker
		var multiPicker = $scope.model.config.multiPicker && $scope.model.config.multiPicker !== '0' ? true : false;

		//check the pre-values for change-physical-name
		var changePhysicalName = $scope.model.config.selectedProperties != null && $scope.model.config.selectedProperties.indexOf("physicalName") !== -1 ? true : false;
		var changeDefaultName = $scope.model.config.selectedProperties != null && $scope.model.config.selectedProperties.indexOf("defaultNodeName") !== -1 ? true : false;
		$scope.changeNameInQuickview = $scope.model.config.selectedQuickviewProperties != null && $scope.model.config.selectedQuickviewProperties.indexOf("defaultNodeName") !== -1 ? true : false;
		$scope.changePhysicalNameInQuickview = $scope.model.config.selectedQuickviewProperties != null && $scope.model.config.selectedQuickviewProperties.indexOf("physicalName") !== -1 ? true : false;

		//check the pre-values for selected-quickview-properties
		var quickviewAlias = $scope.model.config.selectedQuickviewProperties;
		$scope.hasQuickviewProperties = (quickviewAlias != null && quickviewAlias.length > 0 || $scope.changeNameInQuickview || $scope.changePhysicalNameInQuickview ? true : false);

		// pre-value for start node, default content root
		if (!$scope.model.config.startNodeId)
			$scope.model.config.startNodeId = -1;

		$scope.isLoading = true;

		$scope.$on("formSubmitting", function () {
			$scope.saveImages();
		});
		$scope.$on("formSubmitted", function () {
			setupViewModel();
		});


		$(document).on("click", ".umb-mediapicker .quickview-item label", function () {
			$(this).closest(".quickview-item").find("input").focus();
		});
		$(document).on("focusin", ".umb-mediapicker .quickview-item input", function () {
			$(this).closest(".quickview-item").addClass("focus");
		});
		$(document).on("focusout", ".umb-mediapicker .quickview-item input", function () {
			if ($(this).val() == "") {
				$(this).closest(".quickview-item").removeClass("focus");
			}
		});

		$(".umb-mediapicker .quickview-item input").each(function () {
			if ($(this).val() != "") {
				$(this).closest(".quickview-item").addClass("focus");
			}
		});


		function getProperties(mediaId) {
			var deferred = $q.defer();
			var physicalName = "";
			var properties = [];

			mediaResource.getById(mediaId, "Media").then(function (media) {
				for (var j in media.tabs) {
					var tab = media.tabs[j];
					for (var k in tab.properties) {
						var property = tab.properties[k];
						if (property.alias == "umbracoFile") {
							if (property.view == "imagecropper") {
								var fullName = property.value.src.substr((property.value.src.lastIndexOf('/') + 1), property.value.src.length);
								physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
							} else {
								var fullName = property.value.substr((property.value.lastIndexOf('/') + 1), property.value.length);
								physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
							}
						}
						if ($scope.model.config.selectedQuickviewProperties != null) {
							for (var i = 0; i < $scope.model.config.selectedQuickviewProperties.length; i++) {
								if (property != null && property.editor != null && property.alias == $scope.model.config.selectedQuickviewProperties[i]) {
									properties.push(property);
								}
							}
						}
					}
				}
				deferred.resolve({ physicalName: physicalName, properties: properties});
			});

			return deferred.promise;
		}

		function setupViewModel() {
			$scope.images = [];
			$scope.ids = [];
			$scope.isLoading = false;

			if ($scope.model.value) {
				var ids = $scope.model.value.split(',');
				$scope.isLoading = true;

				//NOTE: We need to use the entityResource NOT the mediaResource here because
				// the mediaResource has server side auth configured for which the user must have
				// access to the media section, if they don't they'll get auth errors. The entityResource
				// acts differently in that it allows access if the user has access to any of the apps that
				// might require it's use. Therefore we need to use the metatData property to get at the thumbnail
				// value.

				entityResource.getByIds(ids, "Media").then(function (medias) {

					_.each(medias, function (media, i) {

						getProperties(media.id).then(function (response) {
							media.quickviewProperties = response.properties;
							media.physicalName = response.physicalName;

							//only show non-trashed items
							if (media.parentId >= -1) {

								if (!media.thumbnail) {
									media.thumbnail = mediaHelper.resolveFileFromEntity(media, true);
								}

								var position = -1;
								for (var i = 0; i < ids.length; i++) {
									if (ids[i] == media.id) {
										position = i;
									}
								}
								if (position != -1) {
									$scope.images[position] = media;
									$scope.ids[position] = media.id;
								}

								if ($scope.images.length == ids.length) {
									$scope.sync();
									$scope.isLoading = false;
								}
							}
						});

					});
				});
			}
		}

		setupViewModel();

		// Rename media
		$scope.saveImages = function () {
			if ($scope.contentForm.$valid && $scope.hasQuickviewProperties) {
				var imagesResponse = [];
				_.each($scope.images, function (media) {
					var properties = {};
					_.each(media.quickviewProperties, function (property) {
						properties[property.alias] = property.value;
					});

					multipleMediaPickerResource.saveMedia(media.id, media.name, properties, true, media.physicalName).then(function (response) {
						imagesResponse.push(response);
						if ($scope.images.length == imagesResponse.length) {
							if (imagesResponse.length == 1) {
								if (String(response.success).toLowerCase() === 'true') {
									notificationsService.success("Media saved", response.message);
								} else {
									notificationsService.error("Media not saved", response.message);
								}
							} else {
								var totalSuccess = imagesResponse.length;
								_.each(imagesResponse, function (imageResponse) {
									if (String(imageResponse.success).toLowerCase() === 'false') {
										totalSuccess--;
										notificationsService.error("Media not saved", imageResponse.message);
									}
								});
								notificationsService.success("Medias saved", totalSuccess + " medias has been successfully saved!");
							}
						}
					});
				});
			}
		};

		// Rename media
		$scope.rename = function (index) {
			var dialogData = { image: $scope.images[index], properties: $scope.model.config.selectedProperties, changePhysicalName: changePhysicalName, changeDefaultName: changeDefaultName };
			dialogService.open({
				template: '/App_Plugins/OP10.MultipleMediaPicker/multipleMediaPickerDialog.html?v=ASSEMBLY_VERSION',
				show: true,
				dialogData: dialogData,
				callback: function (value) {
					if (value != null && value != '') {

						var properties = {};
						for (var i = 0; i < value.properties.length; i++) {
							properties[value.properties[i].alias] = value.properties[i].value;
						}

						multipleMediaPickerResource.saveMedia(value.id, value.name, properties, value.changePhysicalName, value.physicalName).then(function (response) {
							if (String(response.success).toLowerCase() === 'true') {
								notificationsService.success("Media saved", response.message);
							} else {
								notificationsService.error("Media not saved", response.message);
							}
							setupViewModel();
						});
					}
				}
			});
		};

		// Add new link to media
		$scope.add = function () {
			dialogService.mediaPicker({
				startNodeId: $scope.model.config.startNodeId,
				multiPicker: multiPicker,
				callback: function (data) {

					//it's only a single selector, so make it into an array
					if (!multiPicker) {
						data = [data];
					}

					_.each(data, function (media, i) {

						getProperties(media.id).then(function (response) {
							media.quickviewProperties = response.properties;
							media.physicalName = response.physicalName;

							if (!media.thumbnail) {
								media.thumbnail = mediaHelper.resolveFileFromEntity(media, true);
							}

							$scope.images.push(media);
							$scope.ids.push(media.id);

							$scope.sync();
						});

					});
				}
			});
		};

		// Remove link to media
		$scope.remove = function (index) {
			$scope.images.splice(index, 1);
			$scope.ids.splice(index, 1);
			$scope.sync();
		};

		$scope.sortableOptions = {
			update: function (e, ui) {
				var r = [];
				//TODO: Instead of doing this with a half second delay would be better to use a watch like we do in the 
				// content picker. THen we don't have to worry about setting ids, render models, models, we just set one and let the 
				// watch do all the rest.
				$timeout(function () {
					angular.forEach($scope.images, function (value, key) {
						r.push(value.id);
					});

					$scope.ids = r;
					$scope.sync();
				}, 500, false);
			}
		};

		$scope.sync = function () {
			$scope.model.value = $scope.ids.join();
		};

		$scope.showAdd = function () {
			if (!multiPicker) {
				if ($scope.model.value && $scope.model.value !== "") {
					return false;
				}
			}
			return true;
		};

		//here we declare a special method which will be called whenever the value has changed from the server
		//this is instead of doing a watch on the model.value = faster
		$scope.model.onValueChanged = function (newVal, oldVal) {
			//update the display val again if it has changed from the server
			setupViewModel();
		};
	};


	angular.module("umbraco").controller("OP10.Backoffice.MultipleMediaPickerDialog.Controller", multipleMediaPickerDialogController);

	multipleMediaPickerDialogController.$inject = ["$scope", "$q", "mediaResource", "mediaHelper", "contentEditingHelper"];

	function multipleMediaPickerDialogController($scope, $q, mediaResource, mediaHelper, contentEditingHelper) {

		$scope.model = {
			name: $scope.dialogData.image.name,
			path: "",
			id: $scope.dialogData.image.id,
			properties: [],
			changePhysicalName: $scope.dialogData.changePhysicalName,
			changeDefaultName: $scope.dialogData.changeDefaultName,
			physicalName: ""
		}

		function getMedia() {
			var deferred = $q.defer();
			mediaResource.getById($scope.model.id, "Media").then(function (media) {
				deferred.resolve(media);
			});

			return deferred.promise;
		}

		function getMediaName(mediaId) {
			var deferred = $q.defer();

			if (mediaId == "-1") {
				deferred.resolve({ name: "/Media", id: mediaId });
			} else {
				mediaResource.getById(mediaId, "Media").then(function (media) {
					deferred.resolve({ name: "/" + media.name, id: mediaId });
				});
			}

			return deferred.promise;
		}

		function getMediaLocation() {
			var deferred = $q.defer();
			var segments = [];

			var images = $scope.dialogData.image.path.split(',');
			for (var i = 0; i < images.length; i++) {
				getMediaName(images[i]).then(function (media) {
					segments.push(media);
					if (segments.length == images.length) {
						deferred.resolve(segments);
					}
				});
			}

			return deferred.promise;
		}

		function fillMediaData() {
			var physicalName = [];
			var properties = [];

			for (var j in $scope.model.media.tabs) {
				var tab = $scope.model.media.tabs[j];
				for (var k in tab.properties) {
					var property = tab.properties[k];
					if (property.alias == "umbracoFile") {
						if (property.view == "imagecropper") {
							var fullName = property.value.src.substr((property.value.src.lastIndexOf('/') + 1), property.value.src.length);
							physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
						} else {
							var fullName = property.value.substr((property.value.lastIndexOf('/') + 1), property.value.length);
							physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
						}
					}
					for (var i = 0; i < $scope.dialogData.properties.length; i++) {
						if (property != null && property.editor != null && property.alias == $scope.dialogData.properties[i]) {
							properties.push(property);
						}
					}
				}
			}

			$scope.model.physicalName = physicalName;
			$scope.model.properties = properties;
		}

		getMedia().then(function (media) {
			$scope.model.media = media;
			fillMediaData();
		});

		getMediaLocation().then(function (segments) {
			var images = $scope.dialogData.image.path.split(',');
			var path = "";
			for (var i = 0; i < images.length; i++) {
				for (var j = 0; j < segments.length; j++) {
					if (segments[j].id == images[i]) {
						path += segments[j].name;
					}
				}
			}
			$scope.model.path = path;
		});
	};

}());