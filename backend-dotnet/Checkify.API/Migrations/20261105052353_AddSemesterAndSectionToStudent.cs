using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Checkify.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSemesterAndSectionToStudent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "semester",
                table: "students",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "section",
                table: "students",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "A");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "semester",
                table: "students");

            migrationBuilder.DropColumn(
                name: "section",
                table: "students");
        }
    }
}
