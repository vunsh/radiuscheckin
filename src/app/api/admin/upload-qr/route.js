import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { getStudentData, getQRCodes } from "@/lib/sheets"
import { driveClient } from "@/lib/drive"
import { parseQRCodePDF } from "@/lib/pdf/parser"

export async function POST(request) {
  try {
    const session = await auth()
    
    if (!session?.user?.email || !isApprovedUser(session.user.email)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfData = await parseQRCodePDF(buffer)
    
    if (!pdfData.studentName) {
      return NextResponse.json(
        { error: "Could not extract student name from PDF" },
        { status: 400 }
      )
    }

    const studentData = await getStudentData()
    if (!studentData || studentData.length === 0) {
      return NextResponse.json(
        { error: "No student data available" },
        { status: 500 }
      )
    }

    const headers = studentData[0] || []
    const firstNameIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "first name")
    const lastNameIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "last name")
    const qrCodeIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "qr code")
    
    if (firstNameIndex === -1 || lastNameIndex === -1 || qrCodeIndex === -1) {
      return NextResponse.json(
        { error: "Required columns not found in student data" },
        { status: 500 }
      )
    }

    let matchedStudent = null
    let rowIndex = -1
    
    for (let i = 1; i < studentData.length; i++) {
      const row = studentData[i]
      if (!row) continue
      
      const firstName = row[firstNameIndex] || ''
      const lastName = row[lastNameIndex] || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      if (fullName.toLowerCase() === pdfData.studentName.toLowerCase()) {
        const studentIdIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "student id")
        const studentId = studentIdIndex !== -1 ? row[studentIdIndex] : ''
        
        matchedStudent = {
          firstName,
          lastName,
          fullName,
          studentId,
          currentQRCode: row[qrCodeIndex] || '',
          rowIndex: i
        }
        rowIndex = i
        break
      }
    }

    if (!matchedStudent) {
      return NextResponse.json(
        { error: `No student found matching "${pdfData.studentName}"` },
        { status: 404 }
      )
    }

    const qrCodeData = await getQRCodes()
    const existingQREntry = qrCodeData.find(row => row[0] === matchedStudent.studentId)

    return NextResponse.json({
      success: true,
      studentInfo: matchedStudent,
      pdfData,
      hasExistingQR: !!existingQREntry,
      existingQRUrl: existingQREntry ? existingQREntry[1] : null
    })

  } catch (error) {
    console.error("Error processing QR upload:", error)
    return NextResponse.json(
      { error: "Failed to process QR code upload" },
      { status: 500 }
    )
  }
}
