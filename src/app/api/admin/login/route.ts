import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ isAdmin: false, error: "Admin credentials not configured" }, { status: 500 });
    }

    if (
      email &&
      password &&
      email.toLowerCase().trim() === adminEmail.toLowerCase().trim() &&
      password === adminPassword
    ) {
      return NextResponse.json({
        isAdmin: true,
        user: {
          uid: "admin_master_root",
          email: adminEmail,
          displayName: "System Administrator",
          role: "admin",
          status: "approved",
          features: {
            enableTony: true,
            enableTonyVoice: true,
            enableTonyChat: true,
            enableGemini: true,
            enableGroq: true,
            maxProjects: 999
          }
        }
      });
    }

    return NextResponse.json({ isAdmin: false }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to verify admin" }, { status: 500 });
  }
}