import { NextResponse } from "next/server"
import { sheetsClient } from "@/lib/sheets"

export async function POST(request) {
  try {
    const { qrCodeUrl } = await request.json()
    
    if (!qrCodeUrl) {
      return NextResponse.json(
        { error: "QR code URL is required" },
        { status: 400 }
      )
    }

    const imageData = await sheetsClient.getImageAsBase64(qrCodeUrl)
    
    return NextResponse.json({
      imageData,
      success: true
    })
  } catch (error) {
    console.error("Error fetching QR code image:", error)
    return NextResponse.json(
      { error: "Failed to fetch QR code image", details: error.message },
      { status: 500 }
    )
  }
}
