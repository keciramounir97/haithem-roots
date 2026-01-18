import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Archive,
  BookOpen,
  Calendar,
  Download,
  Eye,
  Filter,
  FileText,
  Image as ImageIcon,
  MapPin,
  Search,
  Trees,
  Users,
  X,
} from "lucide-react";
import { api } from "../api/client";
import { getApiErrorMessage, getApiRoot } from "../api/helpers";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";
import TreesBuilder, { parseGedcom } from "../admin/components/TreesBuilder";
import ErrorBoundary from "../components/ErrorBoundary";

const sortByDateDesc = (items) =>
  [...items].sort((a, b) => {
    const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(n) / Math.log(1024)),
    units.length - 1,
  );
  const v = n / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

export default function Gallery() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const location = useLocation();

  const [trees, setTrees] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all, trees, images, books
  const [treeFilter, setTreeFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewTree, setViewTree] = useState(null);
  const [viewPeople, setViewPeople] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);

  const apiRoot = useMemo(() => getApiRoot(), []);

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get("q");
    setQuery(qParam || "");
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [treesRes, galleryRes, booksRes] = await Promise.allSettled([
          api.get("/trees"),
          api.get("/gallery").catch(() => ({ data: { gallery: [] } })),
          api.get("/books").catch(() => ({ data: [] })),
        ]);

        if (!mounted) return;

        let nextTrees =
          treesRes.status === "fulfilled" && Array.isArray(treesRes.value?.data)
            ? treesRes.value.data
            : [];

        let nextGallery = [];
        if (galleryRes.status === "fulfilled") {
          const galleryData = galleryRes.value?.data;
          if (galleryData?.gallery && Array.isArray(galleryData.gallery)) {
            nextGallery = galleryData.gallery;
          } else if (Array.isArray(galleryData)) {
            nextGallery = galleryData;
          }
        }

        let nextBooks = [];
        if (booksRes.status === "fulfilled") {
          const booksData = booksRes.value?.data;
          if (booksData?.data && Array.isArray(booksData.data)) {
            nextBooks = booksData.data;
          } else if (Array.isArray(booksData)) {
            nextBooks = booksData;
          }
        }

        setTrees(nextTrees);
        setGallery(nextGallery);
        setBooks(nextBooks);
      } catch (err) {
        if (!mounted) return;
        const message = getApiErrorMessage(err, "Failed to load gallery");
        setError(message);
        setTrees([]);
        setGallery([]);
        setBooks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const fileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const downloadTreeUrl = (id) => {
    return `${apiRoot}/api/trees/${id}/gedcom`;
  };

  const downloadBookUrl = (id) => {
    return `${apiRoot}/api/books/${id}/download`;
  };

  const filteredTrees = useMemo(() => {
    let result = trees;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (tree) =>
          tree.title?.toLowerCase().includes(q) ||
          tree.description?.toLowerCase().includes(q) ||
          tree.archiveSource?.toLowerCase().includes(q) ||
          tree.documentCode?.toLowerCase().includes(q) ||
          tree.owner?.toLowerCase().includes(q),
      );
    }

    if (treeFilter === "with-gedcom") {
      result = result.filter((tree) => tree.hasGedcom);
    }

    return sortByDateDesc(result);
  }, [trees, query, treeFilter]);

  const filteredGallery = useMemo(() => {
    let result = gallery;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.archiveSource?.toLowerCase().includes(q) ||
          item.documentCode?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q),
      );
    }

    return sortByDateDesc(result);
  }, [gallery, query]);

  const filteredBooks = useMemo(() => {
    let result = books;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (book) =>
          book.title?.toLowerCase().includes(q) ||
          book.author?.toLowerCase().includes(q) ||
          book.description?.toLowerCase().includes(q) ||
          book.category?.toLowerCase().includes(q),
      );
    }

    return sortByDateDesc(result);
  }, [books, query]);

  const showTrees = typeFilter === "all" || typeFilter === "trees";
  const showImages = typeFilter === "all" || typeFilter === "images";
  const showBooks = typeFilter === "all" || typeFilter === "books";

  const latestTree = useMemo(() => sortByDateDesc(trees)[0] || null, [trees]);
  const latestImage = useMemo(
    () => sortByDateDesc(gallery)[0] || null,
    [gallery],
  );
  const latestBook = useMemo(() => sortByDateDesc(books)[0] || null, [books]);

  const handleViewTree = async (tree) => {
    setViewTree(tree);
    setViewPeople([]);
    setViewLoading(true);

    try {
      if (!tree.hasGedcom || !tree.gedcomUrl) {
        setViewPeople([]);
        return;
      }

      const gedcomUrl = fileUrl(tree.gedcomUrl);
      const response = await fetch(gedcomUrl);
      const text = await response.text();
      const people = parseGedcom(text);
      setViewPeople(people);
    } catch (err) {
      setViewPeople([]);
    } finally {
      setViewLoading(false);
    }
  };

  const isDark = theme === "dark";
  const borderColor = isDark ? "border-white/10" : "border-[#d8c7b0]/60";
  const cardBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const metaPanel = isDark
    ? "bg-white/5 border-white/10"
    : "bg-[#5d4037]/5 border-[#d8c7b0]/60";

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-[#d4af37]">
            {t("gallery", "Gallery")}
          </p>
          <h1 className="text-5xl font-bold">
            {t("gallery_title", "North African Genealogy Gallery")}
          </h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            {t(
              "gallery_intro",
              "Explore family trees, archival images, and books from North Africa.",
            )}
          </p>
        </div>
      }
    >
      <section className="roots-section roots-section-alt" data-aos="fade-up">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4">
            {t("search_gallery", "Search the gallery")}
          </h2>
          <div
            className={`grid gap-4 md:grid-cols-[2fr_1fr_1fr] items-center p-6 rounded-xl border ${borderColor}`}
          >
            <div className="relative">
              <Search className="absolute left-3 top-3 text-[#5d4037] opacity-80 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  "search_gallery_placeholder",
                  "Search trees, images, books...",
                )}
                className={`w-full pl-10 py-3 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-[#5d4037]" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`w-full px-4 py-3 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              >
                <option value="all">{t("all_content", "All content")}</option>
                <option value="trees">{t("trees", "Family Trees")}</option>
                <option value="images">{t("images", "Images")}</option>
                <option value="books">{t("books", "Books")}</option>
              </select>
            </div>
            {showTrees && (
              <div className="flex items-center gap-3">
                <Trees className="w-5 h-5 text-[#5d4037]" />
                <select
                  value={treeFilter}
                  onChange={(e) => setTreeFilter(e.target.value)}
                  className={`w-full px-4 py-3 rounded-md bg-transparent border ${borderColor} outline-none ${
                    theme === "dark" ? "text-white" : "text-[#2c1810]"
                  }`}
                >
                  <option value="all">{t("all_trees", "All Trees")}</option>
                  <option value="with-gedcom">
                    {t("with_gedcom", "With GEDCOM file")}
                  </option>
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="roots-section" data-aos="fade-up">
        <div className="grid md:grid-cols-3 gap-6">
          <div
            className={`${cardBg} p-6 rounded-2xl shadow-lg border ${borderColor}`}
          >
            <Trees className="w-8 h-8 text-[#d4af37] mb-4" />
            <p className="text-sm uppercase tracking-[0.2em] text-[#5d4037] mb-2">
              {t("latest_tree", "Latest tree")}
            </p>
            {latestTree ? (
              <>
                <h3 className="text-xl font-bold">{latestTree.title}</h3>
                <p className="text-sm opacity-80 mt-1">
                  {latestTree.owner || t("unknown", "Unknown")}
                </p>
                {latestTree.archiveSource && (
                  <p className="text-xs opacity-70 mt-2">
                    <Archive className="w-3 h-3 inline mr-1" />
                    {latestTree.archiveSource}
                  </p>
                )}
              </>
            ) : (
              <p className="opacity-70">
                {t("no_trees_found", "No trees found.")}
              </p>
            )}
          </div>

          <div
            className={`${cardBg} p-6 rounded-2xl shadow-lg border ${borderColor}`}
          >
            <ImageIcon className="w-8 h-8 text-[#d4af37] mb-4" />
            <p className="text-sm uppercase tracking-[0.2em] text-[#5d4037] mb-2">
              {t("latest_image", "Latest image")}
            </p>
            {latestImage ? (
              <>
                <h3 className="text-xl font-bold">{latestImage.title}</h3>
                {latestImage.archiveSource && (
                  <p className="text-xs opacity-70 mt-2">
                    <Archive className="w-3 h-3 inline mr-1" />
                    {latestImage.archiveSource}
                  </p>
                )}
              </>
            ) : (
              <p className="opacity-70">
                {t("no_images_found", "No images found.")}
              </p>
            )}
          </div>

          <div
            className={`${cardBg} p-6 rounded-2xl shadow-lg border ${borderColor}`}
          >
            <BookOpen className="w-8 h-8 text-[#d4af37] mb-4" />
            <p className="text-sm uppercase tracking-[0.2em] text-[#5d4037] mb-2">
              {t("latest_book", "Latest book")}
            </p>
            {latestBook ? (
              <>
                <h3 className="text-xl font-bold">{latestBook.title}</h3>
                <p className="text-sm opacity-80 mt-1">
                  {latestBook.author || t("unknown", "Unknown")}
                </p>
              </>
            ) : (
              <p className="opacity-70">
                {t("no_books_found", "No books found.")}
              </p>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="roots-section">
          <div className="text-center opacity-70">
            {t("loading", "Loading...")}
          </div>
        </section>
      ) : error ? (
        <section className="roots-section">
          <div className="text-center text-red-500 font-semibold">{error}</div>
        </section>
      ) : null}

      {showTrees && !loading && !error && (
        <section className="roots-section" data-aos="fade-up">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-6">
            {t("trees", "Family Trees")} ({filteredTrees.length})
          </h2>
          {filteredTrees.length === 0 ? (
            <div
              className={`${cardBg} p-8 rounded-xl shadow-xl border ${borderColor} text-center opacity-70`}
            >
              {t("no_trees_found", "No trees found.")}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {filteredTrees.map((tree) => {
                const canDownload =
                  Number.isFinite(Number(tree.id)) && tree.hasGedcom;
                return (
                  <div
                    key={tree.id}
                    className={`${cardBg} border ${borderColor} rounded-2xl shadow-xl overflow-hidden`}
                    data-aos="fade-up"
                  >
                    <div className="p-5 border-b border-white/5 bg-gradient-to-r from-[#5d4037]/10 to-transparent">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-[#5d4037] opacity-70">
                            {t("trees", "Family Trees")}
                          </p>
                          <h3 className="text-2xl font-bold truncate">
                            {tree.title}
                          </h3>
                          <p className="text-sm opacity-70">
                            {tree.owner || t("unknown", "Unknown")}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${borderColor}`}
                        >
                          {tree.isPublic
                            ? t("public", "Public")
                            : t("private", "Private")}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <p className="text-sm opacity-80">
                        {tree.description ||
                          t("no_description", "No description.")}
                      </p>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div
                          className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                        >
                          <Archive className="w-4 h-4 text-[#d4af37] mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase opacity-60">
                              {t("archive_source", "Archive Source")}
                            </p>
                            <p className="text-xs font-semibold break-words">
                              {tree.archiveSource ||
                                t("not_provided", "Not provided")}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                        >
                          <FileText className="w-4 h-4 text-[#d4af37] mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase opacity-60">
                              {t("document_code", "Document Code")}
                            </p>
                            <p className="text-xs font-semibold font-mono break-words">
                              {tree.documentCode ||
                                t("not_provided", "Not provided")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewTree(tree)}
                          className={`px-4 py-2 rounded-md border ${borderColor} hover:opacity-90 inline-flex items-center gap-2`}
                        >
                          <Eye className="w-4 h-4" />
                          {t("view_tree", "View Tree")}
                        </button>
                        {canDownload ? (
                          <a
                            href={downloadTreeUrl(tree.id)}
                            className="px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="w-4 h-4" />
                            {t("download_gedcom", "Download GEDCOM")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {showImages && !loading && !error && (
        <section className="roots-section roots-section-alt" data-aos="fade-up">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-6">
            {t("images", "Images")} ({filteredGallery.length})
          </h2>
          {filteredGallery.length === 0 ? (
            <div
              className={`${cardBg} p-8 rounded-xl shadow-xl border ${borderColor} text-center opacity-70`}
            >
              {t("no_images_found", "No images found.")}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGallery.map((item) => {
                const imageSrc = item.imagePath ? fileUrl(item.imagePath) : "";
                return (
                  <div
                    key={item.id}
                    className={`${cardBg} border ${borderColor} rounded-2xl overflow-hidden shadow-xl group cursor-pointer`}
                    data-aos="zoom-in"
                    onClick={() => setSelectedImage(item)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#5d4037]/10 to-[#d4af37]/10">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#5d4037] opacity-60">
                          <ImageIcon className="w-14 h-14" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />
                      <div className="absolute left-4 bottom-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                          {t("images", "Images")}
                        </p>
                        <h3 className="text-lg font-bold text-white line-clamp-2">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <p className="text-sm opacity-80 line-clamp-2">
                        {item.description ||
                          t("no_description", "No description.")}
                      </p>

                      {(item.archiveSource || item.documentCode) && (
                        <div className="grid sm:grid-cols-2 gap-2">
                          {item.archiveSource && (
                            <div
                              className={`${metaPanel} border rounded-lg p-2`}
                            >
                              <p className="text-[10px] uppercase opacity-60">
                                {t("archive_source", "Archive Source")}
                              </p>
                              <p className="text-xs font-semibold break-words">
                                {item.archiveSource}
                              </p>
                            </div>
                          )}
                          {item.documentCode && (
                            <div
                              className={`${metaPanel} border rounded-lg p-2`}
                            >
                              <p className="text-[10px] uppercase opacity-60">
                                {t("document_code", "Document Code")}
                              </p>
                              <p className="text-xs font-semibold font-mono break-words">
                                {item.documentCode}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {showBooks && !loading && !error && (
        <section className="roots-section" data-aos="fade-up">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-6">
            {t("books", "Books")} ({filteredBooks.length})
          </h2>
          {filteredBooks.length === 0 ? (
            <div
              className={`${cardBg} p-8 rounded-xl shadow-xl border ${borderColor} text-center opacity-70`}
            >
              {t("no_books_found", "No books found.")}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredBooks.map((book) => {
                const coverSrc = book.coverUrl ? fileUrl(book.coverUrl) : "";
                return (
                  <div
                    key={book.id}
                    className={`${cardBg} border ${borderColor} rounded-2xl overflow-hidden shadow-xl group transition hover:-translate-y-1`}
                    data-aos="zoom-in"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#5d4037]/15 to-[#d4af37]/10">
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#5d4037] opacity-60">
                          <BookOpen className="w-14 h-14" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />
                      <div className="absolute left-4 bottom-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                          {t("books", "Books")}
                        </p>
                        <h3 className="text-lg font-bold text-white line-clamp-2">
                          {book.title}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {book.author || t("unknown", "Unknown")}
                          </p>
                          {book.category && (
                            <p className="text-xs opacity-70 truncate">
                              {book.category}
                            </p>
                          )}
                        </div>
                        <BookOpen className="w-5 h-5 text-[#d4af37]" />
                      </div>

                      <p className="text-sm opacity-80 line-clamp-3">
                        {book.description ||
                          t("no_description", "No description.")}
                      </p>

                      {(book.archiveSource || book.documentCode) && (
                        <div className="grid sm:grid-cols-2 gap-2 mt-3 mb-3">
                          {book.archiveSource && (
                            <div
                              className={`${metaPanel} border rounded-lg p-2`}
                            >
                              <p className="text-[10px] uppercase opacity-60">
                                {t("archive_source", "Archive Source")}
                              </p>
                              <p className="text-xs font-semibold break-words">
                                {book.archiveSource}
                              </p>
                            </div>
                          )}
                          {book.documentCode && (
                            <div
                              className={`${metaPanel} border rounded-lg p-2`}
                            >
                              <p className="text-[10px] uppercase opacity-60">
                                {t("document_code", "Document Code")}
                              </p>
                              <p className="text-xs font-semibold font-mono break-words">
                                {book.documentCode}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        {book.fileSize ? (
                          <span
                            className={`${metaPanel} border rounded-full px-3 py-1`}
                          >
                            {formatBytes(book.fileSize)}
                          </span>
                        ) : null}
                        {typeof book.downloads === "number" ? (
                          <span
                            className={`${metaPanel} border rounded-full px-3 py-1`}
                          >
                            {t("downloads_label", "Downloads")}:{" "}
                            {book.downloads}
                          </span>
                        ) : null}
                      </div>

                      <div className="pt-2 flex flex-wrap gap-2">
                        {Number.isFinite(Number(book.id)) ? (
                          <a
                            href={downloadBookUrl(book.id)}
                            className="px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="w-4 h-4" />
                            {t("download", "Download")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className={`${cardBg} max-w-4xl max-h-[90vh] rounded-2xl border ${borderColor} shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              <img
                src={fileUrl(selectedImage.imagePath)}
                alt={selectedImage.title}
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="text-2xl font-bold">{selectedImage.title}</h3>
              {selectedImage.description && (
                <p className="text-sm opacity-80">
                  {selectedImage.description}
                </p>
              )}
              {(selectedImage.archiveSource || selectedImage.documentCode) && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {selectedImage.archiveSource && (
                    <div className={`${metaPanel} border rounded-xl p-3`}>
                      <p className="text-[10px] uppercase opacity-60 mb-1">
                        {t("archive_source", "Archive Source")}
                      </p>
                      <p className="text-sm font-semibold">
                        {selectedImage.archiveSource}
                      </p>
                    </div>
                  )}
                  {selectedImage.documentCode && (
                    <div className={`${metaPanel} border rounded-xl p-3`}>
                      <p className="text-[10px] uppercase opacity-60 mb-1">
                        {t("document_code", "Document Code")}
                      </p>
                      <p className="text-sm font-semibold font-mono">
                        {selectedImage.documentCode}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewTree && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setViewTree(null);
            setViewPeople([]);
          }}
        >
          <ErrorBoundary>
            <div
              className={`${cardBg} w-full max-w-[92vw] h-[calc(90vh-6rem)] mt-16 rounded-2xl border ${borderColor} shadow-2xl flex flex-col overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/5">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Trees className="w-5 h-5 text-[#d4af37]" />
                    {viewTree.title}
                  </h2>
                  <p className="text-xs opacity-60">
                    {t("viewing_mode", "Viewing Mode - Read Only")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {Number.isFinite(Number(viewTree.id)) &&
                  viewTree.hasGedcom ? (
                    <a
                      href={downloadTreeUrl(viewTree.id)}
                      className="px-3 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2 text-sm"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      {t("download_gedcom", "Download GEDCOM")}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setViewTree(null);
                      setViewPeople([]);
                    }}
                    className="p-2 rounded-full hover:bg-black/10 transition"
                    aria-label={t("close", "Close")}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 relative bg-black/5 overflow-hidden">
                {viewLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center opacity-70">
                      {t("loading", "Loading...")}
                    </div>
                  </div>
                ) : (
                  <TreesBuilder
                    tree={viewTree}
                    people={viewPeople}
                    readOnly={true}
                  />
                )}
              </div>
            </div>
          </ErrorBoundary>
        </div>
      )}
    </RootsPageShell>
  );
}
