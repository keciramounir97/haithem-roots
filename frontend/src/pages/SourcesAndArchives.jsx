import { useEffect } from "react";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Scroll,
  Landmark,
  Building,
  Map,
  BookOpen,
  FileText,
  Archive,
  ShieldCheck,
  Library,
  Mic,
  Globe,
  Lock,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function SourcesAndArchives() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor = theme === "dark" ? "border-[#2c1810]" : "border-[#d8c7b0]";

  // Archive Types (from Archives page)
  const archiveItems = [
    {
      icon: Scroll,
      title: t("archives_ottoman_title", "Ottoman Archives"),
      accent: "#d4af37",
      description: t(
        "archives_ottoman_desc",
        "Registers from the Beylik, Qadi courts, and administrative diwans preserve pre-colonial lineage records."
      ),
      bullets: [
        t(
          "archives_ottoman_b1",
          "Qadi court registers (marriage, inheritance, guardianship)"
        ),
        t("archives_ottoman_b2", "Habous & waqf property ledgers"),
        t("archives_ottoman_b3", "Beylik taxation and census notes"),
      ],
    },
    {
      icon: Landmark,
      title: t("archives_colonial_title", "Colonial Archives (ANOM)"),
      accent: "#5d4037",
      description: t(
        "archives_colonial_desc",
        "Colonial civil status records provide structured birth, marriage, and death documents."
      ),
      bullets: [
        t(
          "archives_colonial_b1",
          "Surnames fixation records (1882 onward)"
        ),
        t("archives_colonial_b2", "Colonial censuses & conscription rolls"),
        t("archives_colonial_b3", "Land surveys and settlement maps"),
      ],
    },
    {
      icon: Building,
      title: t("archives_apc_title", "Post-Independence APC Records"),
      accent: "#556b2f",
      description: t(
        "archives_apc_desc",
        "Municipal civil status offices hold modern files that bridge families into the present."
      ),
      bullets: [
        t("archives_apc_b1", "Birth/marriage/death registers"),
        t("archives_apc_b2", "Family booklets & ID archives"),
        t("archives_apc_b3", "Municipal migration documentation"),
      ],
    },
    {
      icon: Map,
      title: t("archives_maps_title", "Maps & Territorial Archives"),
      accent: "#d4af37",
      description: t(
        "archives_maps_desc",
        "Historical cartography traces family territories, tribal borders, and migration routes."
      ),
      bullets: [
        t("archives_maps_b1", "Senatus-consulte tribal maps (1863)"),
        t("archives_maps_b2", "Ottoman land surveys"),
        t("archives_maps_b3", "Colonial cadastral charts"),
      ],
    },
    {
      icon: BookOpen,
      title: t("archives_manuscripts_title", "Manuscripts & Nasab Texts"),
      accent: "#5d4037",
      description: t(
        "archives_manuscripts_desc",
        "Genealogical manuscripts, zawiya registries, and tribal chronicles provide narrative context."
      ),
      bullets: [
        t("archives_manuscripts_b1", "Tribal nasab manuscripts"),
        t("archives_manuscripts_b2", "Zawiya registers and lineage notes"),
        t("archives_manuscripts_b3", "Regional chronicle compilations"),
      ],
    },
    {
      icon: FileText,
      title: t("archives_private_title", "Private Collections"),
      accent: "#556b2f",
      description: t(
        "archives_private_desc",
        "Family-held deeds, letters, and oral histories often fill missing branches in public records."
      ),
      bullets: [
        t("archives_private_b1", "Property deeds and waqf deeds"),
        t("archives_private_b2", "Family correspondences"),
        t("archives_private_b3", "Oral testimonies and photos"),
      ],
    },
  ];

  // Primary Sources (from Sources page)
  const primarySources = [
    {
      icon: Scroll,
      title: t("sources_manuscripts_title", "Manuscripts & Nasab"),
      description: t(
        "sources_manuscripts_desc",
        "Genealogical manuscripts and zawiya registries capture lineage chains and tribal narratives."
      ),
    },
    {
      icon: FileText,
      title: t("sources_civil_title", "Civil Status Records"),
      description: t(
        "sources_civil_desc",
        "Birth, marriage, and death certificates anchor relationships with verified dates."
      ),
    },
    {
      icon: Mic,
      title: t("sources_oral_title", "Oral Histories"),
      description: t(
        "sources_oral_desc",
        "Recorded testimonies from elders provide context for migrations, alliances, and patronymics."
      ),
    },
    {
      icon: Library,
      title: t("sources_private_title", "Private Family Archives"),
      description: t(
        "sources_private_desc",
        "Letters, property deeds, and family notebooks often contain missing branches."
      ),
    },
  ];

  // Secondary Sources (from Sources page)
  const secondarySources = [
    {
      icon: BookOpen,
      title: t("sources_academic_title", "Academic Studies"),
      description: t(
        "sources_academic_desc",
        "Anthropology and history publications contextualize tribal movements and social structures."
      ),
    },
    {
      icon: Globe,
      title: t("sources_digital_title", "Digital Collections"),
      description: t(
        "sources_digital_desc",
        "ANOM, Gallica, and regional digitization portals provide searchable scans."
      ),
    },
  ];

  // Access Guidelines (from AccessReliability page)
  const accessGuides = [
    {
      icon: Lock,
      title: t("access_requirements_title", "Access Requirements"),
      description: t(
        "access_requirements_desc",
        "Some archives require appointment letters, national IDs, or family proof. Always confirm before visiting."
      ),
    },
    {
      icon: FileSearch,
      title: t("access_reference_title", "Reference Tracking"),
      description: t(
        "access_reference_desc",
        "Record archive box codes, shelf numbers, and page references to validate each citation."
      ),
    },
    {
      icon: ShieldCheck,
      title: t("access_protection_title", "Data Protection"),
      description: t(
        "access_protection_desc",
        "Respect privacy laws for modern civil records and avoid publishing sensitive personal data."
      ),
    },
  ];

  // Reliability Checks (from AccessReliability page)
  const reliabilityChecks = [
    {
      icon: CheckCircle2,
      title: t("reliability_cross_title", "Cross-check sources"),
      description: t(
        "reliability_cross_desc",
        "Validate the same lineage across multiple registers and oral testimonies."
      ),
    },
    {
      icon: AlertTriangle,
      title: t("reliability_gaps_title", "Identify gaps"),
      description: t(
        "reliability_gaps_desc",
        "Flag missing years, name variations, and inconsistent patronymics."
      ),
    },
    {
      icon: Scale,
      title: t("reliability_balance_title", "Balance narratives"),
      description: t(
        "reliability_balance_desc",
        "Combine written documentation with oral histories to avoid biased records."
      ),
    },
  ];

  // Access Steps (from Archives page)
  const accessSteps = [
    {
      icon: Archive,
      title: t("archives_access_step1_title", "Plan your archive visit"),
      description: t(
        "archives_access_step1_desc",
        "Confirm opening hours, required IDs, and file request procedures before you travel."
      ),
    },
    {
      icon: BookOpen,
      title: t("archives_access_step2_title", "Use catalog references"),
      description: t(
        "archives_access_step2_desc",
        "Record shelf codes, archive boxes, and series numbers to retrieve documents efficiently."
      ),
    },
    {
      icon: ShieldCheck,
      title: t("archives_access_step3_title", "Document provenance"),
      description: t(
        "archives_access_step3_desc",
        "Capture archive citations and metadata to validate sources later."
      ),
    },
  ];

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-[#d4af37]">
            {t("sources_and_archives", "Sources & Archives")}
          </p>
          <h1 className="text-5xl font-bold">
            {t(
              "sources_archives_title",
              "Sources & Archives for Maghreb Genealogy"
            )}
          </h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            {t(
              "sources_archives_intro",
              "Navigate historical archives, explore primary sources, and learn how to access and validate genealogical information across Ottoman registers, colonial archives, and modern civil records."
            )}
          </p>
        </div>
      }
    >
      {/* ========== ARCHIVE TYPES SECTION ========== */}
      <section className="roots-section space-y-10">
        <div>
          <h2 className="text-4xl font-bold mb-4 border-l-8 border-[#d4af37] pl-4">
            {t("archive_types", "Archive Types & Repositories")}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {t(
              "archive_types_desc",
              "Comprehensive overview of historical and modern archives preserving Maghreb genealogy."
            )}
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          {archiveItems.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="fade-up"
            >
              <div className="flex items-center gap-4 mb-4">
                <item.icon className="w-10 h-10" style={{ color: item.accent }} />
                <h3 className="text-3xl font-bold">{item.title}</h3>
              </div>
              <p className="opacity-90 mb-4">{item.description}</p>
              <ul className="list-disc pl-6 space-y-2 opacity-90">
                {item.bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ========== PRIMARY SOURCES SECTION ========== */}
      <section className="roots-section roots-section-alt">
        <h2 className="text-4xl font-bold mb-4 border-l-8 border-[#d4af37] pl-4">
          {t("primary_sources", "Primary Sources")}
        </h2>
        <p className="text-lg opacity-90 mb-8">
          {t(
            "primary_sources_desc",
            "Direct evidence from original documents and testimonies that form the foundation of genealogical research."
          )}
        </p>
        <div className="grid lg:grid-cols-2 gap-8">
          {primarySources.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="fade-up"
            >
              <div className="flex items-center gap-4 mb-3">
                <item.icon className="w-10 h-10 text-[#d4af37]" />
                <h3 className="text-2xl font-bold">{item.title}</h3>
              </div>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== SECONDARY SOURCES SECTION ========== */}
      <section className="roots-section">
        <h2 className="text-4xl font-bold mb-4 border-l-8 border-[#5d4037] pl-4">
          {t("secondary_sources", "Secondary Sources")}
        </h2>
        <p className="text-lg opacity-90 mb-8">
          {t(
            "secondary_sources_desc",
            "Academic research and digital collections that provide context and additional verification."
          )}
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          {secondarySources.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="zoom-in"
            >
              <div className="flex items-center gap-4 mb-3">
                <item.icon className="w-10 h-10 text-[#5d4037]" />
                <h3 className="text-2xl font-bold">{item.title}</h3>
              </div>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== ACCESS GUIDELINES SECTION ========== */}
      <section className="roots-section roots-section-alt">
        <h2 className="text-4xl font-bold mb-4 border-l-8 border-[#d4af37] pl-4">
          {t("access_guidelines", "Access Guidelines")}
        </h2>
        <p className="text-lg opacity-90 mb-8">
          {t(
            "access_guidelines_desc",
            "Essential information for accessing archives and protecting personal data in genealogical research."
          )}
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {accessGuides.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="fade-up"
            >
              <item.icon className="w-10 h-10 text-[#d4af37] mb-4" />
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== RELIABILITY CHECKS SECTION ========== */}
      <section className="roots-section">
        <h2 className="text-4xl font-bold mb-4 border-l-8 border-[#5d4037] pl-4">
          {t("reliability_checks", "Reliability & Validation")}
        </h2>
        <p className="text-lg opacity-90 mb-8">
          {t(
            "reliability_checks_desc",
            "Best practices for validating genealogical information and ensuring research accuracy."
          )}
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {reliabilityChecks.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="zoom-in"
            >
              <item.icon className="w-10 h-10 text-[#5d4037] mb-4" />
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== HOW TO ACCESS ARCHIVES SECTION ========== */}
      <section className="roots-section roots-section-alt">
        <h2 className="text-4xl font-bold mb-4 border-l-8 border-[#d4af37] pl-4">
          {t("archives_access", "How to Access Archives")}
        </h2>
        <p className="text-lg opacity-90 mb-8">
          {t(
            "archives_access_desc",
            "Step-by-step guide to planning your archive visit and documenting sources effectively."
          )}
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {accessSteps.map((step) => (
            <div
              key={step.title}
              className={`${cardBg} p-6 rounded-xl border ${borderColor} shadow-lg`}
              data-aos="zoom-in"
            >
              <step.icon className="w-10 h-10 mb-4 text-[#d4af37]" />
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="opacity-90">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </RootsPageShell>
  );
}