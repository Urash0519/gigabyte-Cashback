using System.Threading.Tasks;

namespace Gigabyte.Cashback.Data;

public interface ICashbackDbSchemaMigrator
{
    Task MigrateAsync();
}
