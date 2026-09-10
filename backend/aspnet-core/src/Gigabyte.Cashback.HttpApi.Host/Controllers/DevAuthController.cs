using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Volo.Abp.AspNetCore.Mvc;
using Volo.Abp.Security.Claims;
using Volo.Abp.AspNetCore.Mvc.AntiForgery;

namespace Gigabyte.Cashback.Controllers;

[ApiController, Route("api/dev-auth"), AllowAnonymous]
public class DevAuthController(IHostEnvironment environment, IConfiguration configuration, IAbpAntiForgeryManager antiForgery) : AbpControllerBase
{
    public const string Scheme = "CashbackDevelopment";
    public record LoginInput(string Area);
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginInput input)
    {
        if (!environment.IsDevelopment() || !configuration.GetValue("DevelopmentAuth:Enabled", false))
            return NotFound();
        if (input.Area is not ("admin" or "public"))
            return BadRequest();
        // Both UAT applications share this cookie and development identity. Visiting
        // the consumer sign-in must not silently downgrade an existing admin session.
        // A consumer-only session still receives no administrative permissions.
        var area = input.Area == "admin" ||
            (User.Identity?.AuthenticationType == Scheme && CurrentUser.IsInRole("cashback-dev-admin"))
            ? "admin" : "public";
        var identity = new ClaimsIdentity(new[] { new Claim(AbpClaimTypes.UserId, "99000000-0000-0000-0000-000000000001"), new Claim(AbpClaimTypes.UserName, "yoyo.chen"), new Claim(AbpClaimTypes.Email, "yoyo.chen@gigabyte.com"), new Claim(AbpClaimTypes.Role, area == "admin" ? "cashback-dev-admin" : "cashback-dev-public") }, Scheme, AbpClaimTypes.UserName, AbpClaimTypes.Role);
        await HttpContext.SignInAsync(Scheme, new ClaimsPrincipal(identity), new AuthenticationProperties { ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8), IsPersistent = false });
        return Ok(new
        {
            isAuthenticated = true,
            email = "yoyo.chen@gigabyte.com",
            area,
            development = true
        });
    }
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(Scheme);
        return Ok(new
        {
            isAuthenticated = false
        });
    }
    [HttpGet("session")]
    public IActionResult Session()
    {
        antiForgery.SetCookie();
        return Ok(new
        {
            isAuthenticated = CurrentUser.IsAuthenticated,
            email = CurrentUser.Email,
            area = CurrentUser.IsInRole("cashback-dev-admin") ? "admin" : "public",
            development = environment.IsDevelopment() && configuration.GetValue("DevelopmentAuth:Enabled", false)
        });
    }
}
