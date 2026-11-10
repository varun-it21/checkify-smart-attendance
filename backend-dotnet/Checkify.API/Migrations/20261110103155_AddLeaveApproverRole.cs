using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Checkify.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveApproverRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "approver_role",
                table: "leave_requests",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "HOD");

            // Backfill existing rows using the approval chain:
            // HOD -> MANAGER, MANAGER -> ADMIN, everyone else -> HOD (column default).
            migrationBuilder.Sql("UPDATE leave_requests SET approver_role = 'MANAGER' WHERE applicant_role = 'HOD';");
            migrationBuilder.Sql("UPDATE leave_requests SET approver_role = 'ADMIN' WHERE applicant_role = 'MANAGER';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "approver_role",
                table: "leave_requests");
        }
    }
}
