using System;
using Gigabyte.Cashback.Operations;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Gigabyte.Cashback.Operations.Tests;

public class CampaignBudgetTests
{
    [Fact]
    public void Reserve_approve_and_pay_should_conserve_committed_budget()
    {
        var campaign = new Campaign(Guid.NewGuid()) { BudgetMinor = 1000, BufferMinor = 100 };
        campaign.Reserve(600);
        campaign.Approve(600);
        campaign.Pay(600);
        campaign.ReservedMinor.ShouldBe(0);
        campaign.ApprovedMinor.ShouldBe(0);
        campaign.PaidMinor.ShouldBe(600);
        campaign.Reserve(300);
        Should.Throw<BusinessException>(() => campaign.Reserve(1)).Code.ShouldBe("Cashback:BudgetExceeded");
        campaign.ReservedMinor.ShouldBe(300);
    }

    [Fact]
    public void Releasing_reserved_and_approved_amounts_should_restore_available_budget()
    {
        var campaign = new Campaign(Guid.NewGuid()) { BudgetMinor = 1000 };
        campaign.Reserve(1000);
        campaign.Approve(400);
        campaign.Release(600, false);
        campaign.Release(400, true);
        campaign.Reserve(1000);
        campaign.ReservedMinor.ShouldBe(1000);
        campaign.ApprovedMinor.ShouldBe(0);
    }

    [Fact]
    public void Invalid_transitions_should_leave_balances_unchanged()
    {
        var campaign = new Campaign(Guid.NewGuid()) { BudgetMinor = 1000 };
        campaign.Reserve(100);
        Should.Throw<BusinessException>(() => campaign.Approve(101));
        Should.Throw<BusinessException>(() => campaign.Pay(1));
        Should.Throw<BusinessException>(() => campaign.Release(101, false));
        Should.Throw<BusinessException>(() => campaign.Release(1, true));
        Should.Throw<BusinessException>(() => campaign.Reserve(-1));
        Should.Throw<BusinessException>(() => campaign.Approve(0));
        campaign.ReservedMinor.ShouldBe(100);
        campaign.ApprovedMinor.ShouldBe(0);
        campaign.PaidMinor.ShouldBe(0);
    }
}
