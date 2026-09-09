using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gigabyte.Cashback.Migrations
{
    /// <inheritdoc />
    public partial class PaymentReconciliationAndNotificationHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClaimId",
                table: "AppNotificationOutbox",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TemplateVersion",
                table: "AppNotificationOutbox",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "1");

            migrationBuilder.CreateTable(
                name: "AppPaymentAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Reference = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Reason = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    ExtraProperties = table.Column<string>(type: "text", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppPaymentAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppPaymentAttempts_AppPayments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "AppPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppReconciliationEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExternalPaymentId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Reference = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    AmountMinor = table.Column<long>(type: "bigint", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Result = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    MatchStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Reason = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    ExtraProperties = table.Column<string>(type: "text", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppReconciliationEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppReconciliationEntries_AppPayments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "AppPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppNotificationOutbox_ClaimId",
                table: "AppNotificationOutbox",
                column: "ClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_AppPaymentAttempts_PaymentId_Number",
                table: "AppPaymentAttempts",
                columns: new[] { "PaymentId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppReconciliationEntries_ExternalPaymentId",
                table: "AppReconciliationEntries",
                column: "ExternalPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_AppReconciliationEntries_MatchStatus_CreationTime",
                table: "AppReconciliationEntries",
                columns: new[] { "MatchStatus", "CreationTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AppReconciliationEntries_PaymentId",
                table: "AppReconciliationEntries",
                column: "PaymentId");

            migrationBuilder.AddForeignKey(
                name: "FK_AppNotificationOutbox_AppClaims_ClaimId",
                table: "AppNotificationOutbox",
                column: "ClaimId",
                principalTable: "AppClaims",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppNotificationOutbox_AppClaims_ClaimId",
                table: "AppNotificationOutbox");

            migrationBuilder.DropTable(
                name: "AppPaymentAttempts");

            migrationBuilder.DropTable(
                name: "AppReconciliationEntries");

            migrationBuilder.DropIndex(
                name: "IX_AppNotificationOutbox_ClaimId",
                table: "AppNotificationOutbox");

            migrationBuilder.DropColumn(
                name: "ClaimId",
                table: "AppNotificationOutbox");

            migrationBuilder.DropColumn(
                name: "TemplateVersion",
                table: "AppNotificationOutbox");
        }
    }
}
