import { google } from 'googleapis';

class GoogleSheetsClient {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error('Invalid Google Sheets URL');
    return match[1];
  }

  async readData(range) {
    try {
      const spreadsheetId = this.extractSpreadsheetId(process.env.HOMEDATA);
      const sheetRange = range || process.env.QRCODELOCATION;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetRange,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error reading from Google Sheets:', error);
      throw error;
    }
  }

  async writeData(data, range) {
    try {
      const spreadsheetId = this.extractSpreadsheetId(process.env.HOMEDATA);
      const sheetRange = range || process.env.QRCODELOCATION;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: sheetRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: data,
        },
      });
    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      throw error;
    }
  }

  async appendData(data, range) {
    try {
      const spreadsheetId = this.extractSpreadsheetId(process.env.HOMEDATA);
      const sheetRange = range || process.env.QRCODELOCATION;

      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: data,
        },
      });
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      throw error;
    }
  }

  async clearData(range) {
    try {
      const spreadsheetId = this.extractSpreadsheetId(process.env.HOMEDATA);
      const sheetRange = range || process.env.QRCODELOCATION;

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: sheetRange,
      });
    } catch (error) {
      console.error('Error clearing Google Sheets data:', error);
      throw error;
    }
  }

  extractGoogleDriveFileId(url) {
    if (!url || typeof url !== 'string') return null;
    
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  async getImageAsBase64(fileUrl) {
    try {
      const fileId = this.extractGoogleDriveFileId(fileUrl);
      if (!fileId) {
        throw new Error('Invalid Google Drive file URL');
      }

      const metadata = await this.drive.files.get({
        fileId,
        fields: 'mimeType,name'
      });

      const mimeType = metadata.data.mimeType;
      if (!mimeType || !mimeType.startsWith('image/')) {
        throw new Error('File is not an image');
      }

      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });

      const buffer = Buffer.from(response.data);
      const base64String = buffer.toString('base64');
      
      return `data:${mimeType};base64,${base64String}`;
    } catch (error) {
      console.error('Error fetching image from Google Drive:', error);
      throw error;
    }
  }
}

export const sheetsClient = new GoogleSheetsClient();

export const getQRCodes = () => sheetsClient.readData(`${process.env.QRCODESHEET}!A:B`);

export const addQRCode = (qrData, description) => {
  const data = [[qrData, description]];
  return sheetsClient.appendData(data, `${process.env.QRCODESHEET}!A:B`);
};

export const updateQRCodes = (data) => sheetsClient.writeData(data, `${process.env.QRCODESHEET}!A:B`);

export const removeQRCode = async (qrData) => {
  try {
    const allData = await getQRCodes();
    const filteredData = allData.filter(row => row[0] !== qrData);
    await sheetsClient.clearData(`${process.env.QRCODESHEET}!A:B`);
    if (filteredData.length > 0) {
      await updateQRCodes(filteredData);
    }
  } catch (error) {
    console.error('Error removing QR code:', error);
    throw error;
  }
};

export const getStudentData = () => sheetsClient.readData(`${process.env.STUDENTDATASHEET}!A:ZZ`);

export const addStudentData = (studentRow) => {
  const data = [studentRow];
  return sheetsClient.appendData(data, `${process.env.STUDENTDATASHEET}!A:ZZ`);
};

export const updateStudentData = (data) => sheetsClient.writeData(data, `${process.env.STUDENTDATASHEET}!A:ZZ`);

export const removeStudentData = async (identifier, columnIndex = 0) => {
  try {
    const allData = await getStudentData();
    const filteredData = allData.filter(row => row[columnIndex] !== identifier);
    await sheetsClient.clearData(`${process.env.STUDENTDATASHEET}!A:ZZ`);
    if (filteredData.length > 0) {
      await updateStudentData(filteredData);
    }
  } catch (error) {
    console.error('Error removing student data:', error);
    throw error;
  }
};

export const findStudentByColumn = async (value, columnIndex = 0) => {
  try {
    const allData = await getStudentData();
    return allData.find(row => row[columnIndex] === value);
  } catch (error) {
    console.error('Error finding student:', error);
    throw error;
  }
};

export const findQRCode = async (qrData) => {
  try {
    const allData = await getQRCodes();
    return allData.find(row => row[0] === qrData);
  } catch (error) {
    console.error('Error finding QR code:', error);
    throw error;
  }
};

export const getUniqueCenters = async () => {
  try {
    const studentData = await getStudentData();

    if (!studentData || studentData.length === 0) {
      return [];
    }



    const centerColumnIndex = 49;
    const headers = studentData[0] || [];

    if (
      !headers[centerColumnIndex] ||
      headers[centerColumnIndex].trim().toLowerCase() !== "center"
    ) {
      const fallbackIndex = headers.findIndex(
        h => typeof h === "string" && h.trim().toLowerCase() === "center"
      );
      if (fallbackIndex === -1) {
        throw new Error('Column AX does not contain the "Center" header and no "Center" column found');
      }
      return Array.from(
        new Set(
          studentData
            .slice(1)
            .map(row => row[fallbackIndex])
            .filter(
              v =>
                typeof v === "string" &&
                v.trim() !== "" &&
                v.trim().toLowerCase() !== "center" &&
                v.trim().toLowerCase() !== "center id"
            )
        )
      ).sort();
    }

    const centers = new Set();
    for (let i = 1; i < studentData.length; i++) {
      const row = studentData[i];
      if (!row || row.length <= centerColumnIndex) continue;
      const centerValue = row[centerColumnIndex];
      if (
        centerValue &&
        typeof centerValue === "string" &&
        centerValue.trim() !== "" &&
        centerValue.trim().toLowerCase() !== "center" &&
        centerValue.trim().toLowerCase() !== "center id"
      ) {
        centers.add(centerValue.trim());
      }
    }

    return Array.from(centers).sort();
  } catch (error) {
    console.error('Error getting unique centers:', error);
    throw error;
  }
};

export const getStudentsByCenter = async (centerName) => {
  try {
    const studentData = await getStudentData();
    
    if (!studentData || studentData.length === 0) {
      return [];
    }

    const headers = studentData[0] || [];
    const firstNameIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "first name");
    const lastNameIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "last name");
    const studentIdIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "a");
    const centerIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "center");
    const lastAttendanceIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "last attendance date");
    const qrCodeIndex = headers.findIndex(h => h && h.toLowerCase().trim() === "qr code");

    if (centerIndex === -1) {
      throw new Error('Center column not found in student data');
    }

    const students = [];
    for (let i = 1; i < studentData.length; i++) {
      const row = studentData[i];
      if (!row || row.length <= centerIndex) continue;

      const studentCenter = row[centerIndex];
      if (studentCenter && studentCenter.trim() === centerName.trim()) {
        students.push({
          firstName: firstNameIndex !== -1 ? (row[firstNameIndex] || '') : '',
          lastName: lastNameIndex !== -1 ? (row[lastNameIndex] || '') : '',
          studentId: studentIdIndex !== -1 ? (row[studentIdIndex] || '') : '',
          center: studentCenter.trim(),
          lastAttendance: lastAttendanceIndex !== -1 ? (row[lastAttendanceIndex] || '') : '',
          qrCode: qrCodeIndex !== -1 ? (row[qrCodeIndex] || '') : ''
        });
      }
    }

    return students;
  } catch (error) {
    console.error('Error getting students by center:', error);
    throw error;
  }
};
