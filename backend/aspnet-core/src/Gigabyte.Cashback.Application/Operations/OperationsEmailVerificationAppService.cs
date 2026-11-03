using System;
using System.Net.Mail;
using System.Threading.Tasks;
using Volo.Abp.Auditing;
using Volo.Abp.Threading;
using Gigabyte.Cashback.Permissions;

namespace Gigabyte.Cashback.Operations;

public partial class OperationsAppService
{
    [DisableAuditing]
    public async Task<AorusMemberReferenceDto> GetAorusMemberReferenceAsync(Guid id)
    {
        await Permit(CashbackPermissions.Claims.Review);
        var claim = await claims.GetAsync(id);
        var email = Decode<ClaimInput>(claim.DataJson).Email;
        Require(MailAddress.TryCreate(email, out var address) && address.Address == email, "No valid email is available for AORUS lookup.");
        if (!aorusMembers.IsEnabled) return new() { Email = email };
        var member = await aorusMembers.LookupAsync(email, LazyServiceProvider.LazyGetRequiredService<ICancellationTokenProvider>().Token);
        return new()
        {
            Email = email,
            IsMember = member.IsMember,
            Name = member.IsMember == true ? member.Name : null,
            CheckedAt = Clock.Now.ToUniversalTime()
        };
    }

    [DisableAuditing]
    public async Task<EmailVerificationDto> VerifyClaimEmailAsync(Guid id, EmailVerificationInput input)
    {
        var claim = await claims.GetAsync(id);
        Require(claim.OwnerId == UserId(), "Only the applicant can check this email.");
        Require(claim.ReviewStatus is "Draft" or "MoreInfoRequired", "Email can only be checked for an editable claim.");
        var email = (input.Email ?? "").Trim();
        Require(MailAddress.TryCreate(email, out var address) && address.Address == email, "Enter a valid email address.");
        return new EmailVerificationDto
        {
            Email = email,
            IsMember = aorusMembers.IsEnabled
                ? await aorusMembers.ExistsAsync(email, LazyServiceProvider.LazyGetRequiredService<ICancellationTokenProvider>().Token)
                : null
        };
    }
}
