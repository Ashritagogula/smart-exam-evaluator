import multer from "multer";
import path from "path";
import fs from "fs-extra";

const storage = (dest) => multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed"), false);
};

export const uploadBooklets = multer({
  storage: storage("./uploads/booklets"),
  fileFilter: pdfFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
}).array("booklets", 200);

export const uploadSinglePDF = (folder) => multer({
  storage: storage(`./uploads/${folder}`),
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
}).single("file");

export const uploadOCR = multer({
  storage: storage("./uploads/temp"),
  fileFilter: pdfFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "answerKeyFile", maxCount: 1 },
]);
