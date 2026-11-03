using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Gigabyte.Cashback.Aorus;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Gigabyte.Cashback;

public class AorusMemberClientTests
{
    private const string Email = "test@gmail.com";
    private const string Found = """{"Status":"Success","StatusCode":1000,"Message":"Check Member Exist","Result":{"Email":"test@gmail.com","Country":"TW","Name":"opaque","User_ID":123,"AUID":"opaque"}}""";
    private const string Missing = """{"Status":"Failed","StatusCode":2002,"Message":"Do not find the Member","Result":null}""";
    private static HttpResponseMessage Json(string json, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    private static HttpResponseMessage Token(string value = "token-1", int seconds = 28799) =>
        Json(JsonSerializer.Serialize(new { access_token = value, expires_in = seconds, token_type = "bearer" }));

    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.Parse("2026-11-02T00:00:00Z");
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private sealed class Handler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => send(request, cancellationToken);
    }
    private sealed class Factory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false)
        { BaseAddress = new Uri("https://aorus.example.invalid"), Timeout = TimeSpan.FromSeconds(1) };
    }
    private sealed class Fixture : IDisposable
    {
        public readonly Clock Clock = new();
        public readonly AorusTokenProvider Tokens;
        public readonly AorusMemberClient Members;
        private readonly Handler handler;
        public Fixture(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send, bool enabled = true)
        {
            handler = new Handler(send);
            var factory = new Factory(handler);
            var options = Options.Create(new AorusApiOptions { Enabled = enabled, ClientId = "1", ClientSecret = "secret&=+", Username = "user@example.invalid", Password = "p@ss&=+" });
            Tokens = new AorusTokenProvider(factory, options, Clock, NullLogger<AorusTokenProvider>.Instance);
            Members = new AorusMemberClient(factory, Tokens, options, NullLogger<AorusMemberClient>.Instance);
        }
        public void Dispose() { Tokens.Dispose(); handler.Dispose(); }
    }

    [Fact]
    public async Task Should_send_documented_payload_and_reuse_token_across_requests()
    {
        var tokenCalls = 0;
        var memberCalls = 0;
        using var fixture = new Fixture(async (request, ct) =>
        {
            request.Method.ShouldBe(HttpMethod.Post);
            var text = await request.Content!.ReadAsStringAsync(ct);
            if (request.RequestUri!.AbsolutePath == "/oauth/request")
            {
                tokenCalls++;
                request.Headers.Authorization.ShouldBeNull();
                request.Content.Headers.ContentType!.MediaType.ShouldBe("application/x-www-form-urlencoded");
                var form = text.Split('&').Select(pair => pair.Split('=', 2)).ToDictionary(p => Uri.UnescapeDataString(p[0]), p => Uri.UnescapeDataString(p[1].Replace("+", " ")));
                form["grant_type"].ShouldBe("password"); form["client_secret"].ShouldBe("secret&=+"); form["password"].ShouldBe("p@ss&=+");
                return Token();
            }
            memberCalls++;
            request.Content.Headers.ContentLength.ShouldNotBeNull();
            request.Content.Headers.ContentLength.ShouldBe(Encoding.UTF8.GetByteCount(text));
            request.RequestUri!.AbsolutePath.ShouldBe("/api/eu_promotion/check_member_exist");
            request.Headers.Authorization!.ToString().ShouldBe("Bearer token-1");
            using var json = JsonDocument.Parse(text);
            json.RootElement.GetProperty("eu_promotion").GetProperty("UserEmail").GetString().ShouldBe(Email);
            json.RootElement.EnumerateObject().Count().ShouldBe(1);
            return Json(Found);
        });
        (await fixture.Members.ExistsAsync(Email)).ShouldBeTrue();
        (await fixture.Members.ExistsAsync(Email)).ShouldBeTrue();
        tokenCalls.ShouldBe(1); memberCalls.ShouldBe(2);
    }

    [Theory]
    [InlineData("\"王小明\"", "王小明")]
    [InlineData("\"b3BhcXVlLW5hbWU=\"", "b3BhcXVlLW5hbWU=")]
    [InlineData("null", null)]
    [InlineData("123", null)]
    public async Task Member_reference_should_preserve_returned_name_without_reinterpreting_it(string jsonName, string? expectedName)
    {
        var response = Found.Replace("\"Name\":\"opaque\"", "\"Name\":" + jsonName);
        using var fixture = new Fixture((request, _) => Task.FromResult(request.RequestUri!.AbsolutePath == "/oauth/request" ? Token() : Json(response)));
        var result = await fixture.Members.LookupAsync(Email);
        result.IsMember.ShouldBe(true);
        result.Name.ShouldBe(expectedName);
    }

    [Fact]
    public async Task Expiring_token_should_refresh_once_for_concurrent_requests()
    {
        var tokenCalls = 0;
        using var fixture = new Fixture(async (request, ct) =>
        {
            if (request.RequestUri!.AbsolutePath == "/oauth/request")
            {
                var sequence = Interlocked.Increment(ref tokenCalls);
                await Task.Delay(10, ct);
                return Token("token-" + sequence, 120);
            }
            return Json(Found);
        });
        await fixture.Members.ExistsAsync(Email);
        fixture.Clock.Now = fixture.Clock.Now.AddSeconds(107);
        await fixture.Members.ExistsAsync(Email);
        tokenCalls.ShouldBe(1);
        fixture.Clock.Now = fixture.Clock.Now.AddSeconds(2);
        (await Task.WhenAll(Enumerable.Range(0, 10).Select(_ => fixture.Members.ExistsAsync(Email)))).ShouldAllBe(x => x);
        tokenCalls.ShouldBe(2);
    }

    [Theory]
    [InlineData("Status_code", "\"2098\"", 200)]
    [InlineData("StatusCode", "2098", 200)]
    [InlineData("Status_code", "\"2098\"", 401)]
    public async Task Rejected_token_should_be_replaced_and_lookup_retried_once(string key, string code, int httpStatus)
    {
        var tokenCalls = 0; var memberCalls = 0;
        using var fixture = new Fixture((request, _) =>
        {
            if (request.RequestUri!.AbsolutePath == "/oauth/request") return Task.FromResult(Token("token-" + ++tokenCalls));
            memberCalls++;
            return Task.FromResult(request.Headers.Authorization!.Parameter == "token-1"
                ? Json($$"""{"Status":"Fail","{{key}}":{{code}},"Message":"Please try again later.","result":""}""", (HttpStatusCode)httpStatus)
                : Json(Found));
        });
        (await fixture.Members.ExistsAsync(Email)).ShouldBeTrue();
        tokenCalls.ShouldBe(2); memberCalls.ShouldBe(2);
        await fixture.Members.ExistsAsync(Email);
        tokenCalls.ShouldBe(2);
    }

    [Fact]
    public async Task Concurrent_rejections_should_share_one_replacement_even_if_token_text_is_reused()
    {
        var tokenCalls = 0; var firstRequests = 0;
        var allOldRequests = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var fixture = new Fixture(async (request, ct) =>
        {
            if (request.RequestUri!.AbsolutePath == "/oauth/request") { Interlocked.Increment(ref tokenCalls); return Token("same-token"); }
            if (Interlocked.Increment(ref firstRequests) <= 5)
            {
                if (firstRequests == 5) allOldRequests.TrySetResult();
                await allOldRequests.Task.WaitAsync(TimeSpan.FromSeconds(3), ct);
                return Json("""{"Status_code":"2098"}""");
            }
            return Json(Found);
        });
        (await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => fixture.Members.ExistsAsync(Email)))).ShouldAllBe(x => x);
        tokenCalls.ShouldBe(2);
    }

    [Fact]
    public async Task Missing_member_is_a_business_rejection_and_does_not_refresh_token()
    {
        var tokenCalls = 0;
        using var fixture = new Fixture((request, _) => Task.FromResult(request.RequestUri!.AbsolutePath == "/oauth/request" ? Token("token-" + ++tokenCalls) : Json(Missing)));
        (await fixture.Members.ExistsAsync(Email)).ShouldBeFalse();
        var reference = await fixture.Members.LookupAsync(Email);
        reference.IsMember.ShouldBe(false); reference.Name.ShouldBeNull();
        tokenCalls.ShouldBe(1);
    }

    [Theory]
    [InlineData(200, "{\"Status_code\":\"2098\"}", 2)]
    [InlineData(403, "<html>blocked your access</html>", 1)]
    [InlineData(500, "server error", 1)]
    [InlineData(200, "not JSON", 1)]
    [InlineData(200, "[]", 1)]
    [InlineData(200, "{\"Status\":\"Success\",\"StatusCode\":1000,\"Result\":{\"Email\":\"someone-else@example.invalid\"}}", 1)]
    [InlineData(200, "{\"Status\":\"Failed\",\"StatusCode\":2002,\"Result\":{}}", 1)]
    [InlineData(200, "{\"Status_code\":\"2099\"}", 1)]
    public async Task Failed_or_malformed_lookup_must_not_validate_email(int status, string response, int expectedTokens)
    {
        var tokenCalls = 0; var memberCalls = 0;
        using var fixture = new Fixture((request, _) =>
        {
            if (request.RequestUri!.AbsolutePath == "/oauth/request") return Task.FromResult(Token("token-" + ++tokenCalls));
            memberCalls++; return Task.FromResult(Json(response, (HttpStatusCode)status));
        });
        var error = await Should.ThrowAsync<UserFriendlyException>(() => fixture.Members.ExistsAsync(Email));
        error.Message.ShouldContain("temporarily unavailable");
        tokenCalls.ShouldBe(expectedTokens); memberCalls.ShouldBe(expectedTokens);
    }

    [Theory]
    [InlineData(400, "{\"error\":\"invalid_client\"}")]
    [InlineData(200, "{\"access_token\":\"secret\",\"expires_in\":0,\"token_type\":\"bearer\"}")]
    [InlineData(200, "{\"access_token\":\"secret\",\"expires_in\":28799,\"token_type\":\"unknown\"}")]
    [InlineData(200, "{\"expires_in\":28799,\"token_type\":\"bearer\"}")]
    [InlineData(200, "not JSON")]
    public async Task Invalid_token_response_must_not_send_member_request(int status, string body)
    {
        var calls = 0;
        using var fixture = new Fixture((_, _) => { calls++; return Task.FromResult(Json(body, (HttpStatusCode)status)); });
        var error = await Should.ThrowAsync<UserFriendlyException>(() => fixture.Members.ExistsAsync(Email));
        error.Message.ShouldNotContain("secret"); calls.ShouldBe(1);
    }

    [Fact]
    public async Task Timeout_must_fail_closed_but_caller_cancellation_should_propagate()
    {
        using var timeout = new Fixture((_, _) => throw new TaskCanceledException("timeout"));
        await Should.ThrowAsync<UserFriendlyException>(() => timeout.Members.ExistsAsync(Email));
        using var cancelled = new CancellationTokenSource(); cancelled.Cancel();
        await Should.ThrowAsync<OperationCanceledException>(() => timeout.Members.ExistsAsync(Email, cancelled.Token));
    }

    [Fact]
    public async Task Disabled_local_mode_does_not_use_network()
    {
        using var fixture = new Fixture((_, _) => throw new Exception("Network must not be used"), enabled: false);
        (await fixture.Members.ExistsAsync(Email)).ShouldBeTrue();
        var reference = await fixture.Members.LookupAsync(Email);
        reference.IsMember.ShouldBeNull(); reference.Name.ShouldBeNull();
    }
}
