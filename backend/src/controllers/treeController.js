const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { prisma } = require("../lib/prisma");
const { logActivity } = require("../services/activityService");
const {
  TREE_UPLOADS_DIR,
  PRIVATE_TREE_UPLOADS_DIR,
  resolveStoredFilePath,
  safeUnlink,
  safeMoveFile,
} = require("../utils/files");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");

const treeUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, TREE_UPLOADS_DIR);
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

const parseBoolean = (value, fallback = false) => {
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

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.roleId === 1) return true;
  return String(user.roleName || "").toLowerCase() === "admin";
};

const hasPermission = (user, permission) => {
  if (isAdminUser(user)) return true;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes(permission);
};

const normalizeGedcomName = (raw) => {
  const cleaned = String(raw || "")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
};

const parseGedcomPeople = (text) => {
  const lines = String(text || "").split(/\r\n|\n|\r/);
  const people = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    let name = current.name;
    if (!name) {
      const given = normalizeGedcomName(current.given);
      const surname = normalizeGedcomName(current.surname);
      const combined = [given, surname].filter(Boolean).join(" ").trim();
      name = combined || null;
    }
    if (name) people.push({ name });
    current = null;
  };

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts[0] === "0") {
      if (/^0\s+@[^@]+@\s+INDI\b/i.test(line) || /^0\s+INDI\b/i.test(line)) {
        flush();
        current = { name: null, given: "", surname: "" };
      } else {
        flush();
        current = null;
      }
      continue;
    }

    if (!current) continue;
    const tag = String(parts[1] || "").toUpperCase();
    const value = parts.slice(2).join(" ").trim();
    if (tag === "NAME") current.name = normalizeGedcomName(value);
    if (tag === "GIVN") current.given = value;
    if (tag === "SURN") current.surname = value;
  }

  flush();
  return people;
};

const rebuildTreePeople = async (treeId, gedcomPath) => {
  if (!treeId) return;
  try {
    const filePath = resolveStoredFilePath(gedcomPath);
    if (!filePath || !fs.existsSync(filePath)) {
      await prisma.person.deleteMany({ where: { treeId } });
      return;
    }

    let people = [];
    try {
      const content = fs.readFileSync(filePath, "utf8");
      people = parseGedcomPeople(content);
    } catch {
      people = [];
    }

    await prisma.person.deleteMany({ where: { treeId } });
    if (!people.length) return;

    const chunkSize = 500;
    for (let i = 0; i < people.length; i += chunkSize) {
      const data = people.slice(i, i + chunkSize).map((p) => ({
        treeId,
        name: p.name,
      }));
      await prisma.person.createMany({ data });
    }
  } catch (err) {
    console.error("Failed to rebuild tree people:", err?.message || err);
  }
};

const moveExistingGedcom = (currentPath, makePublic) => {
  if (!currentPath) return currentPath;
  if (makePublic && String(currentPath).startsWith("/uploads/"))
    return currentPath;
  if (!makePublic && String(currentPath).startsWith("private/"))
    return currentPath;

  const resolved = resolveStoredFilePath(currentPath);
  if (!resolved || !fs.existsSync(resolved)) return currentPath;

  const filename = path.basename(resolved);
  if (makePublic) {
    const dest = path.join(TREE_UPLOADS_DIR, filename);
    safeMoveFile(resolved, dest);
    return `/uploads/trees/${filename}`;
  }

  const dest = path.join(PRIVATE_TREE_UPLOADS_DIR, filename);
  safeMoveFile(resolved, dest);
  return `private/trees/${filename}`;
};

const respondWithError = (res, err, message) => {
  const dbError = getDatabaseErrorResponse(err);
  if (dbError) {
    return res.status(dbError.status).json({ message: dbError.message });
  }
  return res.status(500).json({ message });
};

const mapAdminTree = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  archiveSource: t.archiveSource || "",
  documentCode: t.documentCode || "",
  isPublic: !!t.isPublic,
  hasGedcom: !!t.gedcomPath,
  members: Number(t._count?.people || 0),
  owner: {
    id: t.owner?.id,
    fullName: t.owner?.fullName,
    email: t.owner?.email,
  },
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const mapPublicTree = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  archiveSource: t.archiveSource || "",
  documentCode: t.documentCode || "",
  isPublic: !!t.isPublic,
  owner: t.owner?.fullName || "Unknown",
  hasGedcom: !!t.gedcomPath,
  gedcomUrl: String(t.gedcomPath || "").startsWith("/uploads/")
    ? t.gedcomPath
    : null,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const mapMyTree = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  archiveSource: t.archiveSource || "",
  documentCode: t.documentCode || "",
  hasGedcom: !!t.gedcomPath,
  gedcomUrl: String(t.gedcomPath || "").startsWith("/uploads/")
    ? t.gedcomPath
    : null,
  isPublic: !!t.isPublic,
  members: Number(t._count?.people || 0),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const listAdminTrees = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const rows = await prisma.familyTree.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: { select: { people: true } },
      },
    });

    res.json(rows.map(mapAdminTree));
  } catch (err) {
    console.error("Failed to load admin trees:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load trees");
  }
};

const listPublicTrees = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const rows = await prisma.familyTree.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { fullName: true } } },
    });
    res.json(rows.map(mapPublicTree));
  } catch (err) {
    console.error("Failed to load trees:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load trees");
  }
};

const getPublicTree = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tree id" });

    const tree = await prisma.familyTree.findUnique({
      where: { id },
      include: { owner: { select: { fullName: true } } },
    });
    if (!tree) return res.status(404).json({ message: "Not found" });
    if (!tree.isPublic) return res.status(403).json({ message: "Forbidden" });

    res.json(mapPublicTree(tree));
  } catch (err) {
    console.error("Failed to load tree:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load tree");
  }
};

const downloadPublicGedcom = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tree id" });

    const tree = await prisma.familyTree.findUnique({
      where: { id },
      select: { id: true, isPublic: true, gedcomPath: true },
    });
    if (!tree) return res.status(404).json({ message: "Not found" });

    if (!tree.isPublic) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const filePath = resolveStoredFilePath(tree.gedcomPath);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.type("text/plain");
    res.sendFile(filePath);
  } catch (err) {
    console.error(
      "Download public gedcom failed:",
      err.code || "",
      err.message
    );
    return respondWithError(res, err, "Download failed");
  }
};

const listMyTrees = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const rows = await prisma.familyTree.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { people: true } } },
    });

    res.json(rows.map(mapMyTree));
  } catch (err) {
    console.error("Failed to load my trees:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load trees");
  }
};

const getMyTree = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tree id" });

    const tree = await prisma.familyTree.findUnique({
      where: { id },
      include: { _count: { select: { people: true } } },
    });
    if (!tree) return res.status(404).json({ message: "Not found" });

    const canManageAll = hasPermission(req.user, "manage_all_trees");
    if (!canManageAll && Number(tree.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(mapMyTree(tree));
  } catch (err) {
    console.error("Failed to load my tree:", err.code || "", err.message);
    return respondWithError(res, err, "Failed to load tree");
  }
};

const createMyTree = async (req, res) => {
  try {
    const { title, description, isPublic, archiveSource, documentCode } =
      req.body || {};
    const safeTitle = cleanText(title);
    if (!safeTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    const publicFlag = parseBoolean(isPublic, false);

    let gedcomPath = req.file ? `/uploads/trees/${req.file.filename}` : null;
    if (req.file && !publicFlag) {
      const src = path.join(TREE_UPLOADS_DIR, req.file.filename);
      const dest = path.join(PRIVATE_TREE_UPLOADS_DIR, req.file.filename);
      safeMoveFile(src, dest);
      gedcomPath = `private/trees/${req.file.filename}`;
    }

    const created = await prisma.familyTree.create({
      data: {
        userId: req.user.id,
        title: safeTitle,
        description: cleanText(description),
        gedcomPath,
        archiveSource: cleanText(archiveSource),
        documentCode: cleanText(documentCode),
        isPublic: publicFlag,
      },
    });

    if (gedcomPath) {
      await rebuildTreePeople(created.id, gedcomPath);
    }

    await logActivity(req.user.id, "trees", `Created tree: ${safeTitle}`);
    res.status(201).json({ id: created.id });
  } catch (err) {
    console.error("Create tree failed:", err.code || "", err.message);
    return respondWithError(res, err, "Create tree failed");
  }
};

const updateMyTree = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tree id" });

    const tree = await prisma.familyTree.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        gedcomPath: true,
        isPublic: true,
        archiveSource: true,
        documentCode: true,
      },
    });
    if (!tree) return res.status(404).json({ message: "Not found" });

    const canManageAll = hasPermission(req.user, "manage_all_trees");
    if (!canManageAll && Number(tree.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { title, description, isPublic, archiveSource, documentCode } =
      req.body || {};
    const nextTitle =
      title !== undefined && title !== null ? cleanText(title) : tree.title;
    if (!nextTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    const nextDescription =
      description !== undefined && description !== null
        ? cleanText(description)
        : tree.description || null;
    const publicFlag =
      isPublic !== undefined && isPublic !== null
        ? parseBoolean(isPublic, !!tree.isPublic)
        : !!tree.isPublic;

    let gedcomPath = tree.gedcomPath || null;
    if (req.file) {
      let nextPath = `/uploads/trees/${req.file.filename}`;
      if (!publicFlag) {
        const dest = path.join(PRIVATE_TREE_UPLOADS_DIR, req.file.filename);
        safeMoveFile(req.file.path, dest);
        nextPath = `private/trees/${req.file.filename}`;
      }
      if (tree.gedcomPath) {
        const oldPath = resolveStoredFilePath(tree.gedcomPath);
        const newPath = resolveStoredFilePath(nextPath);
        if (oldPath && newPath && oldPath !== newPath) {
          safeUnlink(oldPath);
        }
      }
      gedcomPath = nextPath;
    } else if (tree.gedcomPath) {
      gedcomPath = moveExistingGedcom(tree.gedcomPath, publicFlag);
    }

    const updated = await prisma.familyTree.update({
      where: { id },
      data: {
        title: nextTitle,
        description: nextDescription || null,
        archiveSource:
          archiveSource !== undefined
            ? cleanText(archiveSource)
            : tree.archiveSource,
        documentCode:
          documentCode !== undefined
            ? cleanText(documentCode)
            : tree.documentCode,
        isPublic: publicFlag,
        gedcomPath,
      },
    });

    if (req.file) {
      await rebuildTreePeople(updated.id, gedcomPath);
    }

    await logActivity(req.user.id, "trees", `Updated tree: ${nextTitle}`);
    res.json({ id: updated.id });
  } catch (err) {
    console.error("Update tree failed:", err.code || "", err.message);
    return respondWithError(res, err, "Update tree failed");
  }
};

const deleteMyTree = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tree id" });

    const tree = await prisma.familyTree.findUnique({
      where: { id },
      select: { id: true, userId: true, title: true, gedcomPath: true },
    });
    if (!tree) return res.status(404).json({ message: "Not found" });

    const canManageAll = hasPermission(req.user, "manage_all_trees");
    if (!canManageAll && Number(tree.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.person.deleteMany({ where: { treeId: id } });
    await prisma.familyTree.delete({ where: { id } });

    safeUnlink(resolveStoredFilePath(tree.gedcomPath));

    await logActivity(
      req.user.id,
      "trees",
      `Deleted tree: ${tree.title || id}`
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete tree failed:", err.code || "", err.message);
    return respondWithError(res, err, "Delete tree failed");
  }
};

const downloadMyGedcom = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tree id" });

    const tree = await prisma.familyTree.findUnique({
      where: { id },
      select: { id: true, userId: true, gedcomPath: true },
    });
    if (!tree) return res.status(404).json({ message: "Not found" });

    const canManageAll = hasPermission(req.user, "manage_all_trees");
    if (!canManageAll && Number(tree.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const filePath = resolveStoredFilePath(tree.gedcomPath);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.type("text/plain");
    res.sendFile(filePath);
  } catch (err) {
    console.error("Download my gedcom failed:", err.code || "", err.message);
    return respondWithError(res, err, "Download failed");
  }
};

const saveMyTree = async (req, res) => updateMyTree(req, res);

module.exports = {
  treeUpload,
  listAdminTrees,
  listPublicTrees,
  getPublicTree,
  downloadPublicGedcom,
  listMyTrees,
  getMyTree,
  createMyTree,
  updateMyTree,
  saveMyTree,
  deleteMyTree,
  downloadMyGedcom,
};
