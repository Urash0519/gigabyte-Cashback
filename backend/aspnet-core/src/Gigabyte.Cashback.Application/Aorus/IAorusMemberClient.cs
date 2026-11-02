using System.Threading;
using System.Threading.Tasks;

namespace Gigabyte.Cashback.Aorus;

public interface IAorusMemberClient
{
    bool IsEnabled { get; }
    Task<bool> ExistsAsync(string email, CancellationToken cancellationToken = default);
}
