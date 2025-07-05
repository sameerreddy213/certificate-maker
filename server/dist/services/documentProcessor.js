"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocxWithData = generateDocxWithData;
exports.convertDocxToPdf = convertDocxToPdf;
// server/src/services/documentProcessor.ts
const pizzip_1 = __importDefault(require("pizzip"));
const docxtemplater_1 = __importDefault(require("docxtemplater"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const child_process_1 = require("child_process");
const execPromise = util_1.default.promisify(child_process_1.exec);
/**
 * Generates a single DOCX file with injected data using placeholders.
 * @param templatePath Absolute path to the DOCX template file.
 * @param data Data object to inject into placeholders (e.g., { recipientName: 'John Doe' }).
 * @param outputPath Absolute path where the generated DOCX file will be saved.
 */
function generateDocxWithData(templatePath, data, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Read the DOCX template file
        const content = fs_1.default.readFileSync(templatePath, 'binary');
        const zip = new pizzip_1.default(content);
        const doc = new docxtemplater_1.default(zip, {
            paragraphLoop: true, // Allows loops for dynamic paragraphs (advanced)
            linebreaks: true, // Preserves line breaks in placeholders
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
        fs_1.default.writeFileSync(outputPath, buf);
    });
}
/**
 * Converts a DOCX file to a PDF file using LibreOffice.
 * IMPORTANT: LibreOffice must be installed on your server for this function to work.
 * @param docxPath Absolute path to the input DOCX file.
 * @param pdfPath Absolute path where the generated PDF file will be saved.
 * @returns Promise that resolves when the PDF is generated.
 */
function convertDocxToPdf(docxPath, pdfPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const outputDir = path_1.default.dirname(pdfPath);
        try {
            // The command for LibreOffice to convert DOCX to PDF
            // --headless: runs LibreOffice without a graphical user interface
            // --convert-to pdf: specifies output format
            // "${docxPath}": input file
            // --outdir "${outputDir}": specifies output directory
            const { stdout, stderr } = yield execPromise(`libreoffice --headless --convert-to pdf "${docxPath}" --outdir "${outputDir}"`);
            console.log(`LibreOffice stdout: ${stdout}`);
            console.error(`LibreOffice stderr: ${stderr}`);
            // LibreOffice typically names the output file based on the input filename.
            // We need to construct this expected name to rename it to the desired pdfPath.
            const generatedPdfName = path_1.default.basename(docxPath).replace(/\.docx$/i, '.pdf');
            const tempPdfPath = path_1.default.join(outputDir, generatedPdfName);
            // Check if the file was created and then rename it
            if (fs_1.default.existsSync(tempPdfPath)) {
                fs_1.default.renameSync(tempPdfPath, pdfPath);
            }
            else {
                throw new Error(`LibreOffice did not produce a PDF at ${tempPdfPath}. Please ensure LibreOffice is installed and accessible in your server's PATH.`);
            }
        }
        catch (error) {
            console.error('PDF conversion failed:', error);
            throw error;
        }
    });
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
