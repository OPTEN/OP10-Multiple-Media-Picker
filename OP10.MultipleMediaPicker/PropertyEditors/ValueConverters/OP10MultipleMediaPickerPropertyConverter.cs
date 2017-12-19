using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Core;
using Umbraco.Core.Logging;
using Umbraco.Core.Models;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.PropertyEditors;
using Umbraco.Core.Services;
using Umbraco.Web;

namespace OP10.MultipleMediaPicker.PropertyEditors.ValueConverters
{

	// Implemented like Umbraco see: https://github.com/umbraco/Umbraco-CMS/blob/92f609ff71016454f03a657608fee78b354d3ef5/src/Umbraco.Web/PropertyEditors/ValueConverters/MultipleMediaPickerPropertyConverter.cs
	public class OP10MultipleMediaPickerPropertyConverter : PropertyValueConverterBase, IPropertyValueConverterMeta
	{
		private readonly IDataTypeService _dataTypeService;

		public OP10MultipleMediaPickerPropertyConverter()
			: this(ApplicationContext.Current.Services.DataTypeService)
		{
		}

		public OP10MultipleMediaPickerPropertyConverter(IDataTypeService dataTypeService)
		{
			if (dataTypeService == null) throw new ArgumentNullException("dataTypeService");
			_dataTypeService = dataTypeService;
		}

		/// <summary>
		/// Checks if this converter can convert the property editor and registers if it can.
		/// </summary>
		/// <param name="propertyType">
		/// The property type.
		/// </param>
		/// <returns>
		/// The <see cref="bool"/>.
		/// </returns>
		public override bool IsConverter(PublishedPropertyType propertyType)
		{
			return propertyType.PropertyEditorAlias.Equals(Constants.PropertyEditors.MultipleMediaPickerAlias);
		}

		/// <summary>
		/// Convert the raw string into a nodeId integer array or a single integer
		/// </summary>
		/// <param name="propertyType">
		/// The published property type.
		/// </param>
		/// <param name="source">
		/// The value of the property
		/// </param>
		/// <param name="preview">
		/// The preview.
		/// </param>
		/// <returns>
		/// The <see cref="object"/>.
		/// </returns>
		public override object ConvertDataToSource(PublishedPropertyType propertyType, object source, bool preview)
		{
			if (IsMultipleDataType(propertyType.DataTypeId, propertyType.PropertyEditorAlias))
			{
				var nodeIds =
					source.ToString()
						.Split(new[] { "," }, StringSplitOptions.RemoveEmptyEntries)
						.Select(int.Parse)
						.ToArray();
				return nodeIds;
			}

			var attemptConvertInt = source.TryConvertTo<int>();
			if (attemptConvertInt.Success)
			{
				return attemptConvertInt.Result;
			}
			else
			{
				var nodeIds =
				   source.ToString()
					   .Split(new[] { "," }, StringSplitOptions.RemoveEmptyEntries)
					   .Select(int.Parse)
					   .ToArray();

				if (nodeIds.Length > 0)
				{
					var error =
						string.Format(
							"Data type \"{0}\" is not set to allow multiple items but appears to contain multiple items, check the setting and save the data type again",
							ApplicationContext.Current.Services.DataTypeService.GetDataTypeDefinitionById(
								propertyType.DataTypeId).Name);

					LogHelper.Warn<OP10MultipleMediaPickerPropertyConverter>(error);
					throw new Exception(error);
				}
			}

			return null;
		}

		/// <summary>
		/// Convert the source nodeId into a IPublishedContent or IEnumerable of IPublishedContent (or DynamicPublishedContent) depending on data type setting
		/// </summary>
		/// <param name="propertyType">
		/// The published property type.
		/// </param>
		/// <param name="source">
		/// The value of the property
		/// </param>
		/// <param name="preview">
		/// The preview.
		/// </param>
		/// <returns>
		/// The <see cref="object"/>.
		/// </returns>
		public override object ConvertSourceToObject(PublishedPropertyType propertyType, object source, bool preview)
		{
			if (source == null)
			{
				return null;
			}

			if (UmbracoContext.Current == null)
			{
				return null;
			}

			var umbHelper = new UmbracoHelper(UmbracoContext.Current);

			if (IsMultipleDataType(propertyType.DataTypeId, propertyType.PropertyEditorAlias))
			{
				var nodeIds = (int[])source;
				var multiMediaPicker = Enumerable.Empty<IPublishedContent>();
				if (nodeIds.Length > 0)
				{
					multiMediaPicker = umbHelper.TypedMedia(nodeIds).Where(x => x != null);
				}

				return multiMediaPicker;
			}

			// single value picker
			var nodeId = (int)source;

			return umbHelper.TypedMedia(nodeId);
		}

		/// <summary>
		/// The get property cache level.
		/// </summary>
		/// <param name="propertyType">
		/// The property type.
		/// </param>
		/// <param name="cacheValue">
		/// The cache value.
		/// </param>
		/// <returns>
		/// The <see cref="PropertyCacheLevel"/>.
		/// </returns>
		public PropertyCacheLevel GetPropertyCacheLevel(PublishedPropertyType propertyType, PropertyCacheValue cacheValue)
		{
			PropertyCacheLevel returnLevel;
			switch (cacheValue)
			{
				case PropertyCacheValue.Object:
					returnLevel = PropertyCacheLevel.ContentCache;
					break;
				case PropertyCacheValue.Source:
					returnLevel = PropertyCacheLevel.Content;
					break;
				case PropertyCacheValue.XPath:
					returnLevel = PropertyCacheLevel.Content;
					break;
				default:
					returnLevel = PropertyCacheLevel.None;
					break;
			}

			return returnLevel;
		}

		/// <summary>
		/// The get property value type.
		/// </summary>
		/// <param name="propertyType">
		/// The property type.
		/// </param>
		/// <returns>
		/// The <see cref="Type"/>.
		/// </returns>
		public Type GetPropertyValueType(PublishedPropertyType propertyType)
		{
			return IsMultipleDataType(propertyType.DataTypeId, propertyType.PropertyEditorAlias) ? typeof(IEnumerable<IPublishedContent>) : typeof(IPublishedContent);
		}

		/// <summary>
		/// The is multiple data type.
		/// </summary>
		/// <param name="dataTypeId">
		/// The data type id.
		/// </param>
		/// <param name="propertyEditorAlias"></param>
		/// <returns>
		/// The <see cref="bool"/>.
		/// </returns>
		private bool IsMultipleDataType(int dataTypeId, string propertyEditorAlias)
		{
			return Storages.GetOrAdd(dataTypeId, id =>
			{
				var preVals = _dataTypeService.GetPreValuesCollectionByDataTypeId(id).PreValuesAsDictionary;

				if (preVals.ContainsKey("maximum"))
				{
					var maxValue = preVals
						.FirstOrDefault(x => string.Equals(x.Key, "maximum", StringComparison.InvariantCultureIgnoreCase))
						.Value;

					if (maxValue == null || maxValue.Value == null)
					{
						return true;
					}

					int i = int.TryParse(maxValue.Value, out i) ? i : -1;

					return i <= 0;
				}

				return false;
			});
		}

		private static readonly ConcurrentDictionary<int, bool> Storages = new ConcurrentDictionary<int, bool>();

		internal static void ClearCaches()
		{
			Storages.Clear();
		}
	}
}