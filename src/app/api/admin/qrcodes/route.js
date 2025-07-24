import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { getQRCodes } from "@/lib/sheets"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.email || !isApprovedUser(session.user.email)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const qrCodes = await getQRCodes()
    
    return NextResponse.json({
      qrCodes,
      count: qrCodes.length
    })
  } catch (error) {
    console.error("Error fetching QR code data:", error)
    return NextResponse.json(
      { error: "Failed to fetch QR code data" },
      { status: 500 }
    )
  }
}
