import express from "express";
import { body } from "express-validator";

import {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  uploadSalesExcel,
  previewSalesExcel,
  confirmExcelImport,
} from "../controllers/transaction.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { checkFilingLock } from "../middleware/filingLock.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

/* ======================================================
   AUTHENTICATION (ALL ROUTES PROTECTED)
====================================================== */
router.use(authenticate);

/* ======================================================
   VALIDATIONS
====================================================== */

/* CREATE TRANSACTION VALIDATION */
const createValidation = [
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),

  body("totalReceived")
    .isFloat({ min: 0.01 })
    .withMessage("Total received must be greater than 0"),

  body("commissionPercent")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission must be between 0 and 100"),

  body("paymentMode")
    .optional()
    .isIn(["QR"])
    .withMessage("Payment mode must be QR"),

  body("remarks")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Remarks cannot exceed 500 characters"),
];

/* UPDATE TRANSACTION VALIDATION */
const updateValidation = [
  body("date").optional().isISO8601(),
  body("totalReceived").optional().isFloat({ min: 0.01 }),
  body("commissionPercent").optional().isFloat({ min: 0, max: 100 }),
  body("paymentMode").optional().isIn(["QR"]),
  body("remarks").optional().isLength({ max: 500 }),
];

/* ======================================================
   TRANSACTION ROUTES
====================================================== */

/* CREATE */
router.post(
  "/",
  createValidation,
  validateRequest,
  createTransaction
);

/* LIST */
router.get("/", getTransactions);

/* GET SINGLE */
router.get("/:id", getTransaction);

/* UPDATE */
router.put(
  "/:id",
  checkFilingLock,
  updateValidation,
  validateRequest,
  updateTransaction
);

/* DELETE */
router.delete(
  "/:id",
  checkFilingLock,
  deleteTransaction
);

/* ======================================================
   EXCEL IMPORT ROUTES
====================================================== */

/* Upload + Direct Insert */
router.post(
  "/upload-excel",
  upload.single("file"),
  uploadSalesExcel
);

/* Preview Excel */
router.post(
  "/preview-excel",
  upload.single("file"),
  previewSalesExcel
);

/* Confirm Import */
router.post(
  "/confirm-excel",
  confirmExcelImport
);

export default router;
