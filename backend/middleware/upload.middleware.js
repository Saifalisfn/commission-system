import multer from "multer";
import fs from "fs";
import path from "path";

/* =========================================
   CREATE UPLOAD FOLDER AUTOMATICALLY
========================================= */

const uploadPath = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* =========================================
   STORAGE CONFIG
========================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");

    cb(null, uniqueName);
  },
});

/* =========================================
   FILE FILTER (SECURITY)
========================================= */

const fileFilter = (req, file, cb) => {
  const allowed =
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel";

  if (!allowed) {
    return cb(new Error("Only Excel files are allowed"), false);
  }

  cb(null, true);
};

/* =========================================
   EXPORT MULTER INSTANCE
========================================= */

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
