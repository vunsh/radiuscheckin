// legacy route

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { driveClient } from "@/lib/drive"

export async function POST(request) {
  try {
    const session = await auth()
    
    if (!session?.user?.email || !isApprovedUser(session.user.email)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!session.accessToken) {
      return NextResponse.json(
        { error: "No Google Drive access token available" },
        { status: 401 }
      )
    }

    const { folderId } = await request.json()

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" },
        { status: 400 }
      )
    }

    const expectedFolderId = process.env.QRCODEFOLDER

    if (!expectedFolderId) {
      return NextResponse.json(
        { error: "QR code folder not configured in environment" },
        { status: 500 }
      )
    }

    if (folderId !== expectedFolderId) {
      return NextResponse.json(
        { 
          isValid: false,
          error: "Invalid folder selected. Please select the designated QR codes folder."
        },
        { status: 400 }
      )
    }

    const { canUpload, folderInfo } = await driveClient.canUploadToFolder(folderId, session.accessToken)

    if (!canUpload) {
      return NextResponse.json(
        { 
          isValid: false,
          error: `Cannot upload to folder '${folderInfo?.name || folderId}'. Check your permissions.`
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      isValid: true,
      folder: {
        id: folderId,
        name: folderInfo?.name || 'QR Codes Folder',
        driveId: folderInfo?.driveId
      },
      message: "Folder validated successfully"
    })

  } catch (error) {
    console.error("Error validating folder:", error)
    return NextResponse.json(
      { error: "Failed to validate folder" },
      { status: 500 }
    )
  }
}
