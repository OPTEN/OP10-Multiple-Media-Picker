using Newtonsoft.Json;

using System.Collections.Generic;


namespace OP10.MultipleMediaPicker.Models
{
	public class MediaRequest
	{
		[JsonProperty("id")]
		public int Id { get; set; }

		[JsonProperty("name")]
		public string Name { get; set; }

		[JsonProperty("properties")]
		public Dictionary<string, string> Properties { get; set; }

		[JsonProperty("changePhysicalName")]
		public bool ChangePhysicalName { get; set; }

		[JsonProperty("physicalName")]
		public string PhysicalName { get; set; }
	}
}
