import { google } from 'googleapis';

class GoogleSheetsClient {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
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
