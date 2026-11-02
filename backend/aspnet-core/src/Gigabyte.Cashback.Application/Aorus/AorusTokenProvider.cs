using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Volo.Abp;

namespace Gigabyte.Cashback.Aorus;

public sealed class AorusAccessToken(string value, DateTimeOffset refreshAfter)
{
    public string Value { get; } = value;
    public DateTimeOffset RefreshAfter { get; } = refreshAfter;
}

// Singleton per process: a cold start obtains a token on demand; no background worker is needed.
public sealed class AorusTokenProvider(
    IHttpClientFactory clients, IOptions<AorusApiOptions> options,
    TimeProvider time, ILogger<AorusTokenProvider> logger) : IDisposable
{
    private readonly SemaphoreSlim refreshLock = new(1, 1);
    private AorusAccessToken? cached;

    public async Task<AorusAccessToken> GetAsync(
        AorusAccessToken? rejectedToken = null, CancellationToken cancellationToken = default)
    {
        await refreshLock.WaitAsync(cancellationToken);
        try
        {
            // A concurrent request may already have replaced the rejected token.
            if (cached != null && cached.RefreshAfter > time.GetUtcNow() && !ReferenceEquals(cached, rejectedToken))
                return cached;

            var settings = options.Value;
            using var client = clients.CreateClient(AorusApiOptions.HttpClientName);
            using var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "password", ["client_id"] = settings.ClientId,
                ["client_secret"] = settings.ClientSecret, ["username"] = settings.Username,
                ["password"] = settings.Password
            });
            var requestedAt = time.GetUtcNow();
            using var response = await client.PostAsync("/oauth/request", form, cancellationToken);
            if (!response.IsSuccessStatusCode) throw Unavailable();
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var root = body.RootElement;
            if (!root.TryGetProperty("access_token", out var token) || token.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(token.GetString()) ||
                !root.TryGetProperty("token_type", out var type) || type.ValueKind != JsonValueKind.String ||
                !string.Equals(type.GetString(), "bearer", StringComparison.OrdinalIgnoreCase) ||
                !root.TryGetProperty("expires_in", out var expires) || !expires.TryGetInt32(out var seconds) || seconds <= 0)
                throw Unavailable();

            // Refresh 60 seconds early, or 10% early for unusually short-lived tokens.
            var refreshAfter = requestedAt.AddSeconds(seconds - Math.Min(60, seconds * 0.1));
            if (refreshAfter <= time.GetUtcNow()) throw Unavailable();
            cached = new AorusAccessToken(token.GetString()!, refreshAfter);
            logger.LogInformation("AORUS access token acquired; lifetime {LifetimeSeconds} seconds.", seconds);
            return cached;
        }
        catch (HttpRequestException) { throw Unavailable(); }
        catch (JsonException) { throw Unavailable(); }
        catch (InvalidOperationException) { throw Unavailable(); }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { throw Unavailable(); }
        finally { refreshLock.Release(); }
    }

    internal static UserFriendlyException Unavailable() =>
        new("AORUS membership verification is temporarily unavailable. Please try again later.");

    public void Dispose() => refreshLock.Dispose();
}
