using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Gigabyte.Cashback.EntityFrameworkCore;
using Gigabyte.Cashback.MultiTenancy;
using Volo.Abp.AspNetCore.Mvc.UI.Theme.LeptonXLite;
using Volo.Abp.AspNetCore.Mvc.UI.Theme.LeptonXLite.Bundling;
using Microsoft.OpenApi;
using OpenIddict.Validation.AspNetCore;
using Volo.Abp;
using Volo.Abp.Account;
using Volo.Abp.Account.Web;
using Volo.Abp.AspNetCore.MultiTenancy;
using Volo.Abp.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.Libs;
using Volo.Abp.AspNetCore.Mvc.UI.Bundling;
using Volo.Abp.AspNetCore.Mvc.UI.Theme.Shared;
using Volo.Abp.AspNetCore.Serilog;
using Volo.Abp.Autofac;
using Volo.Abp.Localization;
using Volo.Abp.Modularity;
using Volo.Abp.Security.Claims;
using Volo.Abp.Swashbuckle;
using Volo.Abp.UI.Navigation.Urls;
using Volo.Abp.VirtualFileSystem;
using Volo.Abp.Auditing;
using Volo.Abp.BlobStoring;
using Volo.Abp.BlobStoring.FileSystem;
using Volo.Abp.BlobStoring.Google;

namespace Gigabyte.Cashback;

[DependsOn(
    typeof(CashbackHttpApiModule),
    typeof(AbpAutofacModule),
    typeof(AbpAspNetCoreMultiTenancyModule),
    typeof(CashbackApplicationModule),
    typeof(CashbackEntityFrameworkCoreModule),
    typeof(AbpAspNetCoreMvcUiLeptonXLiteThemeModule),
    typeof(AbpAccountWebOpenIddictModule),
    typeof(AbpBlobStoringFileSystemModule),
    typeof(AbpBlobStoringGoogleModule),
    typeof(AbpAspNetCoreSerilogModule),
    typeof(AbpSwashbuckleModule)
)]
public class CashbackHttpApiHostModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        PreConfigure<OpenIddictBuilder>(builder =>
        {
            builder.AddValidation(options =>
            {
                options.AddAudiences("Cashback");
                options.UseLocalServer();
                options.UseAspNetCore();
            });
        });
    }

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();
        var hostingEnvironment = context.Services.GetHostingEnvironment();

        ConfigureAuthentication(context);
        if (hostingEnvironment.IsDevelopment() && configuration.GetValue("DevelopmentAuth:Enabled", false))
        {
            context.Services.AddAuthentication(options => { options.DefaultAuthenticateScheme = Controllers.DevAuthController.Scheme; options.DefaultChallengeScheme = Controllers.DevAuthController.Scheme; }).AddCookie(Controllers.DevAuthController.Scheme, options => { options.Cookie.Name = "Cashback.DevSession"; options.Cookie.HttpOnly = true; options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax; options.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return System.Threading.Tasks.Task.CompletedTask; }; options.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return System.Threading.Tasks.Task.CompletedTask; }; });
            Configure<Volo.Abp.Authorization.Permissions.AbpPermissionOptions>(options => options.ValueProviders.Add<DevelopmentPermissionValueProvider>());
            Configure<Volo.Abp.AspNetCore.Mvc.AntiForgery.AbpAntiForgeryOptions>(options => { options.TokenCookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax; options.TokenCookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest; });
        }
        Configure<AbpMvcLibsOptions>(options => options.CheckLibs = false);
        ConfigureBundles();
        ConfigureUrls(configuration);
        ConfigureConventionalControllers();
        ConfigureVirtualFileSystem(context);
        ConfigureCors(context, configuration);
        ConfigureSwaggerServices(context, configuration);
        ConfigureAuditing(configuration);
        var encryptionSecret = configuration["StringEncryption:DefaultPassPhrase"];
        if (!hostingEnvironment.IsDevelopment() && (string.IsNullOrWhiteSpace(encryptionSecret) || encryptionSecret.Length < 32))
            throw new InvalidOperationException("Configure StringEncryption:DefaultPassPhrase with a secret of at least 32 characters before running outside Development.");
        if (!string.IsNullOrWhiteSpace(encryptionSecret)) Configure<Volo.Abp.Security.Encryption.AbpStringEncryptionOptions>(options => options.DefaultPassPhrase = encryptionSecret);
        ConfigureBlobStorage(configuration, hostingEnvironment);
        var keyPath = configuration["DataProtection:KeyPath"];
        if (!string.IsNullOrWhiteSpace(keyPath))
            context.Services.AddDataProtection().SetApplicationName("Gigabyte.Cashback")
                .PersistKeysToFileSystem(new DirectoryInfo(keyPath));
        context.Services.AddHealthChecks();
    }

    private void ConfigureAuditing(IConfiguration configuration)
    {
        Configure<AbpAuditingOptions>(options =>
        {
            options.IsEnabled = configuration.GetValue("Auditing:IsEnabled", true);
            options.IsEnabledForGetRequests = false;
            options.HideErrors = false;
        });
    }

    private void ConfigureBlobStorage(IConfiguration configuration, IHostEnvironment environment)
    {
        Configure<AbpBlobStoringOptions>(options =>
        {
            options.Containers.Configure<Files.ClaimEvidenceContainer>(container =>
            {
                if (string.Equals(configuration["BlobStorage:Provider"], "Google", StringComparison.OrdinalIgnoreCase))
                {
                    container.UseGoogle(google =>
                    {
                        google.ProjectId = configuration["BlobStorage:Google:ProjectId"];
                        google.ContainerName = configuration["BlobStorage:Google:BucketName"];
                        google.CreateContainerIfNotExists = false;
                        google.UseApplicationDefaultCredentials = true;
                    });
                    return;
                }

                container.UseFileSystem(fileSystem =>
                {
                    fileSystem.BasePath = Path.GetFullPath(
                        configuration["BlobStorage:FileSystem:BasePath"] ?? "./App_Data/blobs",
                        environment.ContentRootPath);
                });
            });
        });
    }

    private void ConfigureAuthentication(ServiceConfigurationContext context)
    {
        var developmentMock = context.Services.GetHostingEnvironment().IsDevelopment()
            && context.Services.GetConfiguration().GetValue("DevelopmentAuth:Enabled", false);
        if (!developmentMock)
            context.Services.ForwardIdentityAuthenticationForBearer(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
        else
            context.Services.PostConfigure<Microsoft.AspNetCore.Authentication.AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = Controllers.DevAuthController.Scheme;
                options.DefaultChallengeScheme = Controllers.DevAuthController.Scheme;
            });
        context.Services.Configure<AbpClaimsPrincipalFactoryOptions>(options =>
        {
            options.IsDynamicClaimsEnabled = !developmentMock;
        });
    }

    private void ConfigureBundles()
    {
        Configure<AbpBundlingOptions>(options =>
        {
            options.StyleBundles.Configure(
                LeptonXLiteThemeBundles.Styles.Global,
                bundle =>
                {
                    bundle.AddFiles("/global-styles.css");
                }
            );
        });
    }

    private void ConfigureUrls(IConfiguration configuration)
    {
        Configure<AppUrlOptions>(options =>
        {
            options.Applications["MVC"].RootUrl = configuration["App:SelfUrl"];
            options.RedirectAllowedUrls.AddRange(configuration["App:RedirectAllowedUrls"]?.Split(',') ?? Array.Empty<string>());

            options.Applications["Angular"].RootUrl = configuration["App:ClientUrl"];
            options.Applications["Angular"].Urls[AccountUrlNames.PasswordReset] = "account/reset-password";
        });
    }

    private void ConfigureVirtualFileSystem(ServiceConfigurationContext context)
    {
        var hostingEnvironment = context.Services.GetHostingEnvironment();

        if (hostingEnvironment.IsDevelopment())
        {
            Configure<AbpVirtualFileSystemOptions>(options =>
            {
                ReplaceEmbeddedByPhysicalWhenAvailable<CashbackDomainSharedModule>(
                    options, hostingEnvironment, "Gigabyte.Cashback.Domain.Shared");
                ReplaceEmbeddedByPhysicalWhenAvailable<CashbackDomainModule>(
                    options, hostingEnvironment, "Gigabyte.Cashback.Domain");
                ReplaceEmbeddedByPhysicalWhenAvailable<CashbackApplicationContractsModule>(
                    options, hostingEnvironment, "Gigabyte.Cashback.Application.Contracts");
                ReplaceEmbeddedByPhysicalWhenAvailable<CashbackApplicationModule>(
                    options, hostingEnvironment, "Gigabyte.Cashback.Application");
            });
        }
    }

    private static void ReplaceEmbeddedByPhysicalWhenAvailable<TModule>(
        AbpVirtualFileSystemOptions options,
        IHostEnvironment environment,
        string projectDirectory)
    {
        var physicalPath = Path.GetFullPath(
            Path.Combine(environment.ContentRootPath, $"..{Path.DirectorySeparatorChar}{projectDirectory}"));

        if (Directory.Exists(physicalPath))
        {
            options.FileSets.ReplaceEmbeddedByPhysical<TModule>(physicalPath);
        }
    }

    private void ConfigureConventionalControllers()
    {
        Configure<AbpAspNetCoreMvcOptions>(options =>
        {
            options.ConventionalControllers.Create(typeof(CashbackApplicationModule).Assembly);
        });
    }

    private static void ConfigureSwaggerServices(ServiceConfigurationContext context, IConfiguration configuration)
    {
        context.Services.AddAbpSwaggerGenWithOAuth(
            configuration["AuthServer:Authority"]!,
            new Dictionary<string, string>
            {
                    {"Cashback", "Cashback API"}
            },
            options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo { Title = "Cashback API", Version = "v1" });
                options.DocInclusionPredicate((docName, description) => true);
                options.CustomSchemaIds(type => type.FullName);
            });
    }

    private void ConfigureCors(ServiceConfigurationContext context, IConfiguration configuration)
    {
        context.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(builder =>
            {
                builder
                    .WithOrigins(configuration["App:CorsOrigins"]?
                        .Split(",", StringSplitOptions.RemoveEmptyEntries)
                        .Select(o => o.RemovePostFix("/"))
                        .ToArray() ?? Array.Empty<string>())
                    .WithAbpExposedHeaders()
                    .SetIsOriginAllowedToAllowWildcardSubdomains()
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });
    }

    public override void OnApplicationInitialization(ApplicationInitializationContext context)
    {
        var app = context.GetApplicationBuilder();
        var env = context.GetEnvironment();

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseAbpRequestLocalization();

        if (!env.IsDevelopment())
        {
            app.UseErrorPage();
        }

        app.UseCorrelationId();
        app.MapAbpStaticAssets();
        app.UseRouting();
        app.UseHealthChecks("/health");
        app.UseCors();
        app.UseAuthentication();
        app.UseAbpOpenIddictValidation();

        if (MultiTenancyConsts.IsEnabled)
        {
            app.UseMultiTenancy();
        }
        app.UseUnitOfWork();
        app.UseDynamicClaims();
        app.UseAuthorization();

        app.UseSwagger();
        app.UseAbpSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Cashback API");

            var configuration = context.ServiceProvider.GetRequiredService<IConfiguration>();
            c.OAuthClientId(configuration["AuthServer:SwaggerClientId"]);
            c.OAuthScopes("Cashback");
        });

        app.UseAuditing();
        app.UseAbpSerilogEnrichers();
        app.UseConfiguredEndpoints();
    }
}
