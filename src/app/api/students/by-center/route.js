import { NextResponse } from "next/server"
import { getStudentData } from "@/lib/sheets"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const center = searchParams.get('center')

    if (!center) {
      return NextResponse.json(
        { error: "Center parameter is required" },
        { status: 400 }
      )
    }

    const studentData = await getStudentData()
    
    if (!studentData || studentData.length === 0) {
      return NextResponse.json({
        students: [],
        count: 0
      })
    }

    const headers = studentData[0] || []
    const firstNameIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "first name")
    const lastNameIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "last name")
    const studentIdIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "student id")
    const centerIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "center")
    const lastAttendanceIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "last attendance date")
    const qrCodeIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "qr code")

    if (centerIndex === -1) {
      return NextResponse.json(
        { error: "Center column not found in student data" },
        { status: 500 }
      )
    }

    const students = []
    for (let i = 1; i < studentData.length; i++) {
      const row = studentData[i]
      if (!row || row.length <= centerIndex) continue

      const studentCenter = row[centerIndex]
      if (studentCenter && studentCenter.trim() === center.trim()) {
        students.push({
          firstName: firstNameIndex !== -1 ? (row[firstNameIndex] || '') : '',
          lastName: lastNameIndex !== -1 ? (row[lastNameIndex] || '') : '',
          studentId: studentIdIndex !== -1 ? (row[studentIdIndex] || '') : '',
          center: studentCenter.trim(),
          lastAttendance: lastAttendanceIndex !== -1 ? (row[lastAttendanceIndex] || '') : '',
          qrCode: qrCodeIndex !== -1 ? (row[qrCodeIndex] || '') : ''
        })
      }
    }

    return NextResponse.json({
      students,
      count: students.length,
      center
    })
  } catch (error) {
    console.error("Error fetching students by center:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}
