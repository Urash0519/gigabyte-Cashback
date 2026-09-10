using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gigabyte.Cashback.Migrations
{
    /// <inheritdoc />
    public partial class CampaignConfigurationCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppCampaignCatalogEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    NormalizedKey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    DataJson = table.Column<string>(type: "text", nullable: false),
                    ExtraProperties = table.Column<string>(type: "text", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppCampaignCatalogEntries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppCampaignCatalogEntries_Kind_NormalizedKey",
                table: "AppCampaignCatalogEntries",
                columns: new[] { "Kind", "NormalizedKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppCampaignCatalogEntries");
        }
    }
}
