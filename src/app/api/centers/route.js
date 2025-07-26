import { NextResponse } from "next/server"
import { getUniqueCenters } from "@/lib/sheets"

export async function GET() {
  try {
    const centers = await getUniqueCenters()

    return NextResponse.json({
      centers,
      count: centers.length
    })
  } catch (error) {
    console.error("Error fetching centers:", error)
    return NextResponse.json(
      { error: "Failed to fetch centers" },
      { status: 500 }
    )
  }
}
