import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getMyInvoices, getInvoicePdf } from '../controllers/invoices.controller.js';

const router = Router();

router.get('/my', requireAuth, getMyInvoices);
router.get('/:id/pdf', requireAuth, getInvoicePdf);

export default router;
