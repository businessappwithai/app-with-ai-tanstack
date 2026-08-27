import { getDatabase, runMigrations } from "@appwithai/core/services";

async function seedAdmin() {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf("--email");

  if (emailIndex === -1 || !args[emailIndex + 1]) {
    console.error("Usage: bun scripts/seed-admin.ts --email user@example.com");
    process.exit(1);
  }

  const email = args[emailIndex + 1];

  try {
    console.log("🚀 Running migrations...");
    await runMigrations();

    console.log(`👤 Promoting user with email: ${email}`);
    const db = getDatabase();

    const user = await db
      .selectFrom("auth_users" as any)
      .selectAll()
      .where("email" as any, "=", email)
      .executeTakeFirst();

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    await db
      .updateTable("auth_users" as any)
      .set({ status: "approved", role: "admin" })
      .where("id" as any, "=", (user as any).id)
      .execute();

    console.log(`✅ Successfully promoted user to admin: ${email}`);
    console.log(`   Status: approved`);
    console.log(`   Role: admin`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error promoting user:", error);
    process.exit(1);
  }
}

seedAdmin();
