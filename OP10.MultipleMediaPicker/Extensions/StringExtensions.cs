namespace OP10.MultipleMediaPicker.Extensions
{
	public static class StringExtensions
	{

		public static bool DetectIsJson(this string input)
		{
			if (string.IsNullOrWhiteSpace(input)) return false;

			input = input.Trim();
			return (input.StartsWith("{") && input.EndsWith("}"))
				   || (input.StartsWith("[") && input.EndsWith("]"));
		}
	}
}