using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Gigabyte.Cashback.Files;
using Gigabyte.Cashback.Notifications;
using Gigabyte.Cashback.Permissions;
using Volo.Abp;
using Volo.Abp.Auditing;
using Volo.Abp.BlobStoring;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Security.Encryption;
using Volo.Abp.Users;
using Volo.Abp.Uow;
using Volo.Abp.Tracing;

namespace Gigabyte.Cashback.Operations;

[RemoteService(IsEnabled = false)]
public partial class OperationsAppService : CashbackAppService, IOperationsAppService
{
    private readonly IRepository<Campaign, Guid> campaigns;
    private readonly IRepository<CampaignVersion, Guid> versions;
    private readonly IRepository<ClaimRecord, Guid> claims;
    private readonly IRepository<ClaimRevision, Guid> revisions;
    private readonly IRepository<RuleReservation, Guid> ruleReservations;
    private readonly IRepository<SerialReservation, Guid> serials;
    private readonly IRepository<PaymentRecord, Guid> payments;
    private readonly IRepository<OperationEvent, Guid> events;
    private readonly IRepository<StoredFileRecord, Guid> files;
    private readonly IRepository<NotificationOutboxMessage, Guid> notifications;
    private readonly IBlobContainer<ClaimEvidenceContainer> blobs;
    private readonly IStringEncryptionService encryption;
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };
    public OperationsAppService(IRepository<RuleReservation, Guid> ruleReservations, IRepository<ClaimRevision, Guid> revisions, IRepository<Campaign, Guid> campaigns, IRepository<CampaignVersion, Guid> versions, IRepository<ClaimRecord, Guid> claims, IRepository<SerialReservation, Guid> serials, IRepository<PaymentRecord, Guid> payments, IRepository<OperationEvent, Guid> events, IRepository<StoredFileRecord, Guid> files, IRepository<NotificationOutboxMessage, Guid> notifications, IBlobContainer<ClaimEvidenceContainer> blobs, IStringEncryptionService encryption)
    {
        this.ruleReservations = ruleReservations;
        this.revisions = revisions;
        this.campaigns = campaigns;
        this.versions = versions;
        this.claims = claims;
        this.serials = serials;
        this.payments = payments;
        this.events = events;
        this.files = files;
        this.notifications = notifications;
        this.blobs = blobs;
        this.encryption = encryption;
    }
    private static string Encode<T>(T value) => JsonSerializer.Serialize(value, Json);
    private static T Decode<T>(string value) => JsonSerializer.Deserialize<T>(value, Json)!;
    private static void Require(bool condition, string code)
    {
        if (!condition)
            throw new UserFriendlyException(code);
    }
    private async Task Permit(string permission) => await CheckPolicyAsync(permission);
    private Guid UserId() => CurrentUser.GetId();
    private bool Admin => CurrentUser.IsInRole("cashback-dev-admin");
    private async Task Owner(ClaimRecord claim)
    {
        if (claim.OwnerId != UserId())
            await Permit(CashbackPermissions.Claims.Review);
    }
    private async Task Log(Guid target, string action, string reason, long amount = 0)
    {
        await events.InsertAsync(new OperationEvent(GuidGenerator.Create(), target, action, reason, CurrentUser.Email ?? CurrentUser.Id?.ToString() ?? "system", amount, LazyServiceProvider.LazyGetRequiredService<ICorrelationIdProvider>().Get() ?? Guid.NewGuid().ToString("N")));
    }
    private async Task Notify(ClaimRecord claim, string subject)
    {
        var email = Decode<ClaimInput>(claim.DataJson).Email;
        var at = email.IndexOf('@');
        var templateVersion = "claim-update-v1";
        if (claim.CampaignVersionId.HasValue)
        {
            var snapshot = await versions.GetAsync(claim.CampaignVersionId.Value);
            var configured = Decode<CampaignInput>(snapshot.SnapshotJson).LegacyFields.GetValueOrDefault("notificationTemplateVersion");
            if (!string.IsNullOrWhiteSpace(configured)) templateVersion = configured;
        }
        await notifications.InsertAsync(new NotificationOutboxMessage(GuidGenerator.Create(), "Email", at > 0 ? email[..1] + "***" + email[at..] : "***", subject, claim.Id, templateVersion));
    }
    private async Task<CampaignDto> CampaignDto(Campaign c, bool admin)
    {
        if (CurrentUnitOfWork != null)
            await CurrentUnitOfWork.SaveChangesAsync();
        var all = await versions.GetListAsync(x => x.CampaignId == c.Id);
        var data = admin ? Decode<CampaignInput>(c.DraftJson) : Decode<CampaignInput>(all.Single(x => x.Version == c.PublishedVersion).SnapshotJson);
        return new()
        {
            Id = c.Id,
            Data = data,
            PublishedVersion = c.PublishedVersion,
            ConcurrencyStamp = c.ConcurrencyStamp,
            ReservedMinor = c.ReservedMinor,
            ApprovedMinor = c.ApprovedMinor,
            PaidMinor = c.PaidMinor,
            AvailableMinor = c.BudgetMinor - c.BufferMinor - c.ReservedMinor - c.ApprovedMinor - c.PaidMinor,
            Versions = admin ? all.OrderByDescending(x => x.Version).Select(x => new VersionDto { Id = x.Id, Version = x.Version, CreatedAt = x.CreationTime, Data = Decode<CampaignInput>(x.SnapshotJson) }).ToList() : []
        };
    }
    public async Task<List<CampaignDto>> GetCampaignsAsync(bool admin = false)
    {
        if (admin)
            await Permit(CashbackPermissions.Campaigns.Manage);
        var all = await campaigns.GetListAsync();
        var result = new List<CampaignDto>();
        foreach (var c in all.Where(x => admin || x.PublishedVersion > 0))
        {
            var campaign = await CampaignDto(c, admin);
            if (admin || !IsIntegrationTestCampaign(campaign.Data))
                result.Add(campaign);
        }
        return result;
    }
    // Keep synthetic fixtures available to operators and their existing claims, but out of public discovery.
    // The narrow legacy signature also covers fixtures created before dataPurpose was introduced.
    private static bool IsIntegrationTestCampaign(CampaignInput data) =>
        data.LegacyFields.GetValueOrDefault("dataPurpose") == "integration-test" ||
        (data.Slug.StartsWith("smoke-", StringComparison.Ordinal) &&
         data.Description == "Automated integration test" && data.Terms == "Synthetic test terms");
    public async Task<CampaignDto> CreateCampaignAsync(CampaignInput input)
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        ValidateBudget(input, 0);
        var c = new Campaign(GuidGenerator.Create()) { Name = input.Name, DraftJson = Encode(input), BudgetMinor = input.BudgetMinor, BufferMinor = input.BufferMinor };
        await campaigns.InsertAsync(c);
        await Log(c.Id, "CampaignCreated", input.Name, input.BudgetMinor);
        return await CampaignDto(c, true);
    }
    public async Task<CampaignDto> SaveCampaignAsync(Guid id, CampaignInput input)
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        var c = await campaigns.GetAsync(id);
        Require(!string.IsNullOrWhiteSpace(input.ConcurrencyStamp) && input.ConcurrencyStamp == c.ConcurrencyStamp, "Campaign changed; reload before saving.");
        await EnsureCurrencyAsync(c, input.Currency);
        ValidateBudget(input, c.ReservedMinor + c.ApprovedMinor + c.PaidMinor);
        c.Name = input.Name;
        c.DraftJson = Encode(input);
        await campaigns.UpdateAsync(c);
        await Log(id, "CampaignDraftSaved", "Draft configuration updated; live version unchanged");
        return await CampaignDto(c, true);
    }
    public async Task<CampaignDto> CopyCampaignAsync(Guid id)
    {
        await Permit(CashbackPermissions.Campaigns.Manage);
        var c = await campaigns.GetAsync(id);
        var data = Decode<CampaignInput>(c.DraftJson);
        data.Name += " (copy)";
        data.Slug += "-" + Guid.NewGuid().ToString("N")[..6];
        data.Status = "Draft";
        return await CreateCampaignAsync(data);
    }
    private async Task EnsureCurrencyAsync(Campaign c, string currency)
    {
        if (c.PublishedVersion > 0)
            Require(Decode<CampaignInput>((await versions.GetListAsync(x => x.CampaignId == c.Id && x.Version == c.PublishedVersion)).Single().SnapshotJson).Currency == currency, "Currency cannot change after first publication; create a new campaign.");
    }
    private static void ValidateBudget(CampaignInput d, long committed) => Require(d.BudgetMinor > 0 && d.BufferMinor >= 0 && d.BudgetMinor - d.BufferMinor >= committed, "Budget must cover buffer and existing commitments.");
    public async Task<CampaignDto> PublishCampaignAsync(Guid id, ReasonInput input)
    {
        await Permit(CashbackPermissions.Campaigns.Publish);
        Require(!string.IsNullOrWhiteSpace(input.Reason), "Publication reason is required.");
        var c = await campaigns.GetAsync(id);
        var d = Decode<CampaignInput>(c.DraftJson);
        await EnsureCurrencyAsync(c, d.Currency);
        ValidateBudget(d, c.ReservedMinor + c.ApprovedMinor + c.PaidMinor);
        Require(d.PurchaseStart <= d.PurchaseEnd && d.ClaimStart <= d.ClaimEnd && d.ClaimEnd >= d.PurchaseEnd && d.WaitingDays >= 0, "Invalid campaign dates.");
        Require(d.Products.Count > 0 && d.Products.All(x => x.CashbackMinor > 0 && !string.IsNullOrWhiteSpace(x.Id)) && d.Products.Select(x => x.Id).Distinct().Count() == d.Products.Count, "Products require unique IDs and positive cashback amounts.");
        Require(d.Retailers.Count > 0 && d.Retailers.All(x => !string.IsNullOrWhiteSpace(x.Id)) && d.Retailers.Select(x => x.Id).Distinct().Count() == d.Retailers.Count, "Retailers require unique IDs.");
        Require(d.Markets.Count > 0 && d.Currency.Length == 3 && d.MaxClaimsPerPerson > 0 && d.MaxItemsPerCategory > 0 && d.ClaimLimit > 0, "Invalid campaign limits or currency.");
        Require(!string.IsNullOrWhiteSpace(d.Terms) && !string.IsNullOrWhiteSpace(d.Privacy) && !string.IsNullOrWhiteSpace(d.TermsVersion), "Terms, privacy and terms version are required.");
        await Log(id, "BudgetAdjusted", input.Reason, d.BudgetMinor - c.BudgetMinor);
        c.PublishedVersion++;
        c.BudgetMinor = d.BudgetMinor;
        c.BufferMinor = d.BufferMinor;
        d.Status = d.Status == "Draft" ? "Active" : d.Status;
        c.DraftJson = Encode(d);
        await versions.InsertAsync(new CampaignVersion(GuidGenerator.Create(), id, c.PublishedVersion, Encode(d)));
        await campaigns.UpdateAsync(c);
        await Log(id, "CampaignPublished", input.Reason);
        return await CampaignDto(c, true);
    }
    private async Task<ClaimDto> ClaimDto(ClaimRecord c)
    {
        if (CurrentUnitOfWork != null)
            await CurrentUnitOfWork.SaveChangesAsync();
        var d = Decode<ClaimInput>(c.DataJson);
        d.Bank = string.IsNullOrEmpty(c.BankCiphertext) ? new() : Decode<BankInput>(encryption.Decrypt(c.BankCiphertext)!);
        d.Bank.Iban = Mask(d.Bank.Iban);
        d.Bank.AccountNumber = Mask(d.Bank.AccountNumber);
        d.Bank.SortCode = Mask(d.Bank.SortCode);
        return new()
        {
            Id = c.Id,
            Reference = c.Reference,
            Data = d,
            Revisions = (await revisions.GetListAsync(x => x.ClaimId == c.Id)).OrderByDescending(x => x.CreationTime).Select(x => new ClaimRevisionDto { Id = x.Id, CreatedAt = x.CreationTime, Reason = x.Reason, AmountMinor = x.AmountMinor, Data = Decode<ClaimInput>(x.DataJson) }).ToList(),
            ReviewStatus = c.ReviewStatus,
            OnHold = c.OnHold,
            PaymentStatus = c.PaymentStatus,
            AmountMinor = c.AmountMinor,
            Currency = c.Currency,
            CreatedAt = c.CreationTime,
            SubmittedAt = c.SubmittedAt,
            CampaignVersionId = c.CampaignVersionId,
            History = (await events.GetListAsync(x => x.TargetId == c.Id)).Where(x => Admin || x.Action != "InternalNote").OrderBy(x => x.CreationTime).Select(EventDto).ToList()
        };
    }
    private static string Household(ClaimInput d) => string.Concat((d.ResidenceCountry + "|" + d.Postcode + "|" + d.City + "|" + d.Address1 + "|" + d.Address2).Where(c => !char.IsWhiteSpace(c))).ToUpperInvariant();
    private static string Mask(string s) => s.Length <= 4 ? new string('*', s.Length) : new string('*', s.Length - 4) + s[^4..];
    public async Task<List<ClaimDto>> GetClaimsAsync(bool admin = false)
    {
        if (admin)
            await Permit(CashbackPermissions.Claims.Review);
        var user = UserId();
        var all = await claims.GetListAsync(x => admin || x.OwnerId == user);
        var result = new List<ClaimDto>();
        foreach (var c in all.OrderByDescending(x => x.CreationTime))
            result.Add(await ClaimDto(c));
        return result;
    }
    public async Task<CampaignDto> GetClaimCampaignAsync(Guid id)
    {
        var claim = await claims.GetAsync(id);
        await Owner(claim);
        var campaign = await campaigns.GetAsync(claim.CampaignId);
        var result = await CampaignDto(campaign, false);
        // Existing claims remain usable even when their campaign is hidden from discovery or republished.
        var version = await versions.GetAsync(claim.CampaignVersionId!.Value);
        result.Data = Decode<CampaignInput>(version.SnapshotJson);
        result.PublishedVersion = version.Version;
        return result;
    }
    [DisableAuditing]
    public async Task<ClaimDto> CreateClaimAsync(ClaimInput input)
    {
        var owner = UserId();
        input.Attachments = [];
        var c = await campaigns.GetAsync(input.CampaignId);
        Require(c.PublishedVersion > 0, "Campaign is not published.");
        var v = (await versions.GetListAsync(x => x.CampaignId == c.Id && x.Version == c.PublishedVersion)).Single();
        var claim = new ClaimRecord(GuidGenerator.Create()) { CampaignId = c.Id, CampaignVersionId = v.Id, OwnerId = owner, Reference = "GB-" + Guid.NewGuid().ToString("N").ToUpperInvariant(), Currency = Decode<CampaignInput>(v.SnapshotJson).Currency };
        StoreInput(claim, input);
        await claims.InsertAsync(claim);
        await Log(claim.Id, "DraftCreated", "Claim draft created");
        return await ClaimDto(claim);
    }
    private void StoreInput(ClaimRecord c, ClaimInput input)
    {
        input.Bank.BankCountry = input.BankCountry;
        if (!input.Bank.Iban.Contains('*') && !input.Bank.AccountNumber.Contains('*'))
            c.BankCiphertext = encryption.Encrypt(Encode(input.Bank))!;
        input.Bank = new();
        c.DataJson = Encode(input);
    }
    [DisableAuditing]
    public async Task<ClaimDto> SaveClaimAsync(Guid id, ClaimInput input)
    {
        var c = await claims.GetAsync(id);
        await Owner(c);
        Require(c.ReviewStatus is "Draft" or "MoreInfoRequired", "Only draft or requested supplement can be changed.");
        Require(input.CampaignId == c.CampaignId, "Campaign cannot change.");
        var previous = Decode<ClaimInput>(c.DataJson);
        input.Attachments = previous.Attachments;
        if (c.ReviewStatus == "MoreInfoRequired")
        {
            Require(!string.IsNullOrWhiteSpace(input.ChangeReason), "A correction reason is required.");
            await revisions.InsertAsync(new ClaimRevision(GuidGenerator.Create(), c, input.ChangeReason));
            input.Bank = Decode<BankInput>(encryption.Decrypt(c.BankCiphertext)!);
        }
        StoreInput(c, input);
        await claims.UpdateAsync(c);
        await Log(id, "ClaimSaved", c.ReviewStatus == "Draft" ? "Draft updated" : input.ChangeReason);
        return await ClaimDto(c);
    }
    [UnitOfWork(isTransactional: true)]
    public async Task<ClaimDto> SubmitClaimAsync(Guid id)
    {
        var c = await claims.GetAsync(id);
        await Owner(c);
        Require(c.ReviewStatus is "Draft" or "MoreInfoRequired", "Claim cannot be submitted from this state.");
        var d = Decode<ClaimInput>(c.DataJson);
        var version = await versions.GetAsync(c.CampaignVersionId!.Value);
        var v = Decode<CampaignInput>(version.SnapshotJson);
        var campaign = await campaigns.GetAsync(c.CampaignId);
        var now = Clock.Now;
        Require(c.ReviewStatus != "Draft" || version.Version == campaign.PublishedVersion, "Campaign has a newer published version. Review and apply the latest version before submitting.");
        var localDate = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(now, DateTimeKind.Utc), TimeZoneInfo.FindSystemTimeZoneById(v.TimeZone)).Date;
        Require(d.TermsAccepted && d.PrivacyAccepted, "Terms and privacy consent are required.");
        Require(!string.IsNullOrWhiteSpace(d.FirstName) && !string.IsNullOrWhiteSpace(d.LastName) && !string.IsNullOrWhiteSpace(d.Address1) && !string.IsNullOrWhiteSpace(d.Postcode) && !string.IsNullOrWhiteSpace(d.City), "Complete applicant name and address.");
        Require(d.Email.Contains('@') && string.Equals(d.Email, d.ConfirmEmail, StringComparison.OrdinalIgnoreCase), "Email confirmation must match.");
        Require(v.Markets.Contains(d.Market), "Select an eligible campaign market.");
        Require(v.Markets.Contains(d.ResidenceCountry) && v.Markets.Contains(d.PurchaseCountry), "Residence and purchase country must be campaign markets.");
        Require(d.PurchaseDate.Date >= v.PurchaseStart.Date && d.PurchaseDate.Date <= v.PurchaseEnd.Date && d.PurchaseDate.Date.AddDays(v.WaitingDays) <= localDate, "Purchase date or waiting period is not eligible.");
        Require(d.PurchaseAmountMinor > 0 && !string.IsNullOrWhiteSpace(d.InvoiceNumber), "Invoice number and purchase amount are required.");
        Require(v.Retailers.Any(r => r.Id == d.RetailerId && r.Country == d.PurchaseCountry && (!r.ValidFrom.HasValue || r.ValidFrom.Value.Date <= d.PurchaseDate.Date) && (!r.ValidTo.HasValue || r.ValidTo.Value.Date >= d.PurchaseDate.Date)), "Retailer is not eligible.");
        var bank = Decode<BankInput>(encryption.Decrypt(c.BankCiphertext)!);
        Require(!string.IsNullOrWhiteSpace(bank.AccountHolder) && (!string.IsNullOrWhiteSpace(bank.Iban) || !string.IsNullOrWhiteSpace(bank.AccountNumber)), "Bank account holder and account are required.");
        Require(d.Attachments.Any(x => x.Kind == "Invoice") && d.Items.All(i => d.Attachments.Any(x => x.Kind == "SerialNumber" && x.ProductId == i.ProductId)), "Invoice and each product serial photo are required.");
        Require(d.Items.Count > 0 && d.Items.All(i => v.Products.Any(p => p.Id == i.ProductId)) && d.Items.All(i => !string.IsNullOrWhiteSpace(i.SerialNumber)), "Eligible products and serial numbers are required.");
        Require(d.Items.GroupBy(i => v.Products.Single(p => p.Id == i.ProductId).Category).All(g => g.Count() <= v.MaxItemsPerCategory), "Category quantity limit exceeded.");
        Require(d.Items.GroupBy(i => i.ProductId).All(g => g.Count() <= v.Products.Single(p => p.Id == g.Key).QuantityLimit), "Product quantity limit exceeded.");
        Require(d.Items.Select(i => i.SerialNumber.Trim().ToUpperInvariant()).Distinct().Count() == d.Items.Count, "Duplicate serial in claim.");
        foreach (var item in d.Items)
        {
            var purchase = item.PurchaseDate ?? d.PurchaseDate;
            var retailer = string.IsNullOrWhiteSpace(item.RetailerId) ? d.RetailerId : item.RetailerId;
            Require(purchase.Date >= v.PurchaseStart.Date && purchase.Date <= v.PurchaseEnd.Date && purchase.Date.AddDays(v.WaitingDays) <= localDate, "Product purchase date is not eligible.");
            Require(v.Retailers.Any(r => r.Id == retailer && r.Country == d.PurchaseCountry && (!r.ValidFrom.HasValue || r.ValidFrom.Value.Date <= purchase.Date) && (!r.ValidTo.HasValue || r.ValidTo.Value.Date >= purchase.Date)), "Product retailer is not eligible.");
            item.AmountMinor = v.Products.Single(p => p.Id == item.ProductId).CashbackMinor;
        }
        var existingAll = await claims.GetListAsync(x => x.Id != c.Id && x.ReviewStatus != "Draft" && x.ReviewStatus != "Rejected" && x.ReviewStatus != "Cancelled");
        var existing = existingAll.Where(x => x.CampaignId == c.CampaignId).ToList();
        Require(existing.Count < v.ClaimLimit, "Claim limit reached.");
        Require(existing.Count(x => x.OwnerId == c.OwnerId || string.Equals(Decode<ClaimInput>(x.DataJson).Email, d.Email, StringComparison.OrdinalIgnoreCase)) < v.MaxClaimsPerPerson, "Applicant claim limit exceeded.");
        var householdLimit = v.LegacyFields.TryGetValue("maxClaimsPerHousehold", out var householdValue) && int.TryParse(householdValue, out var configuredHousehold) ? configuredHousehold : v.MaxClaimsPerHousehold;
        Require(householdLimit > 0 && existing.Count(x => Household(Decode<ClaimInput>(x.DataJson)) == Household(d)) < householdLimit, "Household claim limit exceeded.");
        var group = v.LegacyFields.GetValueOrDefault("exclusivityGroup", v.ExclusivityGroup);
        if (!string.IsNullOrWhiteSpace(group))
        {
            foreach (var other in existingAll.Where(x => x.CampaignId != c.CampaignId && (x.OwnerId == c.OwnerId || string.Equals(Decode<ClaimInput>(x.DataJson).Email, d.Email, StringComparison.OrdinalIgnoreCase))))
            {
                var otherRules = Decode<CampaignInput>((await versions.GetAsync(other.CampaignVersionId!.Value)).SnapshotJson);
                Require(otherRules.LegacyFields.GetValueOrDefault("exclusivityGroup", otherRules.ExclusivityGroup) != group, "An application already exists in an exclusive campaign group.");
            }
        }
        foreach (var item in d.Items)
        {
            var sn = item.SerialNumber.Trim().ToUpperInvariant();
            Require(!await serials.AnyAsync(x => x.SerialNumber == sn && x.ClaimId != c.Id), "Serial number already claimed.");
        }
        var calculatedAmount = d.Items.Sum(i => i.AmountMinor);
        if (c.ReviewStatus == "Draft")
        {
            var live = Decode<CampaignInput>((await versions.GetListAsync(x => x.CampaignId == campaign.Id && x.Version == campaign.PublishedVersion)).Single().SnapshotJson);
            Require(live.AcceptingClaims && live.Status != "Archived" && now >= v.ClaimStart && now <= v.ClaimEnd, "Campaign is not accepting claims.");
            campaign.Reserve(calculatedAmount);
            c.SubmittedAt = now;
            await Log(campaign.Id, "BudgetReserved", c.Reference, calculatedAmount);
        }
        else
        {
            var delta = calculatedAmount - c.AmountMinor;
            if (delta > 0)
                campaign.Reserve(delta);
            if (delta < 0)
                campaign.Release(-delta, false);
            await Log(campaign.Id, "BudgetCorrection", c.Reference, delta);
        }
        var ownedSerials = await serials.GetListAsync(x => x.ClaimId == c.Id);
        var desiredSerials = d.Items.Select(x => x.SerialNumber.Trim().ToUpperInvariant()).ToHashSet();
        foreach (var old in ownedSerials.Where(x => !desiredSerials.Contains(x.SerialNumber)))
            await serials.DeleteAsync(old);
        foreach (var sn in desiredSerials.Where(sn => ownedSerials.All(x => x.SerialNumber != sn)))
            await serials.InsertAsync(new SerialReservation(GuidGenerator.Create(), c.Id, sn));
        var desiredScopes = string.IsNullOrWhiteSpace(group) ? new HashSet<string>() : new[]
        {
            "exclusive-owner:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(group.Trim().ToUpperInvariant() + "|" + c.OwnerId))),
            "exclusive-email:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(group.Trim().ToUpperInvariant() + "|" + d.Email.Trim().ToUpperInvariant())))
        }.ToHashSet();
        var ownedScopes = await ruleReservations.GetListAsync(x => x.ClaimId == c.Id);
        foreach (var old in ownedScopes.Where(x => !desiredScopes.Contains(x.ScopeKey)))
            await ruleReservations.DeleteAsync(old);
        foreach (var key in desiredScopes.Where(key => ownedScopes.All(x => x.ScopeKey != key)))
        {
            Require(!await ruleReservations.AnyAsync(x => x.ScopeKey == key && x.ClaimId != c.Id), "An exclusive campaign application already reserves this applicant.");
            await ruleReservations.InsertAsync(new RuleReservation(GuidGenerator.Create(), c.Id, key));
        }
        c.AmountMinor = calculatedAmount;
        await campaigns.UpdateAsync(campaign);
        c.DataJson = Encode(d);
        c.ReviewStatus = "Submitted";
        await claims.UpdateAsync(c);
        await Log(id, "Submitted", "Terms " + v.TermsVersion + "; privacy " + v.LegacyFields.GetValueOrDefault("privacyVersion", v.TermsVersion) + " accepted; marketing=" + d.MarketingAccepted, c.AmountMinor);
        await Notify(c, "Claim received " + c.Reference);
        return await ClaimDto(c);
    }
    [UnitOfWork(isTransactional: true)]
    public async Task<ClaimDto> ClaimActionAsync(Guid id, ActionInput input)
    {
        Require(!string.IsNullOrWhiteSpace(input.Reason), "A reason is required.");
        var c = await claims.GetAsync(id);
        var personal = input.Action is "cancel" or "message";
        if (personal)
            await Owner(c);
        else
            await Permit(CashbackPermissions.Claims.Review);
        var campaign = await campaigns.GetAsync(c.CampaignId);
        switch (input.Action)
        {
            case "check":
                Require(c.ReviewStatus is "Submitted" or "UnderReview", "Checks require an active review.");
                Require(new[] { "membership", "invoice", "serial", "eligibility", "duplicates", "rma", "evidence" }.Contains(input.Value), "Unknown check.");
                c.ReviewStatus = "UnderReview";
                await Log(id, "Check:" + input.Value, input.Reason);
                break;
            case "approve":
                Require(c.ReviewStatus is "Submitted" or "UnderReview", "Claim is not awaiting review.");
                Require(!c.OnHold, "Release risk hold first.");
                var history = await events.GetListAsync(x => x.TargetId == id);
                var latestSubmit = history.Where(x => x.Action == "Submitted").Max(x => x.CreationTime);
                Require(new[] { "membership", "invoice", "serial", "eligibility", "duplicates", "rma", "evidence" }.All(k => history.Any(x => x.Action == "Check:" + k && x.CreationTime >= latestSubmit)), "Complete all seven required checks after the latest submission.");
                campaign.Approve(c.AmountMinor);
                c.ReviewStatus = "Approved";
                await Log(campaign.Id, "BudgetApproved", c.Reference, c.AmountMinor);
                break;
            case "reject":
                Require(c.ReviewStatus is "Submitted" or "UnderReview" or "MoreInfoRequired", "Claim cannot be rejected from this state.");
                campaign.Release(c.AmountMinor, false);
                c.ReviewStatus = "Rejected";
                await serials.DeleteAsync(x => x.ClaimId == id);
                await ruleReservations.DeleteAsync(x => x.ClaimId == id);
                await Log(campaign.Id, "BudgetReleased", c.Reference, c.AmountMinor);
                break;
            case "supplement":
                Require(c.ReviewStatus is "Submitted" or "UnderReview", "Claim cannot request supplement.");
                c.ReviewStatus = "MoreInfoRequired";
                break;
            case "hold":
                Require(c.PaymentStatus is "None" or "Authorized" or "Failed", "Payment risk prevents changing hold.");
                c.OnHold = true;
                break;
            case "release-hold":
                Require(c.OnHold, "Claim has no hold.");
                c.OnHold = false;
                break;
            case "cancel":
                if (c.PaymentStatus != "None")
                {
                    await Log(id, "CancellationRequested", input.Reason);
                    return await ClaimDto(c);
                }
                Require(c.ReviewStatus is not ("Cancelled" or "Rejected"), "Claim already closed.");
                if (c.ReviewStatus != "Draft")
                {
                    campaign.Release(c.AmountMinor, c.ReviewStatus == "Approved");
                    await Log(campaign.Id, "BudgetReleased", c.Reference, c.AmountMinor);
                }
                c.ReviewStatus = "Cancelled";
                await serials.DeleteAsync(x => x.ClaimId == id);
                await ruleReservations.DeleteAsync(x => x.ClaimId == id);
                break;
            case "message":
                break;
            case "internal-note":
                break;
            default:
                throw new UserFriendlyException("Unknown claim action.");
        }
        await campaigns.UpdateAsync(campaign);
        await claims.UpdateAsync(c);
        await Log(id, input.Action == "internal-note" ? "InternalNote" : input.Action, input.Reason);
        if (input.Action is "approve" or "reject" or "supplement" or "message")
            await Notify(c, "Claim update " + c.Reference);
        return await ClaimDto(c);
    }
    [DisableAuditing]
    public async Task<EvidenceDto> UploadEvidenceAsync(Guid id, EvidenceUploadInput input)
    {
        var c = await claims.GetAsync(id);
        await Owner(c);
        Require(c.ReviewStatus is "Draft" or "MoreInfoRequired", "Evidence can only be uploaded to draft / supplement.");
        var ext = Path.GetExtension(input.FileName).ToLowerInvariant();
        Require(new[] { ".jpg", ".jpeg", ".png", ".pdf", ".tif", ".tiff" }.Contains(ext) && input.Content.Length > 0 && input.Content.Length <= 8 * 1024 * 1024, "Evidence must be PDF, JPEG, PNG or TIFF up to 8 MB.");
        var bytes = input.Content;
        var magic = ext switch
        {
            ".pdf" => bytes.Length > 4 && Encoding.ASCII.GetString(bytes, 0, 4) == "%PDF",
            ".png" => bytes.Length > 8 && bytes[0] == 137 && bytes[1] == 80 && bytes[2] == 78 && bytes[3] == 71,
            ".jpg" or ".jpeg" => bytes.Length > 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255,
            _ => bytes.Length > 4 && ((bytes[0] == 73 && bytes[1] == 73 && bytes[2] == 42 && bytes[3] == 0) || (bytes[0] == 77 && bytes[1] == 77 && bytes[2] == 0 && bytes[3] == 42))
        };
        Require(magic, "File signature does not match extension.");
        Require(input.Kind is "Invoice" or "SerialNumber", "Unknown evidence kind.");
        var d = Decode<ClaimInput>(c.DataJson);
        Require(d.Attachments.Count < 20, "Maximum 20 evidence files per claim.");
        var fileId = GuidGenerator.Create();
        var name = $"claims/{id:N}/{fileId:N}{ext}";
        await blobs.SaveAsync(name, bytes);
        await files.InsertAsync(new StoredFileRecord(fileId, name, Path.GetFileName(input.FileName), "application/octet-stream", bytes.Length, Convert.ToHexString(SHA256.HashData(bytes))));
        var evidence = new EvidenceDto { Id = fileId, FileName = Path.GetFileName(input.FileName), Kind = input.Kind, ProductId = input.ProductId, Size = bytes.Length };
        d.Attachments.Add(evidence);
        c.DataJson = Encode(d);
        await claims.UpdateAsync(c);
        await Log(id, "EvidenceUploaded", $"Evidence {fileId}; pending manual safety review");
        return evidence;
    }
    public async Task<FileResultDto> GetEvidenceAsync(Guid id, Guid fileId)
    {
        var c = await claims.GetAsync(id);
        await Owner(c);
        Require(Decode<ClaimInput>(c.DataJson).Attachments.Any(x => x.Id == fileId), "Evidence does not belong to claim.");
        var file = await files.GetAsync(fileId);
        await Log(id, "EvidenceDownloaded", fileId.ToString());
        return new()
        {
            FileName = file.OriginalName,
            ContentType = "application/octet-stream",
            Content = await blobs.GetAllBytesAsync(file.BlobName)
        };
    }
    private static PaymentDto PaymentDto(PaymentRecord p) => new() { Id = p.Id, ClaimId = p.ClaimId, BatchId = p.BatchId, Status = p.Status, AmountMinor = p.AmountMinor, Currency = p.Currency, ResultReference = p.ResultReference, ExportSha256 = p.ExportSha256, CreatedAt = p.CreationTime };
    public async Task<List<PaymentDto>> GetPaymentsAsync()
    {
        await Permit(CashbackPermissions.Payments.Authorize);
        return (await payments.GetListAsync()).OrderByDescending(x => x.CreationTime).Select(PaymentDto).ToList();
    }
    [UnitOfWork(isTransactional: true)]
    public async Task<List<PaymentDto>> CreatePaymentsAsync(PaymentInput input)
    {
        await Permit(CashbackPermissions.Payments.Authorize);
        Require(input.ClaimIds.Count > 0 && input.ClaimIds.Distinct().Count() == input.ClaimIds.Count && !string.IsNullOrWhiteSpace(input.Reason), "Select unique claims and provide authorization reason.");
        var batch = GuidGenerator.Create();
        var result = new List<PaymentDto>();
        foreach (var id in input.ClaimIds)
        {
            var c = await claims.GetAsync(id);
            Require(c.ReviewStatus == "Approved" && !c.OnHold && c.PaymentStatus == "None", "Only approved, unheld, unpaid claims can be authorized.");
            Require(!await payments.AnyAsync(x => x.ClaimId == id), "Payment instruction already exists.");
            var p = new PaymentRecord(GuidGenerator.Create(), id, batch, c.BankCiphertext, c.AmountMinor, c.Currency);
            await payments.InsertAsync(p);
            await Attempts.InsertAsync(new PaymentAttempt(GuidGenerator.Create(), p.Id, 1, input.Reason));
            c.PaymentStatus = p.Status;
            await claims.UpdateAsync(c);
            await Log(id, "PaymentAuthorized", input.Reason, c.AmountMinor);
            await Log(p.Id, "PaymentAuthorized", input.Reason, c.AmountMinor);
            result.Add(PaymentDto(p));
        }
        return result;
    }
    [UnitOfWork(isTransactional: true)]
    public async Task<PaymentDto> PaymentActionAsync(Guid id, ActionInput input)
    {
        await Permit(CashbackPermissions.Payments.Reconcile);
        Require(!string.IsNullOrWhiteSpace(input.Reason), "A reason is required.");
        var p = await payments.GetAsync(id);
        var c = await claims.GetAsync(p.ClaimId);
        var next = input.Action switch
        {
            "submitted" => "Submitted",
            "processing" => "Processing",
            "unknown" => "Unknown",
            "succeeded" => "Succeeded",
            "failed" => "Failed",
            "retry" => "Authorized",
            _ => ""
        };
        Require(next != "", "Unknown payment action.");
        var valid = input.Action switch
        {
            "submitted" => p.Status == "Authorized" && !c.OnHold,
            "processing" => p.Status == "Submitted",
            "unknown" => p.Status is "Submitted" or "Processing",
            "succeeded" or "failed" => p.Status is "Submitted" or "Processing" or "Unknown",
            "retry" => p.Status == "Failed" && !c.OnHold,
            _ => false
        };
        Require(valid, "Invalid payment transition; Unknown must be reconciled before retry.");
        if (input.Action is "succeeded" or "failed")
        {
            Require(!string.IsNullOrWhiteSpace(input.Reference), "A bank statement / evidence reference is required.");
            Require(input.AmountMinor == p.AmountMinor && input.Currency == p.Currency, "Reconciliation amount or currency mismatch.");
            p.ResultReference = input.Reference;
        }
        if (next == "Succeeded")
        {
            var campaign = await campaigns.GetAsync(c.CampaignId);
            campaign.Pay(p.AmountMinor);
            await campaigns.UpdateAsync(campaign);
            await Log(campaign.Id, "BudgetPaid", c.Reference, p.AmountMinor);
        }
        await UpdateAttemptAsync(p, input, next);
        p.Status = next;
        c.PaymentStatus = next;
        await payments.UpdateAsync(p);
        await claims.UpdateAsync(c);
        await Log(id, "Payment:" + next, input.Reason, p.AmountMinor);
        await Log(c.Id, "Payment:" + next, input.Reason, p.AmountMinor);
        await Notify(c, "Payment update " + c.Reference);
        return PaymentDto(p);
    }
    [DisableAuditing]
    public async Task<FileResultDto> ExportPaymentAsync(Guid id)
    {
        await Permit(CashbackPermissions.Payments.Authorize);
        await Permit(CashbackPermissions.Claims.ViewSensitive);
        var p = await payments.GetAsync(id);
        var bank = Decode<BankInput>(encryption.Decrypt(p.BeneficiaryCiphertext)!);
        static string Csv(string s) => "\"" + (s.Length > 0 && "=+-@".Contains(s[0]) ? "'" : "") + s.Replace("\"", "\"\"") + "\"";
        var content = Encoding.UTF8.GetBytes("PaymentId,BatchId,ClaimId,AccountHolder,BankCountry,IBAN,AccountNumber,SortCode,BIC,AmountMinor,Currency\r\n" + string.Join(",", new[] { p.Id.ToString(), p.BatchId.ToString(), p.ClaimId.ToString(), bank.AccountHolder, bank.BankCountry, bank.Iban, bank.AccountNumber, bank.SortCode, bank.Bic, p.AmountMinor.ToString(), p.Currency }.Select(Csv)) + "\r\n");
        p.ExportSha256 = Convert.ToHexString(SHA256.HashData(content));
        await payments.UpdateAsync(p);
        await Log(id, "SensitivePaymentExport", "Immutable instruction exported; does not mark paid");
        return new()
        {
            FileName = $"payment-{id}.csv",
            ContentType = "text/csv",
            Content = content
        };
    }
    private static EventDto EventDto(OperationEvent e) => new() { Id = e.Id, TargetId = e.TargetId, Action = e.Action, Reason = e.Reason, Actor = e.Actor, AmountMinor = e.AmountMinor, CreatedAt = e.CreationTime };
    public async Task<List<EventDto>> GetAuditAsync()
    {
        await Permit(CashbackPermissions.Audit.Default);
        return (await events.GetListAsync()).OrderByDescending(x => x.CreationTime).Select(EventDto).ToList();
    }
    [DisableAuditing, UnitOfWork(isTransactional: true)]
    public async Task<ClaimDto> ChangeBankAsync(Guid id, BankChangeInput input)
    {
        var c = await claims.GetAsync(id);
        await Owner(c);
        Require(c.PaymentStatus == "None" && c.ReviewStatus is not ("Cancelled" or "Rejected"), "Bank changes are blocked after payment authorization or closure.");
        Require(!string.IsNullOrWhiteSpace(input.Reason) && !string.IsNullOrWhiteSpace(input.Bank.AccountHolder) && (!string.IsNullOrWhiteSpace(input.Bank.Iban) || !string.IsNullOrWhiteSpace(input.Bank.AccountNumber)), "Reason and complete bank details are required.");
        if (c.ReviewStatus == "Approved")
        {
            var campaign = await campaigns.GetAsync(c.CampaignId);
            campaign.Release(c.AmountMinor, true);
            campaign.Reserve(c.AmountMinor);
            await campaigns.UpdateAsync(campaign);
            await Log(campaign.Id, "ApprovalReturnedToReserve", "Bank details changed", c.AmountMinor);
        }
        await revisions.InsertAsync(new ClaimRevision(GuidGenerator.Create(), c, input.Reason));
        if (string.IsNullOrWhiteSpace(input.Bank.BankCountry))
            input.Bank.BankCountry = Decode<ClaimInput>(c.DataJson).BankCountry;
        var claimData = Decode<ClaimInput>(c.DataJson);
        claimData.BankCountry = input.Bank.BankCountry;
        c.DataJson = Encode(claimData);
        c.BankCiphertext = encryption.Encrypt(Encode(input.Bank))!;
        if (c.ReviewStatus != "Draft")
        {
            c.ReviewStatus = "Submitted";
            await Log(id, "Submitted", "Bank changed; all review checks must be repeated");
        }
        await claims.UpdateAsync(c);
        await Log(id, "BankChanged", input.Reason);
        await Notify(c, "Bank details changed " + c.Reference);
        return await ClaimDto(c);
    }
    public async Task<List<NotificationDto>> GetNotificationsAsync()
    {
        await Permit(CashbackPermissions.Claims.Review);
        return (await notifications.GetListAsync()).OrderByDescending(x => x.CreationTime).Select(x => new NotificationDto { Id = x.Id, RecipientMasked = x.RecipientMasked, Subject = x.Subject, Status = x.Status, Attempts = x.Attempts, ProcessedAt = x.ProcessedAt, ClaimId = x.ClaimId, TemplateVersion = x.TemplateVersion }).ToList();
    }
    public async Task SimulateNotificationAsync(Guid id)
    {
        await Permit(CashbackPermissions.Claims.Review);
        var n = await notifications.GetAsync(id);
        n.MarkSimulated(Clock.Now);
        await notifications.UpdateAsync(n);
        await Log(id, "NotificationSimulated", "Development preview only; no email delivered");
    }
}
