using OP10.MultipleMediaPicker.Extensions;
using OP10.MultipleMediaPicker.Models;

using System;
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
		public dynamic PostMedia(MediaRequest request)
		{
			var isSaved = false;
			String name = String.Empty;
			try
			{
				var ms = Services.MediaService;
				var newMedia = ms.GetById(request.Id);
				var urlValue = newMedia.GetValue<string>("umbracoFile");
				String oldFilePathRelative = urlValue.DetectIsJson()
					? urlValue.SerializeToCropDataSet().Src
					: urlValue;
				var oldFilePath = HttpContext.Current.Server.MapPath(oldFilePathRelative);
				var oldFileName = Path.GetFileNameWithoutExtension(oldFilePathRelative);
				if (request.ChangePhysicalName == true)
				{
					var newFilePathRelative = oldFilePathRelative.Replace(oldFileName, request.PhysicalName);
					var newFilePath = HttpContext.Current.Server.MapPath(newFilePathRelative);
					if (!oldFilePath.Equals(newFilePath, StringComparison.OrdinalIgnoreCase))
					{
						if (System.IO.File.Exists(newFilePath))
						{
							System.IO.File.Delete(newFilePath);
						}
						System.IO.File.Move(oldFilePath, newFilePath);
					}
					newMedia.SetValue("umbracoFile", newFilePathRelative);
				}
				if (!String.IsNullOrWhiteSpace(request.Name))
				{
					newMedia.Name = request.Name;
					name = request.Name;
				}
				else
				{
					name = newMedia.Name;
				}

				foreach (var requestProperty in request.Properties)
				{
					newMedia.SetValue(requestProperty.Key, requestProperty.Value);
				}

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
				message = (isSaved ? name + " has been successfully saved!" : "Media could not be saved!")
			};
		}

		public dynamic[] GetMediaProperties()
		{
			return Services.ContentTypeService.GetMediaType("Image").PropertyTypes.Where(o => o != null && o.Alias.StartsWith("umbraco") == false).Select(o => new { name = o.Name, alias = o.Alias }).ToArray();
		}

	}
}