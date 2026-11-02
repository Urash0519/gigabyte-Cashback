using Volo.Abp.Account;
using Volo.Abp.Mapperly;
using Volo.Abp.FeatureManagement;
using Volo.Abp.Identity;
using Volo.Abp.Modularity;
using Volo.Abp.PermissionManagement;
using Volo.Abp.SettingManagement;
using Volo.Abp.TenantManagement;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System;
using System.Net.Http;
using Gigabyte.Cashback.Aorus;

namespace Gigabyte.Cashback;

[DependsOn(
    typeof(CashbackDomainModule),
    typeof(AbpAccountApplicationModule),
    typeof(CashbackApplicationContractsModule),
    typeof(AbpIdentityApplicationModule),
    typeof(AbpPermissionManagementApplicationModule),
    typeof(AbpTenantManagementApplicationModule),
    typeof(AbpFeatureManagementApplicationModule),
    typeof(AbpSettingManagementApplicationModule)
    )]
public class CashbackApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddMapperlyObjectMapper<CashbackApplicationModule>();
        context.Services.AddOptions<AorusApiOptions>()
            .Bind(context.Services.GetConfiguration().GetSection(AorusApiOptions.SectionName))
            .Validate(o => !o.Enabled || (Uri.TryCreate(o.BaseUrl, UriKind.Absolute, out var uri) &&
                uri.Scheme == Uri.UriSchemeHttps && string.IsNullOrEmpty(uri.UserInfo) &&
                !string.IsNullOrWhiteSpace(o.ClientId) && !string.IsNullOrWhiteSpace(o.ClientSecret) &&
                !string.IsNullOrWhiteSpace(o.Username) && !string.IsNullOrWhiteSpace(o.Password)),
                "Enabled AORUS verification requires an HTTPS BaseUrl and credentials.")
            .ValidateOnStart();
        context.Services.TryAddSingleton(TimeProvider.System);
        context.Services.AddHttpClient(AorusApiOptions.HttpClientName, (services, client) =>
        {
            client.BaseAddress = new Uri(services.GetRequiredService<Microsoft.Extensions.Options.IOptions<AorusApiOptions>>().Value.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(15);
            client.MaxResponseContentBufferSize = 64 * 1024;
        }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false })
            .RedactLoggedHeaders(["Authorization"]);
        context.Services.AddSingleton<AorusTokenProvider>();
        context.Services.AddSingleton<IAorusMemberClient, AorusMemberClient>();
    }
}
