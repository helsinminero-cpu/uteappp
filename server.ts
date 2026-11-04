import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import os from 'os';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support raw binary and base64 JSON payload for file conversion
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ 
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  limit: '50mb' 
}));

// POST /api/convert-docx-to-pdf
// Executes the Python conversion environment internally and silently,
// with automatic cleanup of all temporary .docx files, tags, and intermediate scripts.
app.post('/api/convert-docx-to-pdf', async (req, res) => {
  let docxBuffer: Buffer | null = null;
  let tagsObj: Record<string, any> | null = null;
  let customFilename = 'documento_utea.pdf';

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    docxBuffer = req.body;
  } else if (req.body && (req.body.base64 || req.body.docxBase64)) {
    const rawB64 = req.body.base64 || req.body.docxBase64;
    docxBuffer = Buffer.from(rawB64.includes('base64,') ? rawB64.split('base64,')[1] : rawB64, 'base64');
    if (req.body.tags && typeof req.body.tags === 'object') {
      tagsObj = req.body.tags;
    }
    if (req.body.fileName) {
      customFilename = req.body.fileName.endsWith('.pdf') ? req.body.fileName : `${req.body.fileName}.pdf`;
    }
  }

  // Also check query param or header for filename
  if (req.query.filename && typeof req.query.filename === 'string') {
    customFilename = req.query.filename.endsWith('.pdf') ? req.query.filename : `${req.query.filename}.pdf`;
  }

  if (!docxBuffer || docxBuffer.length === 0) {
    res.status(400).json({ error: 'No se recibieron datos de archivo DOCX para procesar' });
    return;
  }

  // Create temporary files in os.tmpdir()
  const randomId = Math.random().toString(36).substring(2, 10);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utea_convert_'));
  const tempDocxPath = path.join(tempDir, `input_${randomId}.docx`);
  const tempPdfPath = path.join(tempDir, `output_${randomId}.pdf`);
  const tempTagsPath = tagsObj ? path.join(tempDir, `tags_${randomId}.json`) : null;

  try {
    fs.writeFileSync(tempDocxPath, docxBuffer);
    if (tempTagsPath && tagsObj) {
      fs.writeFileSync(tempTagsPath, JSON.stringify(tagsObj, null, 2), 'utf-8');
    }

    // Call Python conversion worker internally and silently
    const pythonScript = path.resolve('scripts/convert_docx_to_pdf.py');
    const pythonArgs = [pythonScript, tempDocxPath, tempPdfPath];
    if (tempTagsPath) {
      pythonArgs.push(tempTagsPath);
    }

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', pythonArgs);
      let stderr = '';

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(tempPdfPath)) {
          resolve();
        } else {
          reject(new Error(`Python conversion worker failed (exit code ${code}): ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    const pdfBuffer = fs.readFileSync(tempPdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(customFilename)}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Error during DOCX to PDF conversion:', err);
    res.status(500).json({ error: err.message || 'Error al convertir DOCX a PDF en el entorno Python' });
  } finally {
    // AUTOMATIC CLEANUP: Purge all temporary files from server
    try {
      if (tempDocxPath && fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
      if (tempPdfPath && fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      if (tempTagsPath && fs.existsSync(tempTagsPath)) fs.unlinkSync(tempTagsPath);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
