using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Checkify.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attendance_sessions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    class_session_id = table.Column<int>(type: "int", nullable: false),
                    staff_id = table.Column<int>(type: "int", nullable: false),
                    department_id = table.Column<int>(type: "int", nullable: false),
                    year = table.Column<int>(type: "int", nullable: false),
                    semester = table.Column<int>(type: "int", nullable: false),
                    section = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    session_date = table.Column<DateTime>(type: "date", nullable: false),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    started_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    closed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    otp_hash = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    otp_expires_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    otp_attempt_count = table.Column<int>(type: "int", nullable: false),
                    otp_locked_until = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    qr_token_hash = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    qr_expires_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_class_sessions_class_session_id",
                        column: x => x.class_session_id,
                        principalTable: "class_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "department_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_staff_staff_id",
                        column: x => x.staff_id,
                        principalTable: "staff",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_records",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    attendance_session_id = table.Column<int>(type: "int", nullable: false),
                    student_id = table.Column<int>(type: "int", nullable: false),
                    marked_by_user_id = table.Column<int>(type: "int", nullable: true),
                    marked_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    method = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    remarks = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_attendance_records_attendance_sessions_attendance_session_id",
                        column: x => x.attendance_session_id,
                        principalTable: "attendance_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_attendance_records_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_attendance_records_users_marked_by_user_id",
                        column: x => x.marked_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_records_marked_by_user_id",
                table: "attendance_records",
                column: "marked_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_records_session_student",
                table: "attendance_records",
                columns: new[] { "attendance_session_id", "student_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_records_student_date",
                table: "attendance_records",
                columns: new[] { "student_id", "marked_at" });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_class_date",
                table: "attendance_sessions",
                columns: new[] { "class_session_id", "session_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_cohort",
                table: "attendance_sessions",
                columns: new[] { "department_id", "year", "semester", "section" });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_staff_date",
                table: "attendance_sessions",
                columns: new[] { "staff_id", "session_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_records");

            migrationBuilder.DropTable(
                name: "attendance_sessions");
        }
    }
}
