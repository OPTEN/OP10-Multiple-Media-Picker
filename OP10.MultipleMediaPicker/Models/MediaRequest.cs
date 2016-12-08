using Newtonsoft.Json;

using System.Collections.Generic;


namespace OP10.MultipleMediaPicker.Models
{
	public class MediaRequest
	{
		[JsonProperty("id")]
		public int Id { get; set; }

		[JsonProperty("properties")]
		public Dictionary<string, object> Properties { get; set; }
	}
}
