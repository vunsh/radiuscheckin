import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { r2Client } from "@/lib/r2"

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isApprovedUser(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId, contentType } = await request.json()
    if (!fileId || !contentType) {
      return NextResponse.json({ error: "fileId and contentType are required" }, { status: 400 })
    }

    if (contentType !== 'application/pdf') {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    const { url } = await r2Client.presignPut(fileId, contentType, 60 * 30) // 30 min expiry

    return NextResponse.json({ url, fileId })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 })
  }
}
