using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Checkify.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentAndStaffEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "staff",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    staff_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false),
                    mobile_number = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    experience = table.Column<decimal>(type: "decimal(4,1)", nullable: false),
                    specialization = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true),
                    gender = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    department_id = table.Column<int>(type: "int", nullable: false),
                    position = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff", x => x.id);
                    table.ForeignKey(
                        name: "FK_staff_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "department_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_staff_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "students",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false),
                    gender = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    dob = table.Column<DateTime>(type: "date", nullable: false),
                    year = table.Column<int>(type: "int", nullable: false),
                    mobile_no = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    relation = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true),
                    relation_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true),
                    relation_mobile_no = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true),
                    relation_address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    department_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_students", x => x.id);
                    table.ForeignKey(
                        name: "FK_students_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "department_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_students_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_staff_department_id",
                table: "staff",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_staff_user_id",
                table: "staff",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_students_department_id",
                table: "students",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "IX_students_user_id",
                table: "students",
                column: "user_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "staff");

            migrationBuilder.DropTable(
                name: "students");
        }
    }
}
