namespace Gigabyte.Cashback.Aorus;

public sealed class AorusApiOptions
{
    public const string SectionName = "Aorus";
    public const string HttpClientName = "Aorus";

    // Local development can keep the existing mock identity. UAT explicitly enables this.
    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = "https://aorus-southeastasia-api-testing.azurewebsites.net";
    public string ClientId { get; set; } = "1";
    public string ClientSecret { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}
