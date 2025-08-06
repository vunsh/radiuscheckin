import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { r2Client } from "@/lib/r2"

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.email || !isApprovedUser(session.user.email)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const result = await r2Client.clearBucket()
    
    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      message: `Cleared ${result.deleted} files from R2 storage`
    })

  } catch (error) {
    console.error("Error clearing R2 storage:", error)
    return NextResponse.json(
      { error: "Failed to clear R2 storage" },
      { status: 500 }
    )
  }
}
