const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const path = require('path');
const { generateSalesReport } = require('../services/aiService');
const { sendReport } = require('../services/emailService');

const router = express.Router();

// ── Multer config ────────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv and .xlsx/.xls files are allowed.'));
    }
  },
});

// ── Helpers ──────────────────────────────────────────────────────
function parseCSV(buffer) {
  const text = buffer.toString('utf-8');
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (errors.length > 0) {
    console.warn('[CSV WARN]', errors.slice(0, 3));
  }
  return data;
}

function parseXLSX(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Route ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload sales data and generate AI report
 *     description: |
 *       Accepts a `.csv` or `.xlsx` file containing sales data along with a
 *       recipient email. Parses the data, generates a narrative report via AI,
 *       and emails the report to the provided address.
 *     tags:
 *       - Reports
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - email
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: A .csv or .xlsx file with sales data (max 10 MB)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address for the report
 *     responses:
 *       200:
 *         description: Report generated and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Report generated and sent to user@example.com
 *                 report:
 *                   type: string
 *                   description: The generated HTML report
 *       400:
 *         description: Bad request (missing file, invalid email, etc.)
 *       413:
 *         description: File too large
 *       500:
 *         description: Server or AI error
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    // ── Validate inputs ────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a .csv or .xlsx file.' });
    }

    const email = req.body.email?.trim();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid recipient email address is required.' });
    }

    // ── Parse file ─────────────────────────────────────────────
    const ext = path.extname(req.file.originalname).toLowerCase();
    let data;

    if (ext === '.csv') {
      data = parseCSV(req.file.buffer);
    } else {
      data = parseXLSX(req.file.buffer);
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'The uploaded file contains no data rows.' });
    }

    console.log(`[UPLOAD] ${req.file.originalname} — ${data.length} rows, sending to AI...`);

    // ── Generate AI report ─────────────────────────────────────
    const report = await generateSalesReport(data, req.file.originalname);

    console.log(`Got Report from AI: `, report);

    // ── Send email ─────────────────────────────────────────────
    await sendReport(email, report, req.file.originalname);

    // ── Respond ────────────────────────────────────────────────
    res.json({
      success: true,
      message: `Report generated and sent to ${email}`,
      report,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
