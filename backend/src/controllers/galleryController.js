const multer = require("multer");
const path = require("path");
const { prisma } = require("../lib/prisma");
const {
  GALLERY_UPLOADS_DIR,
  resolveStoredFilePath,
  safeUnlink,
} = require("../utils/files");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");

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

const respondWithError = (res, err, message, extra) => {
  const dbError = getDatabaseErrorResponse(err);
  if (dbError) {
    return res.status(dbError.status).json({ message: dbError.message });
  }
  const payload = { message };
  if (extra && typeof extra === "object") {
    Object.assign(payload, extra);
  }
  return res.status(500).json(payload);
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, GALLERY_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `gallery-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// Public: List all public gallery items
const listPublicGallery = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const items = await prisma.gallery.findMany({
      where: { isPublic: true },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ gallery: items });
  } catch (error) {
    console.error("Error fetching public gallery:", error);
    return respondWithError(res, error, "Failed to fetch gallery items");
  }
};

const getPublicGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({
      where: { id },
      include: { uploader: { select: { id: true, fullName: true } } },
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    if (!item.isPublic) return res.status(403).json({ message: "Forbidden" });

    res.json({ item });
  } catch (error) {
    console.error("Error fetching gallery item:", error);
    return respondWithError(res, error, "Failed to fetch gallery item");
  }
};

// User: List my uploaded gallery items
const listMyGallery = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const items = await prisma.gallery.findMany({
      where: { uploadedBy: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ gallery: items });
  } catch (error) {
    console.error("Error fetching my gallery:", error);
    return respondWithError(res, error, "Failed to fetch your gallery items");
  }
};

const getMyGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: "Not found" });
    if (Number(item.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({ item });
  } catch (error) {
    console.error("Error fetching my gallery item:", error);
    return respondWithError(res, error, "Failed to fetch your gallery item");
  }
};

// User: Upload a new gallery item
const createMyGalleryItem = async (req, res) => {
  try {
    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const safeTitle = cleanText(title);
    if (!safeTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    const imagePath = `/uploads/gallery/${req.file.filename}`;

    const item = await prisma.gallery.create({
      data: {
        title: safeTitle,
        description: cleanText(description),
        imagePath,
        uploadedBy: req.user.id,
        isPublic: parseBoolean(isPublic, true),
        archiveSource: cleanText(archiveSource),
        documentCode: cleanText(documentCode),
        location: cleanText(location),
        year: cleanText(year),
        photographer: cleanText(photographer),
      },
    });

    res
      .status(201)
      .json({ message: "Gallery item uploaded successfully", item });
  } catch (error) {
    console.error("Error creating gallery item:", error);
    return respondWithError(res, error, "Failed to upload gallery item", {
      error: error.message,
    });
  }
};

const updateMyGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid gallery id" });

    const existingItem = await prisma.gallery.findUnique({ where: { id } });
    if (!existingItem) {
      return res.status(404).json({ message: "Gallery item not found" });
    }
    if (Number(existingItem.uploadedBy) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    const safeTitle =
      title !== undefined && title !== null ? cleanText(title) : existingItem.title;
    if (!safeTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    let imagePath = existingItem.imagePath;
    if (req.file) {
      safeUnlink(resolveStoredFilePath(existingItem.imagePath));
      imagePath = `/uploads/gallery/${req.file.filename}`;
    }

    const item = await prisma.gallery.update({
      where: { id },
      data: {
        title: safeTitle,
        description: pickNullable(description, existingItem.description),
        imagePath,
        isPublic:
          isPublic !== undefined && isPublic !== null
            ? parseBoolean(isPublic, !!existingItem.isPublic)
            : !!existingItem.isPublic,
        archiveSource: pickNullable(archiveSource, existingItem.archiveSource),
        documentCode: pickNullable(documentCode, existingItem.documentCode),
        location: pickNullable(location, existingItem.location),
        year: pickNullable(year, existingItem.year),
        photographer: pickNullable(photographer, existingItem.photographer),
      },
    });

    res.json({ message: "Gallery item updated successfully", item });
  } catch (error) {
    console.error("Error updating gallery item:", error);
    return respondWithError(res, error, "Failed to update gallery item", {
      error: error.message,
    });
  }
};

// User: Delete my gallery item
const deleteMyGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid gallery id" });

    const item = await prisma.gallery.findFirst({
      where: {
        id,
        uploadedBy: req.user.id,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Gallery item not found" });
    }

    safeUnlink(resolveStoredFilePath(item.imagePath));

    await prisma.gallery.delete({
      where: { id },
    });

    res.json({ message: "Gallery item deleted successfully" });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    return respondWithError(res, error, "Failed to delete gallery item");
  }
};

// Admin: List all gallery items
const listAdminGallery = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const items = await prisma.gallery.findMany({
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ gallery: items });
  } catch (error) {
    console.error("Error fetching admin gallery:", error);
    return respondWithError(res, error, "Failed to fetch gallery items");
  }
};

const getAdminGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({
      where: { id },
      include: { uploader: { select: { id: true, fullName: true, email: true } } },
    });
    if (!item) return res.status(404).json({ message: "Not found" });

    res.json({ item });
  } catch (error) {
    console.error("Error fetching admin gallery item:", error);
    return respondWithError(res, error, "Failed to fetch gallery item");
  }
};

// Admin: Create gallery item
const createAdminGalleryItem = async (req, res) => {
  try {
    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const safeTitle = cleanText(title);
    if (!safeTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    const imagePath = `/uploads/gallery/${req.file.filename}`;

    const item = await prisma.gallery.create({
      data: {
        title: safeTitle,
        description: cleanText(description),
        imagePath,
        uploadedBy: req.user.id,
        isPublic: parseBoolean(isPublic, true),
        archiveSource: cleanText(archiveSource),
        documentCode: cleanText(documentCode),
        location: cleanText(location),
        year: cleanText(year),
        photographer: cleanText(photographer),
      },
    });

    res
      .status(201)
      .json({ message: "Gallery item created successfully", item });
  } catch (error) {
    console.error("Error creating admin gallery item:", error);
    return respondWithError(res, error, "Failed to create gallery item", {
      error: error.message,
    });
  }
};

// Admin: Update gallery item
const updateAdminGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid gallery id" });

    const {
      title,
      description,
      isPublic,
      archiveSource,
      documentCode,
      location,
      year,
      photographer,
    } = req.body;

    const existingItem = await prisma.gallery.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Gallery item not found" });
    }

    const safeTitle =
      title !== undefined && title !== null ? cleanText(title) : existingItem.title;
    if (!safeTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    let imagePath = existingItem.imagePath;
    if (req.file) {
      safeUnlink(resolveStoredFilePath(existingItem.imagePath));
      imagePath = `/uploads/gallery/${req.file.filename}`;
    }

    const item = await prisma.gallery.update({
      where: { id },
      data: {
        title: safeTitle,
        description: pickNullable(description, existingItem.description),
        imagePath,
        isPublic:
          isPublic !== undefined && isPublic !== null
            ? parseBoolean(isPublic, !!existingItem.isPublic)
            : !!existingItem.isPublic,
        archiveSource: pickNullable(archiveSource, existingItem.archiveSource),
        documentCode: pickNullable(documentCode, existingItem.documentCode),
        location: pickNullable(location, existingItem.location),
        year: pickNullable(year, existingItem.year),
        photographer: pickNullable(photographer, existingItem.photographer),
      },
    });

    res.json({ message: "Gallery item updated successfully", item });
  } catch (error) {
    console.error("Error updating admin gallery item:", error);
    return respondWithError(res, error, "Failed to update gallery item", {
      error: error.message,
    });
  }
};

// Admin: Delete any gallery item
const deleteAdminGalleryItem = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid gallery id" });

    const item = await prisma.gallery.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({ message: "Gallery item not found" });
    }

    safeUnlink(resolveStoredFilePath(item.imagePath));

    await prisma.gallery.delete({
      where: { id },
    });

    res.json({ message: "Gallery item deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin gallery item:", error);
    return respondWithError(res, error, "Failed to delete gallery item");
  }
};

const saveMyGalleryItem = async (req, res) => updateMyGalleryItem(req, res);
const saveAdminGalleryItem = async (req, res) => updateAdminGalleryItem(req, res);

module.exports = {
  imageUpload,
  listPublicGallery,
  getPublicGalleryItem,
  listMyGallery,
  getMyGalleryItem,
  createMyGalleryItem,
  updateMyGalleryItem,
  saveMyGalleryItem,
  deleteMyGalleryItem,
  listAdminGallery,
  getAdminGalleryItem,
  createAdminGalleryItem,
  updateAdminGalleryItem,
  saveAdminGalleryItem,
  deleteAdminGalleryItem,
};
