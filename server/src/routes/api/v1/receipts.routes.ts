import { randomUUID } from 'node:crypto';
import { mkdirSync, unlinkSync } from 'node:fs';
import { extname } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { getReceiptsUploadDir } from '../../../db/paths.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as receiptService from '../../../services/receipt.service.js';
import { HttpError } from '../../../utils/errors.js';
import { parsePositiveIntParam } from '../../../utils/params.js';
import { receiptConfirmBodySchema } from '../../../validation/receiptConfirm.schema.js';

const MAX_FILE_BYTES = 12 * 1024 * 1024;

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getReceiptsUploadDir();
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
  },
});

function uploadReceiptFile(req: Request, res: Response, next: NextFunction): void {
  receiptUpload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new HttpError(413, 'File too large', 'FILE_TOO_LARGE'));
          return;
        }
        next(new HttpError(400, err.message, 'UPLOAD_ERROR'));
        return;
      }
      if (err instanceof Error) {
        next(new HttpError(400, err.message, 'INVALID_FILE_TYPE'));
        return;
      }
      next(err);
      return;
    }
    next();
  });
}

export const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

receiptsRouter.post('/upload', uploadReceiptFile, (req, res, next) => {
  const file = req.file;
  if (!file) {
    next(new HttpError(400, 'file field is required (multipart image)', 'FILE_REQUIRED'));
    return;
  }

  try {
    const fields = receiptService.parseReceiptUploadFields(
      req.body as Record<string, unknown>,
    );
    const relativeUrl = `receipts/${file.filename}`;
    const data = receiptService.createReceiptFromUpload({
      userId: req.user!.id,
      relativeImageUrl: relativeUrl,
      store_id: fields.store_id,
      purchase_date: fields.purchase_date,
      total: fields.total,
    });
    res.status(201).json({ data });
  } catch (e) {
    try {
      unlinkSync(file.path);
    } catch {
      // ignore cleanup failure
    }
    next(e);
  }
});

receiptsRouter.post(
  '/:receiptId/confirm',
  validateBody(receiptConfirmBodySchema),
  (req, res, next) => {
    try {
      const receiptId = parsePositiveIntParam(req.params.receiptId, 'receipt id');
      const data = receiptService.confirmReceiptForUser(req.user!.id, receiptId, req.body);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
);

receiptsRouter.get('/:receiptId', (req, res, next) => {
  try {
    const receiptId = parsePositiveIntParam(req.params.receiptId, 'receipt id');
    const data = receiptService.getReceiptDetailForUser(req.user!.id, receiptId);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});
