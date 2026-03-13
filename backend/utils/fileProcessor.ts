// @ts-ignore - pdf-parse has ESM/CJS compatibility issues
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';

export interface ProcessedFile {
    text: string;
    pages?: number;
    metadata: {
        filePages: number;
        fileSize: string;
        fileType: 'pdf' | 'docx' | 'doc' | 'txt';
        uploadedOn: Date;
        textLength: number;
    };
}

/**
 * Extract text from PDF file
 */
export const extractTextFromPDF = async (filePath: string): Promise<{ text: string; pages: number }> => {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        
        return {
            text: data.text,
            pages: data.numpages
        };
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF file');
    }
};

/**
 * Extract text from DOCX/DOC file
 */
export const extractTextFromDOCX = async (filePath: string): Promise<{ text: string; pages: number }> => {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        
        // Estimate pages (roughly 500 words per page)
        const wordCount = result.value.split(/\s+/).length;
        const estimatedPages = Math.ceil(wordCount / 500);
        
        return {
            text: result.value,
            pages: estimatedPages
        };
    } catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from DOCX/DOC file');
    }
};

/**
 * Extract text from TXT file
 */
export const extractTextFromTXT = async (filePath: string): Promise<{ text: string; pages: number }> => {
    try {
        const text = await fs.readFile(filePath, 'utf-8');
        
        // Estimate pages (roughly 3000 characters per page)
        const estimatedPages = Math.ceil(text.length / 3000);
        
        return {
            text,
            pages: estimatedPages || 1
        };
    } catch (error) {
        console.error('Error extracting text from TXT:', error);
        throw new Error('Failed to extract text from TXT file');
    }
};

/**
 * Process uploaded file and extract text based on file type
 */
export const processFile = async (filePath: string, originalName: string, fileSize: number): Promise<ProcessedFile> => {
    const fileExtension = originalName.toLowerCase().split('.').pop() as 'pdf' | 'docx' | 'doc' | 'txt';
    
    let extractedData: { text: string; pages: number };
    
    switch (fileExtension) {
        case 'pdf':
            extractedData = await extractTextFromPDF(filePath);
            break;
        case 'docx':
        case 'doc':
            extractedData = await extractTextFromDOCX(filePath);
            break;
        case 'txt':
            extractedData = await extractTextFromTXT(filePath);
            break;
        default:
            throw new Error(`Unsupported file type: ${fileExtension}`);
    }
    
    // Clean up the file after processing
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error deleting temporary file:', error);
    }
    
    return {
        text: extractedData.text,
        pages: extractedData.pages,
        metadata: {
            filePages: extractedData.pages,
            fileSize: formatFileSize(fileSize),
            fileType: fileExtension,
            uploadedOn: new Date(),
            textLength: extractedData.text.length
        }
    };
};

/**
 * Format file size to human-readable string
 */
const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
