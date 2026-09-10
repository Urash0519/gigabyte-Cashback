using Gigabyte.Cashback.Operations;
using Microsoft.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.Modeling;

namespace Gigabyte.Cashback.EntityFrameworkCore;

public static class CashbackOperationsModelBuilderExtensions
{
    public static void ConfigureCashbackOperations(this ModelBuilder builder)
    {
        builder.Entity<CampaignCatalogEntry>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "CampaignCatalogEntries", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Kind).IsRequired().HasMaxLength(16);
            b.Property(x => x.NormalizedKey).IsRequired().HasMaxLength(128);
            b.Property(x => x.DataJson).IsRequired().HasColumnType("text");
            b.HasIndex(x => new { x.Kind, x.NormalizedKey }).IsUnique();
        });
        builder.Entity<PaymentAttempt>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "PaymentAttempts", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Status).IsRequired().HasMaxLength(32);
            b.Property(x => x.Reference).IsRequired().HasMaxLength(256);
            b.Property(x => x.Reason).IsRequired().HasMaxLength(2048);
            b.HasIndex(x => new { x.PaymentId, x.Number }).IsUnique();
            b.HasOne<PaymentRecord>().WithMany().HasForeignKey(x => x.PaymentId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ReconciliationEntry>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "ReconciliationEntries", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.ExternalPaymentId).IsRequired().HasMaxLength(256);
            b.Property(x => x.Reference).IsRequired().HasMaxLength(256);
            b.Property(x => x.Currency).IsRequired().HasMaxLength(3);
            b.Property(x => x.Result).IsRequired().HasMaxLength(32);
            b.Property(x => x.MatchStatus).IsRequired().HasMaxLength(32);
            b.Property(x => x.Reason).IsRequired().HasMaxLength(2048);
            b.HasIndex(x => new { x.MatchStatus, x.CreationTime });
            b.HasIndex(x => x.ExternalPaymentId);
            b.HasOne<PaymentRecord>().WithMany().HasForeignKey(x => x.PaymentId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<RuleReservation>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "RuleReservations", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.ScopeKey).IsRequired().HasMaxLength(128);
            b.HasIndex(x => x.ScopeKey).IsUnique();
            b.HasOne<ClaimRecord>().WithMany().HasForeignKey(x => x.ClaimId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ClaimRevision>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "ClaimRevisions", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.DataJson).IsRequired().HasColumnType("text");
            b.Property(x => x.BankCiphertext).IsRequired().HasColumnType("text");
            b.Property(x => x.Reason).IsRequired().HasMaxLength(2048);
            b.HasIndex(x => new { x.ClaimId, x.CreationTime });
            b.HasOne<ClaimRecord>().WithMany().HasForeignKey(x => x.ClaimId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<Campaign>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "Campaigns", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(256);
            b.Property(x => x.DraftJson).IsRequired().HasColumnType("text");
        });
        builder.Entity<CampaignVersion>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "CampaignVersions", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.SnapshotJson).IsRequired().HasColumnType("text");
            b.HasIndex(x => new { x.CampaignId, x.Version }).IsUnique();
            b.HasOne<Campaign>().WithMany().HasForeignKey(x => x.CampaignId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ClaimRecord>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "Claims", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Reference).IsRequired().HasMaxLength(64);
            b.Property(x => x.DataJson).IsRequired().HasColumnType("text");
            b.Property(x => x.BankCiphertext).IsRequired().HasColumnType("text");
            b.Property(x => x.ReviewStatus).IsRequired().HasMaxLength(32);
            b.Property(x => x.PaymentStatus).IsRequired().HasMaxLength(32);
            b.Property(x => x.Currency).IsRequired().HasMaxLength(3);
            b.HasIndex(x => x.Reference).IsUnique();
            b.HasIndex(x => new { x.OwnerId, x.CreationTime });
            b.HasIndex(x => new { x.CampaignId, x.ReviewStatus, x.PaymentStatus });
            b.HasOne<Campaign>().WithMany().HasForeignKey(x => x.CampaignId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne<CampaignVersion>().WithMany().HasForeignKey(x => x.CampaignVersionId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<SerialReservation>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "SerialReservations", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.SerialNumber).IsRequired().HasMaxLength(128);
            b.HasIndex(x => x.SerialNumber).IsUnique();
            b.HasOne<ClaimRecord>().WithMany().HasForeignKey(x => x.ClaimId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<OperationEvent>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "OperationEvents", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Action).IsRequired().HasMaxLength(64);
            b.Property(x => x.Reason).IsRequired().HasMaxLength(2048);
            b.Property(x => x.Actor).IsRequired().HasMaxLength(256);
            b.Property(x => x.CorrelationId).IsRequired().HasMaxLength(128);
            b.HasIndex(x => new { x.TargetId, x.CreationTime });
            b.HasIndex(x => x.CorrelationId);
        });
        builder.Entity<PaymentRecord>(b =>
        {
            b.ToTable(CashbackConsts.DbTablePrefix + "Payments", CashbackConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.BeneficiaryCiphertext).IsRequired().HasColumnType("text");
            b.Property(x => x.Currency).IsRequired().HasMaxLength(3);
            b.Property(x => x.Status).IsRequired().HasMaxLength(32);
            b.Property(x => x.ResultReference).IsRequired().HasMaxLength(256);
            b.Property(x => x.ExportSha256).IsRequired().HasMaxLength(64);
            b.HasIndex(x => x.ClaimId).IsUnique();
            b.HasIndex(x => new { x.BatchId, x.Status });
            b.HasOne<ClaimRecord>().WithMany().HasForeignKey(x => x.ClaimId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
