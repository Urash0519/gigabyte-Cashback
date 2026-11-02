using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

namespace Gigabyte.Cashback.Aorus;

public sealed class AorusMemberClient(
    IHttpClientFactory clients, AorusTokenProvider tokens, IOptions<AorusApiOptions> options,
    ILogger<AorusMemberClient> logger) : IAorusMemberClient
{
    public bool IsEnabled => options.Value.Enabled;

    public async Task<bool> ExistsAsync(string email, CancellationToken cancellationToken = default)
    {
        if (!options.Value.Enabled) return true;
        try
        {
            var token = await tokens.GetAsync(cancellationToken: cancellationToken);
            for (var attempt = 0; attempt < 2; attempt++)
            {
                using var client = clients.CreateClient(AorusApiOptions.HttpClientName);
                using var request = new HttpRequestMessage(HttpMethod.Post, "/api/eu_promotion/check_member_exist");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Value);
                // The PDF's surrounding spaces in " eu_promotion " are incorrect.
                // Buffer JSON so this legacy endpoint receives Content-Length instead of chunked transfer.
                request.Content = new StringContent(JsonSerializer.Serialize(new { eu_promotion = new { UserEmail = email } }), Encoding.UTF8, "application/json");
                using var response = await client.SendAsync(request, cancellationToken);
                if (response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    if (attempt != 0) throw AorusTokenProvider.Unavailable();
                    token = await tokens.GetAsync(token, cancellationToken);
                    continue;
                }
                // A 403 can be an Azure network restriction, not an expired token.
                if (!response.IsSuccessStatusCode) throw AorusTokenProvider.Unavailable();
                using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
                var root = body.RootElement;
                var code = Code(root);
                if (code == 2098)
                {
                    if (attempt != 0) throw AorusTokenProvider.Unavailable();
                    token = await tokens.GetAsync(token, cancellationToken);
                    continue;
                }
                if (code == 2002 && root.TryGetProperty("Status", out var failed) && failed.GetString() == "Failed" &&
                    root.TryGetProperty("Result", out var missing) && missing.ValueKind == JsonValueKind.Null)
                    return false;
                if (code == 1000 && root.TryGetProperty("Status", out var status) && status.GetString() == "Success" &&
                    root.TryGetProperty("Result", out var result) && result.ValueKind == JsonValueKind.Object &&
                    result.TryGetProperty("Email", out var returnedEmail) && returnedEmail.ValueKind == JsonValueKind.String &&
                    string.Equals(returnedEmail.GetString(), email, StringComparison.OrdinalIgnoreCase))
                    return true;
                logger.LogWarning("AORUS member lookup returned unexpected business code {StatusCode}.", code);
                throw AorusTokenProvider.Unavailable();
            }
            throw AorusTokenProvider.Unavailable();
        }
        catch (HttpRequestException) { throw AorusTokenProvider.Unavailable(); }
        catch (JsonException) { throw AorusTokenProvider.Unavailable(); }
        catch (InvalidOperationException) { throw AorusTokenProvider.Unavailable(); }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { throw AorusTokenProvider.Unavailable(); }
    }

    private static int? Code(JsonElement body)
    {
        if (!body.TryGetProperty("StatusCode", out var code) && !body.TryGetProperty("Status_code", out code)) return null;
        if (code.ValueKind == JsonValueKind.Number && code.TryGetInt32(out var numeric)) return numeric;
        return code.ValueKind == JsonValueKind.String && int.TryParse(code.GetString(), out var text) ? text : null;
    }
}
