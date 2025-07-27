import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { getStudentData, updateStudentData } from "@/lib/sheets"
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

    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { error: "Authentication expired. Please sign out and sign in again." },
        { status: 401 }
      )
    }

    if (!session.accessToken) {
      return NextResponse.json(
        { error: "No Google Drive access token available. Please sign out and sign in again." },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const studentName = formData.get('studentName')
    const rowIndex = parseInt(formData.get('rowIndex'))
    
    if (!file || !studentName || isNaN(rowIndex)) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimetype = file.type || "image/png" // keep as pngs
    const fileName = file.name || `${studentName.replace(/\s+/g, '_')}_QR_${Date.now()}.png`
    const folderId = process.env.QRCODEFOLDER
    const studentData = await getStudentData()
    const studentMatch = studentData[rowIndex]

    // the google drive client expects a body, mimetype, and filename for the part that is uploaded
    const part = {
      body: buffer,
      mimetype,
      filename: fileName,
    }

    try {
      const driveUrl = await driveClient.uploadFile(
        part, 
        folderId, 
        {
          studentId: studentMatch.studentId,
          fullName: studentMatch.fullName,
        }, 
        session.accessToken,
        session.refreshToken
      );

      const headers = studentData[0] || []
      const qrCodeIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "qr code")
      
      if (qrCodeIndex !== -1) {
        studentData[rowIndex][qrCodeIndex] = driveUrl
        await updateStudentData(studentData)
      }

      return NextResponse.json({
        success: true,
        driveUrl,
        message: `QR code image successfully uploaded and linked to ${studentName}`
      })
    } catch (driveError) {
      console.error("Drive upload error:", driveError);
      if (driveError.message.includes("Authentication failed")) {
        return NextResponse.json(
          { error: "Authentication failed. Please sign out and sign in again." },
          { status: 401 }
        )
      }
      throw driveError;
    }

  } catch (error) {
    console.error("Error confirming QR upload:", error)
    return NextResponse.json(
      { error: "Failed to confirm QR code upload" },
      { status: 500 }
    )
  }
}
