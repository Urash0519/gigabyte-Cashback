using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Volo.Abp.Auditing;

namespace Gigabyte.Cashback.Operations;

[DisableAuditing]
public sealed class EmailVerificationInput
{
    [Required, StringLength(254)]
    public string Email { get; set; } = "";
}

public sealed class EmailVerificationDto
{
    public string Email { get; set; } = "";
    // Null distinguishes local mock mode from an actual successful membership lookup.
    public bool? IsMember { get; set; }
}

public sealed class AorusMemberReferenceDto
{
    public string Email { get; set; } = "";
    public bool? IsMember { get; set; }
    public string? Name { get; set; }
    public DateTime? CheckedAt { get; set; }
}

public partial interface IOperationsAppService
{
    Task<EmailVerificationDto> VerifyClaimEmailAsync(Guid id, EmailVerificationInput input);
    Task<AorusMemberReferenceDto> GetAorusMemberReferenceAsync(Guid id);
}
