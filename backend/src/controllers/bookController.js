const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { prisma } = require("../lib/prisma");
const { logActivity } = require("../services/activityService");
const {
  BOOK_UPLOADS_DIR,
  PRIVATE_BOOK_UPLOADS_DIR,
  resolveStoredFilePath,
  safeMoveFile,
  safeUnlink,
} = require("../utils/files");
const { toNumber } = require("../utils/text");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");

const bookUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, BOOK_UPLOADS_DIR);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname || "");
      cb(null, `${require("crypto").randomBytes(16).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const parseId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

const cleanText = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
};

const pickNullable = (value, fallback) =>
  value === undefined ? fallback : cleanText(value);

const respondWithError = (res, err, message) => {
  const dbError = getDatabaseErrorResponse(err);
  if (dbError) {
    return res.status(dbError.status).json({ message: dbError.message });
  }
  return res.status(500).json({ message });
};

const moveExistingBookFile = (currentPath, makePublic) => {
  if (!currentPath) return currentPath;
  if (makePublic && String(currentPath).startsWith("/uploads/"))
    return currentPath;
  if (!makePublic && String(currentPath).startsWith("private/"))
    return currentPath;

  const resolved = resolveStoredFilePath(currentPath);
  if (!resolved || !fs.existsSync(resolved)) return currentPath;

  const filename = path.basename(resolved);
  if (makePublic) {
    const dest = path.join(BOOK_UPLOADS_DIR, filename);
    safeMoveFile(resolved, dest);
    return `/uploads/books/${filename}`;
  }

  const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, filename);
  safeMoveFile(resolved, dest);
  return `private/books/${filename}`;
};

const mapPublicBook = (b) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  description: b.description,
  category: b.category,
  archiveSource: b.archiveSource || "",
  documentCode: b.documentCode || "",
  fileUrl: b.filePath,
  coverUrl: b.coverPath || null,
  fileSize: toNumber(b.fileSize),
  downloads: b.downloadCount,
  createdAt: b.createdAt,
});

const mapMyBook = (b) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  description: b.description,
  category: b.category,
  archiveSource: b.archiveSource || "",
  documentCode: b.documentCode || "",
  fileUrl: String(b.filePath || "").startsWith("/uploads/") ? b.filePath : null,
  coverUrl: b.coverPath || null,
  fileSize: toNumber(b.fileSize),
  downloads: b.downloadCount,
  isPublic: !!b.isPublic,
  createdAt: b.createdAt,
});

const mapAdminBook = (b) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  description: b.description,
  category: b.category,
  archiveSource: b.archiveSource || "",
  documentCode: b.documentCode || "",
  fileUrl: String(b.filePath || "").startsWith("/uploads/") ? b.filePath : null,
  coverUrl: b.coverPath || null,
  fileSize: toNumber(b.fileSize),
  isPublic: !!b.isPublic,
  downloads: b.downloadCount,
  uploadedBy: b.uploader?.fullName || "Unknown",
  createdAt: b.createdAt,
});

const listPublicBooks = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const rows = await prisma.book.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        createdAt: true,
      },
    });
    res.json(rows.map(mapPublicBook));
  } catch (err) {
    console.error("Failed to load books:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load books");
  }
};

const getPublicBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        createdAt: true,
        isPublic: true,
      },
    });
    if (!book) return res.status(404).json({ message: "Not found" });
    if (!book.isPublic) return res.status(403).json({ message: "Forbidden" });

    res.json(mapPublicBook(book));
  } catch (err) {
    console.error("Failed to load book:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load book");
  }
};

const downloadPublicBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true, title: true, filePath: true, isPublic: true },
    });
    if (!book) return res.status(404).json({ message: "Not found" });
    if (!book.isPublic) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const filePath = resolveStoredFilePath(book.filePath);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    await prisma.book.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    res.download(filePath, path.basename(filePath));
  } catch (err) {
    console.error("Download failed:", err.code || "", err.message);
    return respondWithError(res, err, "Download failed");
  }
};

const listMyBooks = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const rows = await prisma.book.findMany({
      where: { uploadedBy: req.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        isPublic: true,
        createdAt: true,
      },
    });
    res.json(rows.map(mapMyBook));
  } catch (err) {
    console.error("Failed to load my books:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load books");
  }
};

const getMyBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        downloadCount: true,
        isPublic: true,
        uploadedBy: true,
        createdAt: true,
      },
    });
    if (!book) return res.status(404).json({ message: "Not found" });

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(mapMyBook(book));
  } catch (err) {
    console.error("Failed to load my book:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load book");
  }
};

const createMyBook = async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      category,
      archiveSource,
      documentCode,
      isPublic,
    } = req.body || {};
    const bookFile = req.files?.file?.[0];
    const coverFile = req.files?.cover?.[0];
    const safeTitle = cleanText(title);
    if (!safeTitle || !bookFile) {
      return res.status(400).json({ message: "Title and file are required" });
    }
    if (!coverFile) {
      return res.status(400).json({ message: "Cover image is required" });
    }

    const publicFlag = parseBoolean(isPublic, true);
    let filePath = `/uploads/books/${bookFile.filename}`;
    if (!publicFlag) {
      const src = path.join(BOOK_UPLOADS_DIR, bookFile.filename);
      const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
      safeMoveFile(src, dest);
      filePath = `private/books/${bookFile.filename}`;
    }
    const coverPath = `/uploads/books/${coverFile.filename}`;

    const fileSize =
      typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;

    const created = await prisma.book.create({
      data: {
        title: safeTitle,
        author: cleanText(author),
        description: cleanText(description),
        category: cleanText(category),
        archiveSource: cleanText(archiveSource),
        documentCode: cleanText(documentCode),
        filePath,
        coverPath,
        fileSize,
        uploadedBy: req.user.id,
        isPublic: publicFlag,
      },
    });

    await logActivity(req.user.id, "books", `Uploaded book: ${safeTitle}`);
    res.status(201).json({ id: created.id });
  } catch (err) {
    console.error("Upload book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Upload failed");
  }
};

const updateMyBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        archiveSource: true,
        documentCode: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        uploadedBy: true,
        isPublic: true,
      },
    });
    if (!book) return res.status(404).json({ message: "Not found" });

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const {
      title,
      author,
      description,
      category,
      archiveSource,
      documentCode,
      isPublic,
    } = req.body || {};
    const safeTitle =
      title !== undefined && title !== null ? cleanText(title) : book.title;
    if (!safeTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    const publicFlag =
      isPublic !== undefined && isPublic !== null
        ? parseBoolean(isPublic, !!book.isPublic)
        : !!book.isPublic;

    const bookFile = req.files?.file?.[0];
    const coverFile = req.files?.cover?.[0];

    let filePath = book.filePath;
    let fileSize = book.fileSize;
    if (bookFile) {
      let nextPath = `/uploads/books/${bookFile.filename}`;
      if (!publicFlag) {
        const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
        safeMoveFile(bookFile.path, dest);
        nextPath = `private/books/${bookFile.filename}`;
      }
      safeUnlink(resolveStoredFilePath(book.filePath));
      filePath = nextPath;
      fileSize =
        typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;
    } else {
      filePath = moveExistingBookFile(book.filePath, publicFlag);
    }

    let coverPath = book.coverPath;
    if (coverFile) {
      safeUnlink(resolveStoredFilePath(book.coverPath));
      coverPath = `/uploads/books/${coverFile.filename}`;
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        title: safeTitle,
        author: pickNullable(author, book.author),
        description: pickNullable(description, book.description),
        category: pickNullable(category, book.category),
        archiveSource:
          archiveSource !== undefined
            ? cleanText(archiveSource)
            : book.archiveSource,
        documentCode:
          documentCode !== undefined
            ? cleanText(documentCode)
            : book.documentCode,
        filePath,
        coverPath,
        fileSize,
        isPublic: publicFlag,
      },
    });

    await logActivity(req.user.id, "books", `Updated book: ${safeTitle}`);
    res.json({ id: updated.id });
  } catch (err) {
    console.error("Update my book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Update failed");
  }
};

const downloadMyBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        filePath: true,
        isPublic: true,
        uploadedBy: true,
      },
    });
    if (!book) return res.status(404).json({ message: "Not found" });

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const filePath = resolveStoredFilePath(book.filePath);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    await prisma.book.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    res.download(filePath, path.basename(filePath));
  } catch (err) {
    console.error("Download my book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Download failed");
  }
};

const deleteMyBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        filePath: true,
        coverPath: true,
        title: true,
        uploadedBy: true,
      },
    });
    if (!book) return res.status(404).json({ message: "Not found" });

    const canManage = req.user.permissions.includes("manage_books");
    if (!canManage && Number(book.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.book.delete({ where: { id } });
    safeUnlink(resolveStoredFilePath(book.filePath));
    safeUnlink(resolveStoredFilePath(book.coverPath));

    await logActivity(
      req.user.id,
      "books",
      `Deleted book: ${book.title || id}`,
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete my book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Delete failed");
  }
};

const listAdminBooks = async (_req, res) => {
  try {
    const rows = await prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploader: { select: { fullName: true } } },
    });
    res.json(rows.map(mapAdminBook));
  } catch (err) {
    console.error("Failed to load admin books:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load books");
  }
};

const getAdminBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      include: { uploader: { select: { fullName: true } } },
    });
    if (!book) return res.status(404).json({ message: "Not found" });

    res.json(mapAdminBook(book));
  } catch (err) {
    console.error("Failed to load admin book:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load book");
  }
};

const createAdminBook = async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      category,
      archiveSource,
      documentCode,
      isPublic,
    } = req.body;
    const bookFile = req.files?.file?.[0];
    const coverFile = req.files?.cover?.[0];
    const safeTitle = cleanText(title);
    if (!safeTitle || !bookFile) {
      return res.status(400).json({ message: "Title and file are required" });
    }
    if (!coverFile) {
      return res.status(400).json({ message: "Cover image is required" });
    }

    const publicFlag = parseBoolean(isPublic, true);
    let filePath = `/uploads/books/${bookFile.filename}`;
    if (!publicFlag) {
      const src = path.join(BOOK_UPLOADS_DIR, bookFile.filename);
      const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
      safeMoveFile(src, dest);
      filePath = `private/books/${bookFile.filename}`;
    }
    const coverPath = `/uploads/books/${coverFile.filename}`;

    const fileSize =
      typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;

    const created = await prisma.book.create({
      data: {
        title: safeTitle,
        author: cleanText(author),
        description: cleanText(description),
        category: cleanText(category),
        archiveSource: cleanText(archiveSource),
        documentCode: cleanText(documentCode),
        filePath,
        coverPath,
        fileSize,
        uploadedBy: req.user.id,
        isPublic: publicFlag,
      },
    });

    await logActivity(req.user.id, "books", `Uploaded book: ${safeTitle}`);
    res.status(201).json({ id: created.id });
  } catch (err) {
    console.error("Upload book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Upload failed");
  }
};

const updateAdminBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        archiveSource: true,
        documentCode: true,
        filePath: true,
        coverPath: true,
        fileSize: true,
        isPublic: true,
      },
    });
    if (!book) return res.status(404).json({ message: "Not found" });

    const {
      title,
      author,
      description,
      category,
      archiveSource,
      documentCode,
      isPublic,
    } = req.body || {};
    const safeTitle =
      title !== undefined && title !== null ? cleanText(title) : book.title;
    if (!safeTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    const publicFlag =
      isPublic !== undefined && isPublic !== null
        ? parseBoolean(isPublic, !!book.isPublic)
        : !!book.isPublic;

    const bookFile = req.files?.file?.[0];
    const coverFile = req.files?.cover?.[0];

    let filePath = book.filePath;
    let fileSize = book.fileSize;
    if (bookFile) {
      let nextPath = `/uploads/books/${bookFile.filename}`;
      if (!publicFlag) {
        const dest = path.join(PRIVATE_BOOK_UPLOADS_DIR, bookFile.filename);
        safeMoveFile(bookFile.path, dest);
        nextPath = `private/books/${bookFile.filename}`;
      }
      safeUnlink(resolveStoredFilePath(book.filePath));
      filePath = nextPath;
      fileSize =
        typeof bookFile.size === "number" ? BigInt(bookFile.size) : null;
    } else {
      filePath = moveExistingBookFile(book.filePath, publicFlag);
    }

    let coverPath = book.coverPath;
    if (coverFile) {
      safeUnlink(resolveStoredFilePath(book.coverPath));
      coverPath = `/uploads/books/${coverFile.filename}`;
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        title: safeTitle,
        author: pickNullable(author, book.author),
        description: pickNullable(description, book.description),
        category: pickNullable(category, book.category),
        archiveSource:
          archiveSource !== undefined
            ? cleanText(archiveSource)
            : book.archiveSource,
        documentCode:
          documentCode !== undefined
            ? cleanText(documentCode)
            : book.documentCode,
        filePath,
        coverPath,
        fileSize,
        isPublic: publicFlag,
      },
    });

    await logActivity(req.user.id, "books", `Updated book: ${safeTitle}`);
    res.json({ id: updated.id });
  } catch (err) {
    console.error("Update book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Update failed");
  }
};

const deleteAdminBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await prisma.book.findUnique({
      where: { id },
      select: { filePath: true, coverPath: true, title: true },
    });
    if (!book) return res.status(404).json({ message: "Not found" });

    await prisma.book.delete({ where: { id } });
    safeUnlink(resolveStoredFilePath(book.filePath));
    safeUnlink(resolveStoredFilePath(book.coverPath));

    await logActivity(
      req.user.id,
      "books",
      `Deleted book: ${book.title || id}`,
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete book failed:", err.code || "", err.message);
    return respondWithError(res, err, "Delete failed");
  }
};

const saveMyBook = async (req, res) => updateMyBook(req, res);
const saveAdminBook = async (req, res) => updateAdminBook(req, res);

module.exports = {
  bookUpload,
  listPublicBooks,
  getPublicBook,
  downloadPublicBook,
  listMyBooks,
  getMyBook,
  createMyBook,
  updateMyBook,
  saveMyBook,
  downloadMyBook,
  deleteMyBook,
  listAdminBooks,
  getAdminBook,
  createAdminBook,
  updateAdminBook,
  saveAdminBook,
  deleteAdminBook,
};
