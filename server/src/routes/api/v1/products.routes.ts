import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import * as productService from '../../../services/product.service.js';
import { parseBarcodeParam, parsePositiveIntParam } from '../../../utils/params.js';

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get('/search', (req, res, next) => {
  try {
    const raw = req.query.q;
    const q =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw) && typeof raw[0] === 'string'
          ? raw[0]
          : '';
    const data = productService.searchProducts(q);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/barcode/:code', (req, res, next) => {
  try {
    const code = parseBarcodeParam(req.params.code);
    const data = productService.getProductByBarcode(code);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:productId/prices', (req, res, next) => {
  try {
    const id = parsePositiveIntParam(req.params.productId, 'product id');
    const data = productService.listProductStorePrices(id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:productId', (req, res, next) => {
  try {
    const id = parsePositiveIntParam(req.params.productId, 'product id');
    const data = productService.getProductById(id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});
