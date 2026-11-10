using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Checkify.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentNameUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_departments_name",
                table: "departments",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_departments_name",
                table: "departments");
        }
    }
}
