using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;

namespace Gigabyte.Cashback.Operations;

public static class CampaignConfigurationValidation
{
    public static IReadOnlyList<string> SupportedMarkets { get; } = Array.AsReadOnly(new[] { "DE", "FR", "IT", "ES", "NL" });
    public const int MaximumRows = 5000;
    public const long MaximumMinor = 1_000_000_000_000;

    public static ConfigurationValidationDto Validate(CampaignInput input, bool complete = true)
    {
        var result = new ConfigurationValidationDto();
        void Error(string path, string message) => result.Errors.Add(new() { Path = path, Message = message });
        void Warn(string path, string message) => result.Warnings.Add(new() { Path = path, Message = message });
        if (input == null) { Error("data", "Campaign settings are required."); return result; }
        foreach (var property in typeof(CampaignInput).GetProperties().Where(p => p.PropertyType == typeof(string) && p.Name != nameof(CampaignInput.ConcurrencyStamp)))
        {
            var value = property.GetValue(input) as string;
            var limit = property.Name is "Terms" or "Privacy" or "Faq" or "Description" ? 200000 : 2048;
            if (value == null || value.Length > limit) Error(char.ToLowerInvariant(property.Name[0]) + property.Name[1..], $"Must be text of at most {limit} characters.");
        }
        if (input.Products == null || input.Retailers == null || input.Markets == null || input.Languages == null || input.LegacyFields == null)
        { Error("data", "Products, retailers, markets, languages and legacyFields must not be null."); return result; }
        if (result.Errors.Count > 0) return result;
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 200) Error("name", "Campaign name is required (maximum 200 characters).");
        if (input.Type != "Cashback") Error("type", "Only fixed-product Cashback campaigns are supported.");
        if (input.Status is not ("Draft" or "Active" or "Confirmed" or "Paused" or "Archived")) Error("status", "Unsupported campaign status.");
        if (input.Markets.Count is < 1 or > 5 || input.Markets.Any(x => !SupportedMarkets.Contains(x)) || input.Markets.Distinct().Count() != input.Markets.Count)
            Error("markets", "Select unique countries from DE, FR, IT, ES and NL.");
        if (!input.Markets.Contains(input.Market)) Error("market", "Default country must belong to the campaign markets.");
        if (input.Currency != "EUR") Error("currency", "The five supported markets use EUR.");
        if (input.Languages.Count is < 1 or > 20 || input.Languages.Any(x => x == null || !Regex.IsMatch(x, "^[a-z]{2}(-[A-Z]{2})?$")) || input.Languages.Distinct(StringComparer.OrdinalIgnoreCase).Count() != input.Languages.Count)
            Error("languages", "Provide unique language codes such as en, de, fr, it, es or nl.");
        try { TimeZoneInfo.FindSystemTimeZoneById(input.TimeZone); } catch { Error("timeZone", "Unknown time zone."); }
        if (input.BudgetMinor is <= 0 or > MaximumMinor || input.BufferMinor < 0 || input.BufferMinor > input.BudgetMinor) Error("budgetMinor", "Budget must be positive, within the supported range and cover its buffer.");
        if (input.WaitingDays is < 0 or > 3650) Error("waitingDays", "Waiting days must be between 0 and 3650.");
        if (input.MaxClaimsPerPerson <= 0 || input.MaxItemsPerCategory <= 0 || input.MaxClaimsPerHousehold <= 0 || input.ClaimLimit <= 0)
            Error("limits", "Claim, household, person and category limits must be positive integers.");
        if (input.Products.Count > MaximumRows) Error("products", $"Maximum {MaximumRows} products.");
        if (input.Retailers.Count > MaximumRows) Error("retailers", $"Maximum {MaximumRows} retailers.");
        ValidateIds(input.Products.Select(x => x?.Id), "products", Error, complete);
        ValidateIds(input.Retailers.Select(x => x?.Id), "retailers", Error, complete);
        for (var i = 0; i < Math.Min(input.Products.Count, MaximumRows); i++)
        {
            var p = input.Products[i];
            if (p == null) { Error($"products[{i}]", "Product row cannot be null."); continue; }
            if (p.CashbackMinor < 0 || p.CashbackMinor > MaximumMinor || (complete && p.CashbackMinor == 0)) Error($"products[{i}].cashbackMinor", "Cashback must be a positive whole number of cents within the supported range.");
            if (p.QuantityLimit <= 0) Error($"products[{i}].quantityLimit", "Quantity limit must be positive.");
            if (!ValidText(p.Category, 128) || !ValidText(p.Model, 256) || !ValidText(p.Series, 256) || !ValidText(p.Ean, 128)) Error($"products[{i}]", "Product metadata contains invalid or oversized text.");
            if (complete && (string.IsNullOrWhiteSpace(p.Model) || string.IsNullOrWhiteSpace(p.Category))) Error($"products[{i}]", "Product model and category are required.");
        }
        for (var i = 0; i < Math.Min(input.Retailers.Count, MaximumRows); i++)
        {
            var r = input.Retailers[i];
            if (r == null) { Error($"retailers[{i}]", "Retailer row cannot be null."); continue; }
            if (!SupportedMarkets.Contains(r.Country)) Error($"retailers[{i}].country", "Retailer country is not supported.");
            else if (!input.Markets.Contains(r.Country)) Error($"retailers[{i}].country", "Retailer country must be enabled in this campaign's markets.");
            if (!ValidText(r.Name, 256) || (complete && string.IsNullOrWhiteSpace(r.Name))) Error($"retailers[{i}].name", "Retailer name is required (maximum 256 characters).");
            if (!SafeUrl(r.Url)) Error($"retailers[{i}].url", "Use an absolute http(s) URL or leave blank.");
            if (r.ValidFrom > r.ValidTo) Error($"retailers[{i}].validTo", "Retailer validity end precedes its start.");
        }
        if (!SafeUrl(input.BannerUrl, true)) Error("bannerUrl", "Use an http(s) URL or a site-relative image path.");
        if (input.LegacyFields.Count > 200 || input.LegacyFields.Any(x => !ValidText(x.Key, 128) || !ValidText(x.Value, 200000))) Error("legacyFields", "Legacy settings exceed supported size or contain null text.");
        if (input.LegacyFields.TryGetValue("maxClaimsPerHousehold", out var household) && (!int.TryParse(household, NumberStyles.Integer, CultureInfo.InvariantCulture, out var householdLimit) || householdLimit <= 0)) Error("legacyFields.maxClaimsPerHousehold", "Household limit must be a positive integer.");
        if (complete)
        {
            if (input.PurchaseStart == default || input.ClaimStart == default || input.PurchaseStart > input.PurchaseEnd || input.ClaimStart > input.ClaimEnd || input.ClaimEnd < input.PurchaseEnd) Error("dates", "Provide valid purchase and claim periods; claim end must cover purchase end.");
            if (input.Products.Count == 0) Error("products", "At least one eligible product is required.");
            if (input.Retailers.Count == 0) Error("retailers", "At least one participating retailer is required.");
            if (string.IsNullOrWhiteSpace(input.Terms) || string.IsNullOrWhiteSpace(input.Privacy) || string.IsNullOrWhiteSpace(input.TermsVersion)) Error("terms", "Terms, privacy and terms version are required.");
            foreach (var field in new[] { ("slug", input.Slug), ("description", input.Description), ("bannerUrl", input.BannerUrl), ("supportEmail", input.SupportEmail), ("faq", input.Faq) })
                if (string.IsNullOrWhiteSpace(field.Item2)) Warn(field.Item1, "Recommended content has not been configured.");
        }
        if (input.LegacyFields.ContainsKey("maxClaimsPerHousehold") || input.LegacyFields.ContainsKey("exclusivityGroup")) Warn("legacyFields", "Legacy household/exclusivity overrides will be normalized into their top-level fields.");
        return result;
    }

    public static void NormalizeLegacyOverrides(CampaignInput input)
    {
        if (input.LegacyFields.Remove("maxClaimsPerHousehold", out var household)) input.MaxClaimsPerHousehold = int.Parse(household, CultureInfo.InvariantCulture);
        if (input.LegacyFields.Remove("exclusivityGroup", out var group)) input.ExclusivityGroup = group;
    }

    public static bool ValidText(string? value, int max) => value != null && value.Length <= max;
    public static bool SafeUrl(string? value, bool relative = false) => value != null && value.Length <= 2048 &&
        (value.Length == 0 || (relative && value.StartsWith('/') && !value.StartsWith("//") && !value.Contains('\\') && !value.Any(char.IsControl)) ||
         (Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http" && string.IsNullOrEmpty(uri.UserInfo)));

    public static void ValidateIds(IEnumerable<string?> values, string path, Action<string, string> error, bool required = true)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var i = 0;
        foreach (var id in values)
        {
            if (!required && id == "") { i++; continue; }
            if (string.IsNullOrWhiteSpace(id) || id.Length > 128 || id != id.Trim()) error($"{path}[{i}].id", "ID is required, without surrounding spaces (maximum 128 characters).");
            else if (!seen.Add(id)) error($"{path}[{i}].id", "Duplicate ID (case insensitive).");
            i++;
        }
    }
}
