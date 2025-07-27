import { google } from 'googleapis';
import { Readable } from 'stream';

class GoogleDriveClient {
  createUserDriveClient(accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: 'v3', auth });
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.AUTH_GOOGLE_ID,
          client_secret: process.env.AUTH_GOOGLE_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      throw error;
    }
  }

  async uploadFile(part, folderId, studentInfo, accessToken, refreshToken = null) {
    try {

      if (!accessToken) {
        throw new Error("No access token provided");
      }

      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!allowedTypes.includes(part.mimetype)) {
        throw new Error("Only PDF and image files are allowed");
      }

      let currentAccessToken = accessToken;
      let retryCount = 0;
      const maxRetries = 1;

      while (retryCount <= maxRetries) {
        try {
          const drive = this.createUserDriveClient(currentAccessToken);

          let filename = "untitled";
          const extension = part.mimetype === "application/pdf" ? ".pdf" : 
                          part.mimetype === "image/png" ? ".png" : ".jpg";
          
          if (studentInfo?.studentId && studentInfo?.fullName) {
            const safeName = studentInfo.fullName.replace(/[^a-zA-Z0-9-_]/g, "_");
            filename = `${studentInfo.studentId}_${safeName}_QR${extension}`;
          } else {
            filename = `QR_code_${Date.now()}${extension}`;
          }

          const fileMetadata = {
            name: filename,
            parents: [folderId],
          };

          const media = {
            mimeType: part.mimetype,
            body: Readable.from(part.body),
          };

          const response = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: 'id',
            supportsAllDrives: true,
          });

          await drive.permissions.create({
            fileId: response.data.id,
            resource: {
              role: 'reader',
              type: 'anyone',
            },
            supportsAllDrives: true,
          });

          return `https://drive.google.com/file/d/${response.data.id}/view`;
        } catch (error) {
          if (error.response?.status === 401 && refreshToken && retryCount < maxRetries) {
            try {
              currentAccessToken = await this.refreshAccessToken(refreshToken);
              retryCount++;
              continue;
            } catch (refreshError) {
              throw new Error("Authentication failed. Please sign out and sign in again.");
            }
          }
          throw error;
        }
      }
    } catch (error) {
      throw error;
    }
  }
}

export const driveClient = new GoogleDriveClient();
