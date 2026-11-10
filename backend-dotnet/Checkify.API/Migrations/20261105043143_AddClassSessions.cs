using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Checkify.API.Migrations
{
    /// <inheritdoc />
    public partial class AddClassSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "class_sessions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    department_id = table.Column<int>(type: "int", nullable: false),
                    subject_code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    subject_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false),
                    year = table.Column<int>(type: "int", nullable: false),
                    semester = table.Column<int>(type: "int", nullable: false),
                    section = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    staff_id = table.Column<int>(type: "int", nullable: false),
                    day_of_week = table.Column<int>(type: "int", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time", nullable: false),
                    room_location = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    created_by_user_id = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_class_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_class_sessions_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "department_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_class_sessions_staff_staff_id",
                        column: x => x.staff_id,
                        principalTable: "staff",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_class_sessions_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_class_sessions_created_by_user_id",
                table: "class_sessions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_class_sessions_staff_day",
                table: "class_sessions",
                columns: new[] { "staff_id", "day_of_week" });

            migrationBuilder.CreateIndex(
                name: "IX_class_sessions_student_timetable",
                table: "class_sessions",
                columns: new[] { "department_id", "year", "section", "day_of_week" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "class_sessions");
        }
    }
}
