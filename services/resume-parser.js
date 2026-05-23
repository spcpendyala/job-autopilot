const fs = require('fs');

async function parseResume(filePath, mimetype) {
  if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text.trim();
  }
  if (mimetype.includes('officedocument') || filePath.endsWith('.docx')) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  }
  return fs.readFileSync(filePath, 'utf8').trim();
}

module.exports = { parseResume };
