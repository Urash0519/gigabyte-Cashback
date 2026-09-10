using Microsoft.EntityFrameworkCore;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.Modeling;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Identity;
using Volo.Abp.Identity.EntityFrameworkCore;
using Volo.Abp.OpenIddict.EntityFrameworkCore;
using Volo.Abp.PermissionManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;
using Volo.Abp.TenantManagement;
using Volo.Abp.TenantManagement.EntityFrameworkCore;
using Gigabyte.Cashback.Files;
using Gigabyte.Cashback.Foundation;
using Gigabyte.Cashback.Notifications;
using Gigabyte.Cashback.Operations;

namespace Gigabyte.Cashback.EntityFrameworkCore;

[ReplaceDbContext(typeof(IIdentityDbContext))]
[ReplaceDbContext(typeof(ITenantManagementDbContext))]
[ConnectionStringName("Default")]
public class CashbackDbContext :
    AbpDbContext<CashbackDbContext>,
    IIdentityDbContext,
    ITenantManagementDbContext
{
    public DbSet<FoundationVerification> FoundationVerifications { get; set; }
    public DbSet<NotificationOutboxMessage> NotificationOutboxMessages { get; set; }
    public DbSet<StoredFileRecord> StoredFileRecords { get; set; }
    public DbSet<Campaign> Campaigns { get; set; }
    public DbSet<CampaignCatalogEntry> CampaignCatalogEntries { get; set; }
    public DbSet<CampaignVersion> CampaignVersions { get; set; }
    public DbSet<ClaimRecord> Claims { get; set; }
    public DbSet<ClaimRevision> ClaimRevisions { get; set; }
    public DbSet<RuleReservation> RuleReservations { get; set; }
    public DbSet<PaymentAttempt> PaymentAttempts { get; set; }
    public DbSet<ReconciliationEntry> ReconciliationEntries { get; set; }
    public DbSet<SerialReservation> SerialReservations { get; set; }
    public DbSet<OperationEvent> OperationEvents { get; set; }
    public DbSet<PaymentRecord> Payments { get; set; }

    #region Entities from the modules

    /* Notice: We only implemented IIdentityDbContext and ITenantManagementDbContext
     * and replaced them for this DbContext. This allows you to perform JOIN
     * queries for the entities of these modules over the repositories easily. You
     * typically don't need that for other modules. But, if you need, you can
     * implement the DbContext interface of the needed module and use ReplaceDbContext
     * attribute just like IIdentityDbContext and ITenantManagementDbContext.
     *
     * More info: Replacing a DbContext of a module ensures that the related module
     * uses this DbContext on runtime. Otherwise, it will use its own DbContext class.
     */

    //Identity
    public DbSet<IdentityUser> Users { get; set; }
    public DbSet<IdentityRole> Roles { get; set; }
    public DbSet<IdentityClaimType> ClaimTypes { get; set; }
    public DbSet<OrganizationUnit> OrganizationUnits { get; set; }
    public DbSet<IdentitySecurityLog> SecurityLogs { get; set; }
    public DbSet<IdentityLinkUser> LinkUsers { get; set; }
    public DbSet<IdentityUserDelegation> UserDelegations { get; set; }
    public DbSet<IdentitySession> Sessions { get; set; }
    // Tenant Management
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<TenantConnectionString> TenantConnectionStrings { get; set; }

    #endregion

    public CashbackDbContext(DbContextOptions<CashbackDbContext> options)
        : base(options)
    {

    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        /* Include modules to your migration db context */

        builder.ConfigurePermissionManagement();
        builder.ConfigureSettingManagement();
        builder.ConfigureBackgroundJobs();
        builder.ConfigureAuditLogging();
        builder.ConfigureIdentity();
        builder.ConfigureOpenIddict();
        builder.ConfigureFeatureManagement();
        builder.ConfigureTenantManagement();
        builder.ConfigureCashbackOperations();

        builder.Entity<FoundationVerification>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "FoundationVerifications", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.CheckKey).IsRequired().HasMaxLength(FoundationConsts.MaxNameLength);
            b.Property(x => x.Status).IsRequired().HasMaxLength(32);
            b.Property(x => x.Detail).IsRequired().HasMaxLength(FoundationConsts.MaxDetailLength);
            b.HasIndex(x => new { x.CheckKey, x.CheckedAt });
        });

        builder.Entity<NotificationOutboxMessage>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "NotificationOutbox", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Channel).IsRequired().HasMaxLength(32);
            b.Property(x => x.RecipientMasked).IsRequired().HasMaxLength(FoundationConsts.MaxNameLength);
            b.Property(x => x.Subject).IsRequired().HasMaxLength(FoundationConsts.MaxNameLength);
            b.Property(x => x.Status).IsRequired().HasMaxLength(32);
            b.HasIndex(x => new { x.Status, x.CreationTime });
            b.Property(x => x.TemplateVersion).IsRequired().HasMaxLength(64).HasDefaultValue("1");
            b.HasOne<ClaimRecord>().WithMany().HasForeignKey(x => x.ClaimId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<StoredFileRecord>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "StoredFiles", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.BlobName).IsRequired().HasMaxLength(FoundationConsts.MaxNameLength);
            b.Property(x => x.OriginalName).IsRequired().HasMaxLength(FoundationConsts.MaxNameLength);
            b.Property(x => x.ContentType).IsRequired().HasMaxLength(FoundationConsts.MaxContentTypeLength);
            b.Property(x => x.Sha256).IsRequired().HasMaxLength(FoundationConsts.MaxHashLength);
            b.HasIndex(x => x.BlobName).IsUnique();
        });
    }
}
