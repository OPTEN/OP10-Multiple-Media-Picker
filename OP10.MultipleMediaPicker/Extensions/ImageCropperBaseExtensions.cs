using Newtonsoft.Json;

using System;

using Umbraco.Core.Logging;
using Umbraco.Web.Models;


namespace OP10.MultipleMediaPicker.Extensions
{
	internal static class ImageCropperBaseExtensions
	{
		internal static ImageCropDataSet SerializeToCropDataSet(this string json)
		{
			var imageCrops = new ImageCropDataSet();
			if (json.DetectIsJson())
			{
				try
				{
					imageCrops = JsonConvert.DeserializeObject<ImageCropDataSet>(json);
				}
				catch (Exception ex)
				{
					LogHelper.Error(typeof(ImageCropperBaseExtensions), "Could not parse the json string: " + json, ex);
				}
			}

			return imageCrops;
		}

	}
}
