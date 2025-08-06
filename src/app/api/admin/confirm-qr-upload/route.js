import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { getStudentData, getQRCodes, updateQRCodes } from "@/lib/sheets"
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

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and image files are allowed" },
        { status: 400 }
      )
    }

    const studentData = await getStudentData()
    if (!studentData || studentData.length <= rowIndex) {
      return NextResponse.json(
        { error: "Invalid student data or row index" },
        { status: 400 }
      )
    }

    const headers = studentData[0] || []
    const studentIdIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "student id")
    
    if (studentIdIndex === -1) {
      return NextResponse.json(
        { error: "Student ID column not found in student data" },
        { status: 500 }
      )
    }

    const studentRow = studentData[rowIndex]
    const studentId = studentRow[studentIdIndex]
    
    if (!studentId) {
      return NextResponse.json(
        { error: "No student ID found for this student" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimetype = file.type
    const extension = mimetype === 'application/pdf' ? '.pdf' : 
                     mimetype === 'image/png' ? '.png' : '.jpg'
    const fileName = file.name || `${studentName.replace(/\s+/g, '_')}_QR_${Date.now()}${extension}`
    const folderId = process.env.QRCODEFOLDER

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
          studentId: studentId,
          fullName: studentName,
        }, 
        session.accessToken,
        session.refreshToken
      );

      const qrCodeData = await getQRCodes()
      let updatedQRData = [...qrCodeData]
      
      let existingRowIndex = -1
      for (let i = 0; i < qrCodeData.length; i++) {
        if (qrCodeData[i][0] === studentId) {
          existingRowIndex = i
          break
        }
      }

      if (existingRowIndex !== -1) {
        updatedQRData[existingRowIndex][1] = driveUrl
      } else {
        updatedQRData.push([studentId, driveUrl])
      }

      await updateQRCodes(updatedQRData)

      return NextResponse.json({
        success: true,
        driveUrl,
        studentId,
        action: existingRowIndex !== -1 ? 'updated' : 'added',
        message: `QR code ${mimetype === 'application/pdf' ? 'PDF' : 'image'} successfully uploaded and ${existingRowIndex !== -1 ? 'updated' : 'linked'} for ${studentName} (ID: ${studentId})`
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
