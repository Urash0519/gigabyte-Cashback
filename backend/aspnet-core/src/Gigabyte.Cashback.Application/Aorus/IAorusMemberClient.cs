using System.Threading;
using System.Threading.Tasks;

namespace Gigabyte.Cashback.Aorus;

public sealed record AorusMemberLookup(bool? IsMember, string? Name = null);

public interface IAorusMemberClient
{
    bool IsEnabled { get; }
    Task<bool> ExistsAsync(string email, CancellationToken cancellationToken = default);
    Task<AorusMemberLookup> LookupAsync(string email, CancellationToken cancellationToken = default);
}
