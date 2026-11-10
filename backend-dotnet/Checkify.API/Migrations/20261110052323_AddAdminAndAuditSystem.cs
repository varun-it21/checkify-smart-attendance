using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Checkify.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminAndAuditSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    action = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    entity_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    details = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false),
                    ip_address = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true),
                    timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_audit_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "system_settings",
                columns: table => new
                {
                    setting_key = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    setting_value = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false),
                    category = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_by_user_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_settings", x => x.setting_key);
                    table.ForeignKey(
                        name: "FK_system_settings_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_action_timestamp",
                table: "audit_logs",
                columns: new[] { "action", "timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_entity_timestamp",
                table: "audit_logs",
                columns: new[] { "entity_name", "timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_user_timestamp",
                table: "audit_logs",
                columns: new[] { "user_id", "timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_system_settings_category",
                table: "system_settings",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "IX_system_settings_updated_by_user_id",
                table: "system_settings",
                column: "updated_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "system_settings");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "users");
        }
    }
}
