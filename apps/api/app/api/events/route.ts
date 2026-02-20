import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@memolist/db";

/**
 * POST /api/events
 * Track anonymous/user events for funnel analysis
 *
 * Body:
 * {
 *   sessionId: string,
 *   type: string,          // "PAGE_VISITED", "REGISTRATION_STARTED", etc
 *   category: string,      // "AUTH", "CLEANUP", "EMAIL", "SYSTEM"
 *   action?: string,       // Specific action
 *   metadata?: object      // Additional data
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, type, category, action, metadata } = await req.json();

    // Validation
    if (!sessionId || !type || !category) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, type, category" },
        { status: 400 }
      );
    }

    // Get userId from auth cookie if exists
    const token = req.cookies.get("has_token")?.value;
    let userId: string | null = null;

    if (token) {
      // Try to get user from Authorization header or session
      // For now, we'll set to null and let frontend send userId if needed
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        // Token exists but we won't decode here - just mark that user is authenticated
        // The event will be associated later when user is identified
      }
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        sessionId,
        type,
        category,
        action: action || null,
        status: "success",
        metadata: metadata || {},
        userId: userId || undefined, // undefined = don't set foreign key
      },
    });

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201 });
  } catch (error: any) {
    console.error("[API] Event creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create event", message: error.message },
      { status: 500 }
    );
  }
}
