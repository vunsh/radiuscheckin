import { NextResponse } from "next/server"
import { sheetsClient, getQRCodes } from "@/lib/sheets"

export async function POST(request) {
  try {
    const { qrCodeUrl, studentId } = await request.json()
    
    console.log("[PDF-Convert API] Request received:", { qrCodeUrl: qrCodeUrl ? "provided" : "none", studentId })
    
    let fileUrl = qrCodeUrl;
    
    if (studentId && !qrCodeUrl) {
      console.log("[PDF-Convert API] Looking up QR code for student ID:", studentId)
      const qrCodeData = await getQRCodes()
      console.log("[PDF-Convert API] QR Codes data length:", qrCodeData.length)
      
      const studentQREntry = qrCodeData.find(row => row[0] === studentId)
      console.log("[PDF-Convert API] Found QR entry:", studentQREntry)
      
      if (!studentQREntry || !studentQREntry[1]) {
        console.log("[PDF-Convert API] No QR code found for student ID:", studentId)
        return NextResponse.json(
          { error: "No QR code found for this student ID" },
          { status: 404 }
        )
      }
      
      fileUrl = studentQREntry[1];
    }
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: "QR code URL or student ID is required" },
        { status: 400 }
      )
    }

    console.log("[PDF-Convert API] Getting file info for URL:", fileUrl)
    
    const fileId = sheetsClient.extractGoogleDriveFileId(fileUrl);
    if (!fileId) {
      return NextResponse.json(
        { error: "Invalid Google Drive file URL" },
        { status: 400 }
      )
    }

    // Check file type
    try {
      const metadata = await sheetsClient.drive.files.get({
        fileId,
        fields: 'mimeType,name'
      });

      const mimeType = metadata.data.mimeType;
      console.log("[PDF-Convert API] File type:", mimeType)
      
      if (mimeType && mimeType.startsWith('image/')) {
        console.log("[PDF-Convert API] File is already an image, returning image data")
        const imageData = await sheetsClient.getImageAsBase64(fileUrl)
        return NextResponse.json({
          imageData,
          success: true,
          qrCodeUrl: fileUrl
        })
      }
      
      if (mimeType === 'application/pdf') {
        console.log("[PDF-Convert API] File is PDF, returning PDF data for client conversion")
        
        const response = await sheetsClient.drive.files.get({
          fileId,
          alt: 'media'
        }, {
          responseType: 'arraybuffer'
        });

        if (!response.data || response.data.byteLength === 0) {
          throw new Error('No PDF data received from Google Drive');
        }

        const buffer = Buffer.from(response.data);
        const base64String = buffer.toString('base64');
        
        return NextResponse.json({
          pdfData: base64String,
          isPdf: true,
          success: true,
          qrCodeUrl: fileUrl
        })
      }
      
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 400 }
      )
      
    } catch (error) {
      console.error("[PDF-Convert API] Error processing file:", error)
      return NextResponse.json(
        { error: "Failed to process file", details: error.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in PDF-Convert API:", error)
    return NextResponse.json(
      { error: "Failed to convert PDF", details: error.message },
      { status: 500 }
    )
  }
}
