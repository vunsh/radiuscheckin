import PdfParse from "pdf-parse";

export async function parseQRCodePDF(buffer) {
  try {
    const data = await PdfParse(buffer);
    const text = data.text;
    
    const uuidMatch = text.match(/UUID:\s*(\d+)/i);
    const uuid = uuidMatch ? uuidMatch[1] : null;
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let studentName = null;
    let foundUUID = false;
    
    for (const line of lines) {
      if (line.includes('UUID:')) {
        foundUUID = true;
        continue;
      }
      
      if (foundUUID && line && !line.includes('UUID:')) {
        studentName = line;
        break;
      }
    }
    
    return {
      uuid,
      studentName,
      rawText: text
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}
