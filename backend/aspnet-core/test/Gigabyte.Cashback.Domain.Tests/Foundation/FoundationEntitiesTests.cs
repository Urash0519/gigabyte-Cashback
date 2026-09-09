using System;
using Gigabyte.Cashback.Files;
using Gigabyte.Cashback.Notifications;
using Shouldly;
using Xunit;

namespace Gigabyte.Cashback.Foundation;

public class FoundationEntitiesTests
{
    [Fact]
    public void Notification_outbox_should_track_simulated_delivery()
    {
        var message = new NotificationOutboxMessage(
            Guid.NewGuid(), "Email", "u***@example.test", "Foundation verification");
        var processedAt = DateTime.UtcNow;

        message.MarkSimulated(processedAt);

        message.Status.ShouldBe("Simulated");
        message.Attempts.ShouldBe(1);
        message.ProcessedAt.ShouldBe(processedAt);
    }

    [Fact]
    public void Stored_file_should_reject_an_empty_payload_size()
    {
        Should.Throw<ArgumentOutOfRangeException>(() => new StoredFileRecord(
            Guid.NewGuid(), "foundation/sample.txt", "sample.txt", "text/plain", 0, new string('a', 64)));
    }
}
