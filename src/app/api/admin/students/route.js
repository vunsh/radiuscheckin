import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { getStudentData } from "@/lib/sheets"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.email || !isApprovedUser(session.user.email)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const students = await getStudentData()
    
    return NextResponse.json({
      students,
      count: students.length
    })
  } catch (error) {
    console.error("Error fetching student data:", error)
    return NextResponse.json(
      { error: "Failed to fetch student data" },
      { status: 500 }
    )
  }
}
