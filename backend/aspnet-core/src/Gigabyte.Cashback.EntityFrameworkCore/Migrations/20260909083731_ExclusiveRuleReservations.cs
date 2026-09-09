using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gigabyte.Cashback.Migrations
{
    /// <inheritdoc />
    public partial class ExclusiveRuleReservations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppRuleReservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScopeKey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExtraProperties = table.Column<string>(type: "text", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRuleReservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppRuleReservations_AppClaims_ClaimId",
                        column: x => x.ClaimId,
                        principalTable: "AppClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppRuleReservations_ClaimId",
                table: "AppRuleReservations",
                column: "ClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_AppRuleReservations_ScopeKey",
                table: "AppRuleReservations",
                column: "ScopeKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppRuleReservations");
        }
    }
}
