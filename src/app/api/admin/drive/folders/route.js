// legacy route for when no drive scope, ignore

import { NextResponse } from "next/server"
import { isApprovedUser } from "@/lib/auth"
import { google } from 'googleapis'

import { auth } from "@/auth"

export async function GET(request) {
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

    const oauthClient = new google.auth.OAuth2()
    oauthClient.setCredentials({ access_token: session.accessToken })
    const drive = google.drive({ version: 'v3', auth: oauthClient })

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name, parents, capabilities)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })

    const folders = response.data.files || []

    const uploadableFolders = folders.filter(folder => 
      folder.capabilities?.canAddChildren === true
    )

    return NextResponse.json({
      folders: folders,
      count: folders.length
    })

  } catch (error) {
    console.error("Error fetching drive folders:", error)
    return NextResponse.json(
      { error: "Failed to fetch drive folders" },
      { status: 500 }
    )
  }
}
