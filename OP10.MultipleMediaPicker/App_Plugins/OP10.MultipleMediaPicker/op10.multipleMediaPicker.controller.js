; (function () {
	'use strict';

	angular.module("umbraco").controller("OP10.Backoffice.MultipleMediaPicker.Controller", multipleMediaPickerController);

	multipleMediaPickerController.$inject = ["$scope", "$q", "$timeout", "$filter", "umbPropEditorHelper", "mediaHelper", "dialogService", "userService", "notificationsService", "entityResource", "mediaResource", "multipleMediaPickerResource", "fileManager"];

	function multipleMediaPickerController($scope, $q, $timeout, $filter, umbPropEditorHelper, mediaHelper, dialogService, userService, notificationsService, entityResource, mediaResource, multipleMediaPickerResource, fileManager) {

		// get the content item form
		var contentForm = angular.element('form[name=contentForm]').scope();
		if (contentForm != undefined) {
			$scope.contentForm = contentForm.contentForm;
		}

		// check the pre-values
		var minimum = $scope.model.config.minimum ? parseInt($scope.model.config.minimum) : 0;
		var maximum = $scope.model.config.maximum ? parseInt($scope.model.config.maximum) : 0;
		var multiPicker = maximum == 0 || maximum > 1 ? true : false;
		var onlyImages = $scope.model.config.onlyImages && $scope.model.config.onlyImages !== '0' ? true : false;
		var disableFolderSelect = $scope.model.config.disableFolderSelect && $scope.model.config.disableFolderSelect !== '0' ? true : false;

		//check the pre-values for show-media-link
		$scope.showMediaLink = $scope.model.config.showMediaLink && $scope.model.config.showMediaLink !== '0' ? true : false;


		// pre-value for start node, default content root
		if (!$scope.model.config.startNodeId)
			$scope.model.config.startNodeId = -1;

		var defaultStartNodeId = $scope.model.config.startNodeId;
		var userStartNodeId;
		getUserStartNodeId().then(function (startMediaId) {
			userStartNodeId = startMediaId ? startMediaId : -1;
			hasUserFolderPermission(userStartNodeId, defaultStartNodeId).then(function (hasPermission) {
				if (hasPermission) {
					$scope.model.config.startNodeId = defaultStartNodeId;
				} else {
					$scope.model.config.startNodeId = userStartNodeId;
				}

				setupViewModel();
			});
		});

		// umbraco-version
		$scope.umbracoVersion = parseInt(Umbraco.Sys.ServerVariables.application.version.replace(/\./g, ""));


		$scope.isLoading = true;

		$scope.$on("formSubmitting", function () {
			var messages = [];
			var propertyFormScopes = $(".multipleMediaPicker").closest(".ng-scope");
			if (propertyFormScopes.length) {
				propertyFormScopes.each(function (index, element) {
					var propertyFormScope = $(element).scope();
					if (propertyFormScope.saving === undefined || propertyFormScope.saving == false) {
						propertyFormScope.saving = true;
						propertyFormScope.saveImages().then(function (response) {
							messages.push(response);
							if (messages.length == propertyFormScopes.length) {
								renderResponseMessage(messages);
								propertyFormScope.saving = false;
							}
						});
					}
				});
			} else {
				$scope.saveImages().then(function (response) {
					messages.push(response);
					renderResponseMessage(messages);
				});
			}
		});
		$scope.$on("formSubmitted", function () {
			setupViewModel();
		});


		// Save medias
		$scope.saveImages = function () {
			var deferred = $q.defer();
			if ($scope.contentForm && $scope.contentForm.$valid && $scope.model.config.selectedQuickviewProperties && $scope.model.config.selectedQuickviewProperties.length) {
				var imagesResponse = [];
				_.each($scope.images, function (media) {
					var properties = {};
					_.each(media.quickviewProperties, function (property) {
						property.alias = getDefaultAlias(property.alias);
						properties[property.alias] = property.value;
					});

					multipleMediaPickerResource.saveMedia(media.id, properties).then(function (response) {
						imagesResponse.push(response);
						if ($scope.images.length == imagesResponse.length) {
							deferred.resolve(imagesResponse);
							/*if (imagesResponse.length == 1) {
								if (String(response.success).toLowerCase() === 'true') {
									notificationsService.success("Media saved", imageResponse[0].message);
								} else {
									notificationsService.error("Media not saved", imageResponse[0].message);
								}
							} else {
								var totalSuccess = imagesResponse.length;
								_.each(imagesResponse, function (imageResponse) {
									if (String(imageResponse.success).toLowerCase() === 'false') {
										totalSuccess--;
										notificationsService.error("Media not saved", imageResponse.message);
									}
								});
								if (totalSuccess > 0) {
									notificationsService.success("Medias saved", totalSuccess + " medias has been successfully saved!");
								}
							}*/
						}
					});
				});
			}

			return deferred.promise;
		};

		// Edit media
		$scope.edit = function (index) {
			// stop editing if user has no permission
			if ($scope.images[index].hasPermission == false) {
				notificationsService.error("No permission", "You are not allowed to change any property for this media");
				return false;
			}

			var properties = [];
			if ($scope.model.config.selectedProperties) {
				var mediaType = $filter('filter')($scope.model.config.selectedProperties, { name: $scope.images[index].metaData.ContentTypeAlias.toLowerCase() })[0];
				if (mediaType) {
					_.each(mediaType.properties, function (property) {
						var value = "";
						_.each($scope.images[index].quickviewProperties, function (quickviewProperty) {
							var alias = quickviewProperty.alias;
							alias = getDefaultAlias(alias);
							if (alias == property) {
								value = quickviewProperty.value;
							}
						});
						properties.push({ alias: property, value: value });
					});
				}
			}
			var dialogData = { image: $scope.images[index], properties: properties };
			dialogService.open({
				template: '/App_Plugins/OP10.MultipleMediaPicker/multipleMediaPickerDialog.html?v=ASSEMBLY_VERSION',
				show: true,
				dialogData: dialogData,
				callback: function (value) {
					if (value != null && value != '') {

						var properties = {};
						for (var i = 0; i < value.properties.length; i++) {
							value.properties[i].alias = getDefaultAlias(value.properties[i].alias);
							properties[value.properties[i].alias] = value.properties[i].value;
						}

						multipleMediaPickerResource.saveMedia(value.media.id, properties).then(function (response) {
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
			// check for new media section
			if ($scope.umbracoVersion > 740) {
				$scope.mediaPickerOverlay = {
					view: "mediapicker",
					title: "Select media",
					startNodeId: $scope.model.config.startNodeId,
					multiPicker: multiPicker,
					onlyImages: onlyImages,
					disableFolderSelect: disableFolderSelect,
					show: true,
					submit: function (model) {

						if (multiPicker) {
							if (maximum != 0 && model.selectedImages.length > maximum) {
								model.selectedImages = model.selectedImages.slice(0, maximum)
							}
						}

						_.each(model.selectedImages, function (media, i) {

							addDefaultMediaProperties(media);

							getProperties(media).then(function (response) {
								media.quickviewProperties = response.properties;

								if (!media.thumbnail) {
									media.thumbnail = mediaHelper.resolveFileFromEntity(media, true);
								}

								$scope.images.push(media);
								$scope.ids.push(media.id);

								$scope.sync();
							});

						});

						$scope.mediaPickerOverlay.show = false;
						$scope.mediaPickerOverlay = null;

					}
				};
			} else {
				dialogService.mediaPicker({
					startNodeId: $scope.model.config.startNodeId,
					multiPicker: multiPicker,
					callback: function (data) {

						//it's only a single selector, so make it into an array
						if (!multiPicker) {
							data = [data];
						} else {
							if (maximum != 0 && data.length > maximum) {
								data = data.slice(0, maximum);
							}
						}

						_.each(data, function (media, i) {

							addDefaultMediaProperties(media);

							getProperties(media).then(function (response) {
								media.quickviewProperties = response.properties;

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
			}
		};

		// Remove link to media
		$scope.remove = function (index) {
			$scope.images.splice(index, 1);
			$scope.ids.splice(index, 1);
			$scope.sync();
		};

		$scope.sortableOptions = {
			helper: 'clone',
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
			// Remove empty array items
			$scope.model.value = $scope.ids.filter(function (n) { return n != undefined }).join();
		};

		$scope.showAdd = function () {
			if (multiPicker) {
				if ($scope.model.value) {
					var medias = $scope.model.value.split(",").map(function (item) {
						return item.trim();
					});
					if (medias.length >= minimum && (maximum == 0 || medias.length <= maximum)) {
						return true;
					}
				}
			}
			else
			{
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

		// functions
		function getUserStartNodeId() {
			var deferred = $q.defer();

			userService.getCurrentUser().then(function (userData) {
				deferred.resolve(userData.startMediaId ? userData.startMediaId : userData.startMediaIds[0]);
			});

			return deferred.promise;
		}

		function hasUserFolderPermission(startFolderId, searchFolderId) {
			var deferred = $q.defer();
			var hasPermission = (startFolderId == searchFolderId);

			entityResource.getAncestors(searchFolderId, "media").then(function (anc) {
				for (var i = 0; i < anc.length; i++) {
					if (anc[i].id == startFolderId) {
						hasPermission = true;
						break;
					}
				}
				if (startFolderId == -1) {
					hasPermission = true;
				}
				deferred.resolve(hasPermission);
			});

			return deferred.promise;
		}

		function hasUserPermission(path) {
			return path.indexOf($scope.model.config.startNodeId) > -1;
		}

		function getProperties(defaultMedia) {
			var deferred = $q.defer();
			var properties = [];

			if (defaultMedia.hasPermission) {
				mediaResource.getById(defaultMedia.id, "Media").then(function (media) {
					if ($scope.model.config.selectedQuickviewProperties) {
						var mediaType = $filter('filter')($scope.model.config.selectedQuickviewProperties, { name: media.contentTypeAlias.toLowerCase() })[0];
						if (mediaType) {
							var i = 0;
							_.each(mediaType.properties, function (quickviewProperty) {
								// Get propertyeditors
								var property = getPropertyByAlias(quickviewProperty, media);

								// Set default propertyeditors
								if (quickviewProperty == "defaultNodeName") {
									property = {
										alias: quickviewProperty,
										config: {},
										description: "",
										editor: "Umbraco.Textbox",
										hideLabel: false,
										id: (defaultMedia + i),
										label: "Name",
										validation: {
											mandatory: true,
											pattern: null
										},
										value: defaultMedia.name,
										view: "textbox"
									};
								}
								if (quickviewProperty == "defaultPhysicalName" && defaultMedia.isFolder == false) {
									var umbracoFileProperty = getPropertyByAlias("umbracoFile", media);
									var physicalName;
									if (umbracoFileProperty.editor == "Umbraco.ImageCropper") {
										var fullName = umbracoFileProperty.value.src.substr((umbracoFileProperty.value.src.lastIndexOf('/') + 1), umbracoFileProperty.value.src.length);
										physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
									} else {
										var fullName = umbracoFileProperty.value.substr((umbracoFileProperty.value.lastIndexOf('/') + 1), umbracoFileProperty.value.length);
										physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
									}
									property = {
										alias: quickviewProperty,
										config: {},
										description: "",
										editor: "Umbraco.Textbox",
										hideLabel: false,
										id: (defaultMedia + i),
										label: "Physical name (without file extension)",
										validation: {
											mandatory: defaultMedia.isFolder == false,
											pattern: null
										},
										value: physicalName,
										view: "textbox"
									};
								}

								if (property !== undefined) {
									// Set custom propertyeditor view
									if (property.editor == "Umbraco.ImageCropper") {
										defaultMedia.isImageCropper = true;
										property.view = "/App_Plugins/OP10.MultipleMediaPicker/propertyeditors/imagecropper.html?v=ASSEMBLY_VERSION";
									}

									// Add property
									property.alias = property.alias + "_id_" + defaultMedia.id;
									properties.push(property);
								}
								i++;
							});
						}
					}

					deferred.resolve({ properties: properties });
				});
			} else {
				deferred.resolve({ properties: properties });
			}

			return deferred.promise;
		}

		function getPropertyByAlias(alias, media) {
			alias = getDefaultAlias(alias);
			var property;
			if (media.tabs !== undefined) {
				var mediaTab = _.filter(media.tabs, function (tab) {
					return _.some(tab.properties, { alias: alias });
				})[0];
				if (mediaTab !== undefined) {
					property = _.findWhere(mediaTab.properties, {
						alias: alias
					});
				}
			} else {
				property = _.findWhere(media.properties, {
					alias: alias
				});
			}
			if (property === undefined) {
				alias = alias + "_id_" + media.id;
				if (media.tabs !== undefined) {
					mediaTab = _.filter(media.tabs, function (tab) {
						return _.some(tab.properties, { alias: alias });
					})[0];
					if (mediaTab !== undefined) {
						property = _.findWhere(mediaTab.properties, {
							alias: alias
						});
					}
				} else {
					property = _.findWhere(media.properties, {
						alias: alias
					});
				}
			}
			return property;
		};

		function addDefaultMediaProperties(media) {
			media.hasPermission = hasUserPermission(media.path);
			media.isFile = false;
			media.isFolder = false;
			if (media.metaData.ContentTypeAlias == undefined) {// media variable looks different when just added and not saved
				media.metaData.ContentTypeAlias = media.contentTypeAlias;
				if (media.image !== undefined) {
					media.metaData.umbracoFile = { "Value": media.image };
				}
			}
			if (media.metaData.ContentTypeAlias == "Folder") {
				media.isFolder = true;
			}
			if (media.metaData.ContentTypeAlias == "File") {
				media.isFile = true;
			}
			media.url = "/umbraco/#/media/media/edit/" + media.id;
			if (media.metaData.umbracoFile !== undefined) {
				if (media.metaData.umbracoFile.Value.src !== undefined) {
					media.url = media.metaData.umbracoFile.Value.src;
				} else {
					media.url = media.metaData.umbracoFile.Value;
				}
			}
		}

		function renderResponseMessage(messages) {
			if (messages.length) {
				var totalSuccess = 0;
				_.each(messages, function (message) {
					_.each(message, function (imageResponse) {
						if (String(imageResponse.success).toLowerCase() === 'false') {
							totalSuccess--;
							notificationsService.error("Media not saved", imageResponse.message);
						} else {
							totalSuccess++;
						}
					});
				});
				if (totalSuccess > 0) {
					notificationsService.success("Medias saved", totalSuccess + " medias has been successfully saved!");
				}
			}
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

						addDefaultMediaProperties(media);

						getProperties(media).then(function (response) {
							media.quickviewProperties = response.properties;

							//only show non-trashed items
							if (media.parentId >= -1) {

								if (!media.thumbnail) {
									media.thumbnail = mediaHelper.resolveFileFromEntity(media, true);
								}

								var position = -1;
								for (var i = 0; i < ids.length; i++) {
									if (ids[i] == media.id) {
										position = i;
										break;
									}
								}
								if (position != -1) {
									$scope.images[position] = media;
									$scope.ids[position] = media.id;
								}
							}

							$scope.sync();
							$scope.isLoading = false;
						});

					});
				});
			}
		}

		function getDefaultAlias(alias) {
			if (alias.indexOf("_id_") > -1) {
				return alias.substr(0, alias.lastIndexOf("_id_"));
			}
			return alias;
		};

	};


	angular.module("umbraco").controller("OP10.Backoffice.MultipleMediaPickerDialog.Controller", multipleMediaPickerDialogController);

	multipleMediaPickerDialogController.$inject = ["$scope", "$q", "$filter", "mediaResource", "entityResource", "editorState", "mediaHelper", "contentEditingHelper"];

	function multipleMediaPickerDialogController($scope, $q, $filter, mediaResource, entityResource, editorState, mediaHelper, contentEditingHelper) {

		$scope.model = {
			media: $scope.dialogData.image,
			path: "",
			properties: []
		}

		function fillMediaData(mediaId) {
			var deferred = $q.defer();
			var properties = [];

			mediaResource.getById(mediaId, "Media").then(function (media) {
				var i = 0;
				_.each($scope.dialogData.properties, function (dialogProperty) {
					// Get propertyeditors
					var property = getPropertyByAlias(dialogProperty.alias, media);

					// Set default propertyeditors
					if (dialogProperty.alias == "defaultNodeName") {
						property = {
							alias: dialogProperty.alias,
							config: {},
							description: "",
							editor: "Umbraco.Textbox",
							hideLabel: false,
							id: ($scope.model.media.id + i),
							label: "Name",
							validation: {
								mandatory: true,
								pattern: null
							},
							value: $scope.model.media.name,
							view: "textbox"
						};
					}
					if (dialogProperty.alias == "defaultPhysicalName" && $scope.model.media.isFolder == false) {
						var umbracoFileProperty = getPropertyByAlias("umbracoFile", media);
						var physicalName;
						if (umbracoFileProperty.editor == "Umbraco.ImageCropper") {
							var fullName = umbracoFileProperty.value.src.substr((umbracoFileProperty.value.src.lastIndexOf('/') + 1), umbracoFileProperty.value.src.length);
							physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
						} else {
							var fullName = umbracoFileProperty.value.substr((umbracoFileProperty.value.lastIndexOf('/') + 1), umbracoFileProperty.value.length);
							physicalName = fullName.substr(0, fullName.lastIndexOf('.'));
						}
						property = {
							alias: dialogProperty.alias,
							config: {},
							description: "",
							editor: "Umbraco.Textbox",
							hideLabel: false,
							id: ($scope.model.media.id + i),
							label: "Physical name (without file extension)",
							validation: {
								mandatory: $scope.model.media.isFolder == false,
								pattern: null
							},
							value: physicalName,
							view: "textbox"
						};
					}
					
					if (property !== undefined) {
						// Set custom propertyeditor view
						if (property.editor == "Umbraco.ImageCropper") {
							property.view = "/App_Plugins/OP10.MultipleMediaPicker/propertyeditors/imagecropperDialog.html?v=ASSEMBLY_VERSION";
						}

						// Add property
						property.alias = property.alias + "_id_" + mediaId;
						if (dialogProperty.value != "") {
							property.value = dialogProperty.value;
						}
						properties.push(property);
					}
				});

				deferred.resolve(properties);
			});

			return deferred.promise
		}

		function getPropertyByAlias(alias, media) {
			alias = getDefaultAlias(alias);
			var property;
			var mediaTab = _.filter(media.tabs, function (tab) {
				return _.some(tab.properties, { alias: alias });
			})[0];
			if (mediaTab !== undefined) {
				property = _.findWhere(mediaTab.properties, {
					alias: alias
				});
			}
			if (property === undefined) {
				alias = alias + "_id_" + media.id;
				mediaTab = _.filter(media.tabs, function (tab) {
					return _.some(tab.properties, { alias: alias });
				})[0];
				if (mediaTab !== undefined) {
					property = _.findWhere(mediaTab.properties, {
						alias: alias
					});
				}
			}
			return property;
		};

		function getDefaultAlias(alias) {
			if (alias.indexOf("_id_") > -1) {
				return alias.substr(0, alias.lastIndexOf("_id_"));
			}
			return alias;
		};

		/*getMedia().then(function (media) {
			$scope.model.media = media;
			fillMediaData();
		});*/

		fillMediaData($scope.model.media.id).then(function (properties) {
			$scope.model.properties = properties;
		});

		entityResource.getAncestors($scope.model.media.id, "media").then(function (anc) {
			var path = "";
			for (var i = 0; i < anc.length; i++) {
				path += "/" + anc[i].name;
			}
			$scope.model.path = path;
		});

	};

}());