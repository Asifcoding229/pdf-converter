// PDF Converter Tool - Main JavaScript

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFile');
const formatBtns = document.querySelectorAll('.format-btn');
const convertBtn = document.getElementById('convertBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressStatus = document.getElementById('progressStatus');
const resultContainer = document.getElementById('resultContainer');
const downloadLink = document.getElementById('downloadLink');
const convertAnotherBtn = document.getElementById('convertAnother');

// Variables
let selectedFile = null;
let selectedFormat = 'docx'; // Default format

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
removeFileBtn.addEventListener('click', removeFile);
convertBtn.addEventListener('click', convertFile);
convertAnotherBtn.addEventListener('click', resetConverter);

// Format selection
formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFormat = btn.getAttribute('data-format');
    });
});

// Drag and drop functionality
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
});

// Functions
function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

function handleFiles(files) {
    const file = files[0];
    
    // Check if file is PDF
    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file.');
        return;
    }
    
    selectedFile = file;
    
    // Display file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'block';
    convertBtn.disabled = false;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    convertBtn.disabled = true;
}

function resetConverter() {
    removeFile();
    resultContainer.style.display = 'none';
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
    progressStatus.textContent = 'Converting... 0%';
}

async function convertFile() {
    if (!selectedFile) return;
    
    // Show progress
    fileInfo.style.display = 'none';
    progressContainer.style.display = 'block';
    convertBtn.disabled = true;
    
    try {
        // Update progress - reading file
        updateProgress(10, 'Reading PDF file...');
        
        // Read the PDF file
        const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
        
        // Load the PDF with pdf.js
        updateProgress(20, 'Parsing PDF content...');
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        // Extract text from all pages
        updateProgress(30, 'Extracting text...');
        const totalPages = pdf.numPages;
        let extractedText = '';
        
        for (let i = 1; i <= totalPages; i++) {
            // Update progress during extraction
            updateProgress(30 + Math.floor((i / totalPages) * 40), `Extracting page ${i} of ${totalPages}...`);
            
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            
            extractedText += pageText + '\n\n';
        }
        
        // Convert to selected format
        updateProgress(75, `Converting to ${selectedFormat.toUpperCase()}...`);
        
        let result;
        let fileName;
        
        switch (selectedFormat) {
            case 'docx':
                result = await convertToDocx(extractedText, selectedFile.name);
                fileName = selectedFile.name.replace('.pdf', '.docx');
                break;
            case 'txt':
                result = new Blob([extractedText], { type: 'text/plain' });
                fileName = selectedFile.name.replace('.pdf', '.txt');
                break;
            case 'html':
                result = convertToHtml(extractedText, selectedFile.name);
                fileName = selectedFile.name.replace('.pdf', '.html');
                break;
            default:
                throw new Error('Unsupported format');
        }
        
        // Complete
        updateProgress(100, 'Conversion completed!');
        
        // Show download button
        const url = URL.createObjectURL(result);
        downloadLink.href = url;
        downloadLink.download = fileName;
        
        // Show result
        setTimeout(() => {
            progressContainer.style.display = 'none';
            resultContainer.style.display = 'block';
        }, 500);
        
    } catch (error) {
        console.error('Conversion error:', error);
        alert('Error converting file: ' + error.message);
        resetConverter();
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function updateProgress(percent, message) {
    progressBar.style.width = `${percent}%`;
    progressStatus.textContent = message || `Converting... ${percent}%`;
}

async function convertToDocx(text, originalFileName) {
    // Create a new Document using docx.js
    const doc = new docx.Document({
        sections: [{
            properties: {},
            children: [
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: `Converted from: ${originalFileName}`,
                            bold: true,
                            size: 28,
                        }),
                    ],
                }),
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: "Converted with PDF Converter Tool",
                            italics: true,
                            size: 24,
                            color: "808080",
                        }),
                    ],
                }),
                new docx.Paragraph({}),
                ...text.split('\n').map(line => 
                    new docx.Paragraph({
                        children: [new docx.TextRun(line)],
                    })
                ),
            ],
        }],
    });
    
    // Generate the docx file
    const buffer = await docx.Packer.toBuffer(doc);
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function convertToHtml(text, originalFileName) {
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Converted from ${originalFileName}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .footer {
                    border-top: 1px solid #eee;
                    padding-top: 10px;
                    margin-top: 20px;
                    font-size: 0.8em;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Converted from: ${originalFileName}</h1>
                <p><em>Converted with PDF Converter Tool</em></p>
            </div>
            
            <div class="content">
                ${text.split('\n').map(line => line ? `<p>${line}</p>` : '<br>').join('')}
            </div>
            
            <div class="footer">
                <p>This document was converted from PDF using PDF Converter Tool.</p>
            </div>
        </body>
        </html>
    `;
    
    return new Blob([htmlContent], { type: 'text/html' });
}
