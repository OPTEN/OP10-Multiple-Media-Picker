using OP10.MultipleMediaPicker.Extensions;
using OP10.MultipleMediaPicker.Models;

using System;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Web;

using Umbraco.Core.Logging;
using Umbraco.Web.Editors;
using Umbraco.Web.Mvc;
using Umbraco.Web.WebApi;


namespace OP10.MultipleMediaPicker.Controllers
{
	[PluginController("OP10"), IsBackOffice]
	public class MultipleMediaPickerApiController : UmbracoAuthorizedJsonController
	{

		/// <summary>
		/// Updates the media
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		public dynamic PostMedia(MediaRequest request)
		{
			var isSaved = false;
			string name = string.Empty;
			try
			{
				// Get Media
				var ms = Services.MediaService;
				var newMedia = ms.GetById(request.Id);
				name = newMedia.Name;

				// Set new url and fileName if media is no folder
				if (newMedia.ContentType.Alias.Equals("Folder", StringComparison.OrdinalIgnoreCase) == false)
				{
					var urlValue = newMedia.GetValue<string>("umbracoFile");
					string oldFilePathRelative = urlValue.DetectIsJson()
						? urlValue.SerializeToCropDataSet().Src
						: urlValue;
					var oldFilePath = HttpContext.Current.Server.MapPath(oldFilePathRelative);
					var oldFileName = Path.GetFileNameWithoutExtension(oldFilePathRelative);
					if (request.Properties.ContainsKey("defaultPhysicalName"))
					{
						var newFilePathRelative = oldFilePathRelative.Replace(oldFileName, request.Properties["defaultPhysicalName"].ToString());
						var newFilePath = HttpContext.Current.Server.MapPath(newFilePathRelative);
						if (!oldFilePath.Equals(newFilePath, StringComparison.OrdinalIgnoreCase))
						{
							if (System.IO.File.Exists(newFilePath))
							{
								System.IO.File.Delete(newFilePath);
							}
							System.IO.File.Move(oldFilePath, newFilePath);
						}
						if (urlValue.DetectIsJson())
						{
							if (request.Properties.ContainsKey("umbracoFile"))
							{
								newMedia.SetValue("umbracoFile", request.Properties["umbracoFile"].ToString().Replace(oldFilePathRelative, newFilePathRelative));
								request.Properties.Remove("umbracoFile");
							} else
							{
								newMedia.SetValue("umbracoFile", urlValue.Replace(oldFilePathRelative, newFilePathRelative));
							}
						}
						else
						{
							newMedia.SetValue("umbracoFile", newFilePathRelative);
						}
					}
				}

				// Set new name
				if (request.Properties.ContainsKey("defaultNodeName"))
				{
					var defaultNodeName = request.Properties["defaultNodeName"].ToString();
					if (string.IsNullOrWhiteSpace(defaultNodeName) == false)
					{
						newMedia.Name = defaultNodeName;
						name = defaultNodeName;
					}
				}

				// Remove default properties
				request.Properties.Remove("defaultNodeName");
				request.Properties.Remove("defaultPhysicalName");

				// Set new properties
				if (request.Properties != null && request.Properties.Any())
				{
					foreach (var requestProperty in request.Properties)
					{
						if (requestProperty.Value != null)
						{
							newMedia.SetValue(requestProperty.Key, requestProperty.Value.ToString());
						}
					}
				}

				// Save new media
				ms.Save(newMedia);
				isSaved = true;
			}
			catch (Exception exc)
			{
				LogHelper.Error<MultipleMediaPickerApiController>("OP10 Multiple Media Picker", exc);
				isSaved = false;
			}
			return new { 
				success = isSaved,
				message = (isSaved ? name + " has been successfully saved!" : name + " could not be saved!")
			};
		}

		/// <summary>
		/// Returns the Properties of a Image.
		/// </summary>
		/// <returns></returns>
		public dynamic[] GetMediaProperties()
		{
			return Services.ContentTypeService.GetMediaType("Image").PropertyTypes.Where(o => 
				o.Alias.StartsWith("umbraco") == false || 
				(o.Alias.Equals("umbracoFile", StringComparison.OrdinalIgnoreCase) && o.PropertyEditorAlias.Equals("Umbraco.ImageCropper", StringComparison.OrdinalIgnoreCase))
			).Select(o => new { name = o.Name, alias = o.Alias }).ToArray();
		}

	}
}