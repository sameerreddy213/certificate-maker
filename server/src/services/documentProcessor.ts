// server/src/services/documentProcessor.ts
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';
import { type } from 'os'; // Imported 'type' from 'os' library, but not used. Removing.

const execPromise = util.promisify(exec);

/**
 * Generates a single DOCX file with injected data using placeholders.
 * @param templatePath Absolute path to the DOCX template file.
 * @param data Data object to inject into placeholders (e.g., { recipientName: 'John Doe' }).
 * @param outputPath Absolute path where the generated DOCX file will be saved.
 */
export async function generateDocxWithData(
  templatePath: string,
  data: Record<string, any>,
  outputPath: string
): Promise<void> {
  // Read the DOCX template file
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true, // Allows loops for dynamic paragraphs (advanced)
    linebreaks: true,    // Preserves line breaks in placeholders
  });

  // Set the data for placeholders
  doc.setData(data);

  // Render the document (replace placeholders with data)
  doc.render();

  // Generate the final DOCX buffer
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  // Write the generated DOCX to the specified output path
  fs.writeFileSync(outputPath, buf);
}

/**
 * Converts a DOCX file to a PDF file using LibreOffice.
 * IMPORTANT: LibreOffice must be installed on your server for this function to work.
 * @param docxPath Absolute path to the input DOCX file.
 * @param pdfPath Absolute path where the generated PDF file will be saved.
 * @returns Promise that resolves when the PDF is generated.
 */
export async function convertDocxToPdf(docxPath: string, pdfPath: string): Promise<void> {
    const outputDir = path.dirname(pdfPath);
    try {
        // The command for LibreOffice to convert DOCX to PDF
        // --headless: runs LibreOffice without a graphical user interface
        // --convert-to pdf: specifies output format
        // "${docxPath}": input file
        // --outdir "${outputDir}": specifies output directory
        const { stdout, stderr } = await execPromise(`libreoffice --headless --convert-to pdf "${docxPath}" --outdir "${outputDir}"`);
        console.log(`LibreOffice stdout: ${stdout}`);
        console.error(`LibreOffice stderr: ${stderr}`);

        // LibreOffice typically names the output file based on the input filename.
        // We need to construct this expected name to rename it to the desired pdfPath.
        const generatedPdfName = path.basename(docxPath).replace(/\.docx$/i, '.pdf');
        const tempPdfPath = path.join(outputDir, generatedPdfName);

        // Check if the file was created and then rename it
        if (fs.existsSync(tempPdfPath)) {
            fs.renameSync(tempPdfPath, pdfPath);
        } else {
            throw new Error(`LibreOffice did not produce a PDF at ${tempPdfPath}. Please ensure LibreOffice is installed and accessible in your server's PATH.`);
        }
    } catch (error) {
        console.error('PDF conversion failed:', error);
        throw error;
    }
}

// Note on Placeholder Extraction:
// Automatically extracting all placeholders from an arbitrary DOCX/PPTX document is very complex.
// The docxtemplater library focuses on filling them, not extracting all possible patterns.
// For robust extraction, you would typically:
// 1. Unzip the .docx file (it's a zip archive of XML files).
// 2. Parse the 'word/document.xml' file to find patterns like '{{placeholder}}'.
// This requires a deep understanding of Office Open XML (OOXML) format.
// For now, it's simpler to rely on the user defining the placeholders on the frontend
// and ensuring they match what's in their uploaded document.