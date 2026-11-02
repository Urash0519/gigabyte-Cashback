using System;
using System.Net.Mail;
using System.Threading.Tasks;
using Volo.Abp.Auditing;
using Volo.Abp.Threading;

namespace Gigabyte.Cashback.Operations;

public partial class OperationsAppService
{
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
