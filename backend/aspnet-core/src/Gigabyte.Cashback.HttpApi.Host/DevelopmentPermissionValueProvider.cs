using System.Threading.Tasks;
using System.Linq;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Security.Claims;

namespace Gigabyte.Cashback;

public class DevelopmentPermissionValueProvider(IPermissionStore store, IHostEnvironment environment, IConfiguration configuration) : PermissionValueProvider(store), ITransientDependency
{
    public override string Name => "CashbackDevelopment";
    public override Task<MultiplePermissionGrantResult> CheckAsync(PermissionValuesCheckContext context)
    {
        var result = new MultiplePermissionGrantResult(context.Permissions.Select(x => x.Name).ToArray());
        foreach (var permission in context.Permissions)
            result.Result[permission.Name] = environment.IsDevelopment() && configuration.GetValue("DevelopmentAuth:Enabled", false) && context.Principal?.IsInRole("cashback-dev-admin") == true && permission.Name.StartsWith("Cashback.") ? PermissionGrantResult.Granted : PermissionGrantResult.Undefined;
        return Task.FromResult(result);
    }
    public override Task<PermissionGrantResult> CheckAsync(PermissionValueCheckContext context) => Task.FromResult(environment.IsDevelopment() && configuration.GetValue("DevelopmentAuth:Enabled", false) && context.Principal?.IsInRole("cashback-dev-admin") == true && context.Permission.Name.StartsWith("Cashback.") ? PermissionGrantResult.Granted : PermissionGrantResult.Undefined);
}
