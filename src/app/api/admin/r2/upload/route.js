import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { r2Client } from "@/lib/r2"

export async function POST(request) {
  try {
    const session = await auth()
    
    if (!session?.user?.email || !isApprovedUser(session.user.email)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!session?.accessToken || session?.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { error: "Google Drive authentication expired. Please sign out and sign in again." },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const fileId = formData.get('fileId')
    
    if (!file || !fileId) {
      return NextResponse.json(
        { error: "File and fileId are required" },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      )
    }

    // Check file size (limit to prevent exceeding 10GB total)
    const maxSize = 1024 * 1024 * 1024 * 5 // 5GB max per file
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5GB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const result = await r2Client.uploadFile(buffer, fileId, file.type)
    
    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      size: file.size,
      userEmail: session.user.email,
      hasValidTokens: !!(session.accessToken && !session.error),
      message: "File uploaded successfully to R2 storage"
    })

  } catch (error) {
    console.error("Error uploading to R2:", error)
    return NextResponse.json(
      { error: "Failed to upload to R2 storage" },
      { status: 500 }
    )
  }
}
