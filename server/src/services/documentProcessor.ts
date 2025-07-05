import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import util from 'node:util';

const execPromise = util.promisify(exec);

/**
 * Generates a DOCX file with injected data.
 * @param templatePath - Path to the DOCX template.
 * @param data - The data to inject into placeholders.
 * @param outputPath - Path to save the generated DOCX.
 */
export async function generateDocxWithData(templatePath: string, data: Record<string, any>, outputPath: string): Promise<void> {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        // This parser helps catch template errors more effectively
        parser: (tag) => {
            // A custom parser can be added here if needed, for now, default behavior is fine.
            return {
                get: (scope) => scope[tag],
            };
        },
    });

    try {
        // Load the data to replace placeholders
        doc.setData(data);
        // Render the document (and catch any template errors)
        doc.render();
    } catch (error: any) {
        // This block will now catch specific docxtemplater errors
        if (error.properties && error.properties.errors) {
            const detailedErrors = error.properties.errors.map((e: any) => e.properties.explanation).join('\n');
            throw new Error(`Template Error: ${detailedErrors}`);
        }
        throw error; // Re-throw other types of errors
    }

    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });

    fs.writeFileSync(outputPath, buf);
}


/**
 * Converts a DOCX file to PDF using LibreOffice.
 * @param docxPath - Path to the source DOCX file.
 * @param pdfPath - Path to save the output PDF file.
 */
export async function convertDocxToPdf(docxPath: string, pdfPath: string): Promise<void> {
    const outdir = path.dirname(pdfPath);
    try {
        // Ensure the command is correctly formatted for your OS
        const command = `libreoffice --headless --convert-to pdf "${docxPath}" --outdir "${outdir}"`;
        const { stdout, stderr } = await execPromise(command);

        if (stderr) {
            console.error('LibreOffice STDERR:', stderr);
            // Check if it's a non-critical warning
            if (!stderr.includes('loaded an older configuration file')) {
                 // throw new Error(`PDF conversion failed: ${stderr}`);
            }
        }

        // LibreOffice often names the output file based on the input. We need to find it and rename it.
        const generatedPdfName = path.basename(docxPath, '.docx') + '.pdf';
        const generatedPdfPath = path.join(outdir, generatedPdfName);

        // Check if the expected file exists before renaming
        if (fs.existsSync(generatedPdfPath)) {
            fs.renameSync(generatedPdfPath, pdfPath);
        } else {
            throw new Error('PDF conversion did not produce the expected output file.');
        }

    } catch (error: any) {
        console.error('PDF conversion process failed:', error);
        throw new Error('Failed to convert document to PDF.');
    }
}