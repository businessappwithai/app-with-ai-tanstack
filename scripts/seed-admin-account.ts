import { getDatabase, runMigrations } from "@erdwithai/core/services";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt-key");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function seedAdminAccount() {
  try {
    console.log("🚀 Running migrations...");
    await runMigrations();

    const db = getDatabase();
    const email = "admin@admin.com";
    const password = "administrator";

    console.log("📝 Creating admin account...");

    // Check if user already exists
    const existingUser = await db
      .selectFrom("auth_users" as any)
      .selectAll()
      .where("email" as any, "=", email)
      .executeTakeFirst();

    if (existingUser) {
      console.log(`⚠️  User already exists: ${email}`);
      console.log("   Updating to admin status...");

      await db
        .updateTable("auth_users" as any)
        .set({ status: "approved", role: "admin" })
        .where("id" as any, "=", (existingUser as any).id)
        .execute();

      console.log(`✅ Admin account ready!`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: admin`);
      console.log(`   Status: approved`);
      process.exit(0);
    }

    // Create new admin user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password) as any;

    // Insert user with password
    await db
      .insertInto("auth_users" as any)
      .values({
        id: userId,
        email,
        name: "Administrator",
        passwordHash,
        emailVerified: true,
        status: "approved",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      } as any)
      .execute();

    console.log(`✅ Admin account created successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log(`   Status: approved`);
    console.log(``);
    console.log(`🔐 You can now log in at: http://localhost:3001/login`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin account:", error);
    process.exit(1);
  }
}

seedAdminAccount();
