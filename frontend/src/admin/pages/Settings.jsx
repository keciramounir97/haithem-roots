import { useEffect, useState } from "react";
import { Save, Shield, Globe, Bell, Database, UserCircle2 } from "lucide-react";
import { useThemeStore } from "../../store/theme";
import { api } from "../../api/client";
import { useAuth } from "../components/AuthContext";
import { useTranslation } from "../../context/TranslationContext";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
];

export default function Settings() {
  const { theme } = useThemeStore();
  const { user, refreshMe } = useAuth();
  const { t } = useTranslation();
  const isDark = theme === "dark";
  const isAdmin = user?.role === 1;

  const pageBg = isDark ? "bg-[#3e2723]" : "bg-[#f5f1e8]";
  const text = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const card = isDark ? "bg-[#3e2723]" : "bg-white";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const inputBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const inputText = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settings, setSettings] = useState({
    allowRegistration: true,
    activityRetentionDays: 90,
    notifyAdmins: true,
    defaultLanguage: "en",
    mockupDataActive: false,
  });

  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const localMock = localStorage.getItem("mockupDataActive") === "true";

        if (!isAdmin) {
          setSettings((s) => ({ ...s, mockupDataActive: localMock }));
          return;
        }

        const { data } = await api.get("/admin/settings");
        if (!mounted) return;

        const dl = String(data?.defaultLanguage || "en");
        const safeDefaultLanguage = LANGUAGES.some((l) => l.value === dl)
          ? dl
          : "en";

        setSettings({
          allowRegistration: !!data?.allowRegistration,
          activityRetentionDays: Number(data?.activityRetentionDays) || 90,
          notifyAdmins: !!data?.notifyAdmins,
          defaultLanguage: safeDefaultLanguage,
          mockupDataActive: localMock,
        });
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.message || "Failed to load settings");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    localStorage.setItem("mockupDataActive", String(settings.mockupDataActive));
  }, [settings.mockupDataActive]);

  useEffect(() => {
    setProfile({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
    });
  }, [user?.fullName, user?.phone]);

  const updateSetting = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const saveSettings = async () => {
    setSavingSettings(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/admin/settings", {
        allowRegistration: !!settings.allowRegistration,
        defaultLanguage: String(settings.defaultLanguage || "en"),
        notifyAdmins: !!settings.notifyAdmins,
        activityRetentionDays: Number(settings.activityRetentionDays) || 90,
      });
      setSuccess("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save settings failed");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setError("");
    setSuccess("");
    try {
      await api.patch("/users/me", {
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });
      await refreshMe?.();
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Update profile failed");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className={`p-4 min-h-screen ${pageBg} ${text}`}>
      <div
        className={`rounded-lg p-5 mb-6 border ${border}
        bg-gradient-to-r from-[#556b2f]/12 to-[#5d4037]/10 heritage-panel heritage-panel--accent`}
      >
        <h3 className="text-2xl font-bold">{t("settings", "Settings")}</h3>
        <p className="opacity-70">
          {t(
            "settings_desc",
            "Control security, notifications, and platform preferences.",
          )}
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center opacity-70">
          {t("loading", "Loading...")}
        </div>
      ) : null}

      {!loading && (error || success) ? (
        <div
          className={`mb-4 rounded-lg border ${border} ${card} p-4 heritage-panel`}
        >
          {error ? (
            <div className="text-[#a0552a] font-semibold">{error}</div>
          ) : null}
          {success ? (
            <div className="text-[#5d4037] font-semibold">{success}</div>
          ) : null}
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        {isAdmin ? (
          <div
            className={`rounded-lg shadow-sm p-5 border ${border} ${card} heritage-panel`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center
              ${isDark ? "bg-white/10" : "bg-[#3e2723]/10"}`}
              >
                <Shield className="w-5 h-5 text-[#3e2723]" />
              </div>
              <div>
                <div className="font-bold text-lg">Security</div>
                <div className="text-sm opacity-70">Manage sign-up rules</div>
              </div>
            </div>

            <label className="flex items-center justify-between gap-3">
              <span className="font-medium">
                {t("allow_registration", "Allow Registration")}
              </span>
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) =>
                  updateSetting("allowRegistration", e.target.checked)
                }
                className="w-5 h-5"
                disabled={loading || savingSettings}
              />
            </label>
          </div>
        ) : null}

        {isAdmin ? (
          <div
            className={`rounded-lg shadow-sm p-5 border ${border} ${card} heritage-panel`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center
              ${isDark ? "bg-[#d4af37]/20" : "bg-[#d4af37]/15"}`}
              >
                <Globe className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div>
                <div className="font-bold text-lg">Localization</div>
                <div className="text-sm opacity-70">Default language</div>
              </div>
            </div>

            <label className="block">
              <span className="font-medium">
                {t("default_language", "Default Language")}
              </span>
              <select
                value={settings.defaultLanguage}
                onChange={(e) =>
                  updateSetting("defaultLanguage", e.target.value)
                }
                className={`mt-2 w-full px-3 py-2 rounded-md border
              ${inputBg} ${inputText} ${border}`}
                disabled={loading || savingSettings}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {isAdmin ? (
          <div
            className={`rounded-lg shadow-sm p-5 border ${border} ${card} heritage-panel`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center
              ${isDark ? "bg-[#5d4037]/25" : "bg-[#5d4037]/15"}`}
              >
                <Bell className="w-5 h-5 text-[#5d4037]" />
              </div>
              <div>
                <div className="font-bold text-lg">Notifications</div>
                <div className="text-sm opacity-70">Admin alerts</div>
              </div>
            </div>

            <label className="flex items-center justify-between gap-3">
              <span className="font-medium">
                {t("notify_admins", "Notify admins on critical actions")}
              </span>
              <input
                type="checkbox"
                checked={settings.notifyAdmins}
                onChange={(e) =>
                  updateSetting("notifyAdmins", e.target.checked)
                }
                className="w-5 h-5"
                disabled={loading || savingSettings}
              />
            </label>
          </div>
        ) : null}

        {isAdmin ? (
          <div
            className={`rounded-lg shadow-sm p-5 border ${border} ${card} heritage-panel`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center
              ${isDark ? "bg-[#556b2f]/25" : "bg-[#556b2f]/15"}`}
              >
                <Database className="w-5 h-5 text-[#556b2f]" />
              </div>
              <div>
                <div className="font-bold text-lg">Logs & Retention</div>
                <div className="text-sm opacity-70">
                  How long activity stays stored
                </div>
              </div>
            </div>

            <label className="block">
              <span className="font-medium">
                {t("activity_retention_days", "Activity retention (days)")}
              </span>
              <input
                type="number"
                min={7}
                max={365}
                value={settings.activityRetentionDays}
                onChange={(e) =>
                  updateSetting(
                    "activityRetentionDays",
                    Number(e.target.value || 0),
                  )
                }
                className={`mt-2 w-full px-3 py-2 rounded-md border
              ${inputBg} ${inputText} ${border}`}
              />
            </label>
          </div>
        ) : null}

        <div
          className={`rounded-lg shadow-sm p-5 border ${border} ${card} heritage-panel`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center
              ${isDark ? "bg-white/10" : "bg-[#3e2723]/10"}`}
            >
              <UserCircle2 className="w-5 h-5 text-[#5d4037]" />
            </div>
            <div>
              <div className="font-bold text-lg">My Profile</div>
              <div className="text-sm opacity-70">
                Update your own account info
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="font-medium">{t("email", "Email")}</span>
              <input
                value={user?.email || ""}
                disabled
                className={`mt-2 w-full px-3 py-2 rounded-md border opacity-80
                ${inputBg} ${inputText} ${border}`}
              />
            </label>

            <label className="block">
              <span className="font-medium">{t("full_name", "Full Name")}</span>
              <input
                value={profile.fullName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, fullName: e.target.value }))
                }
                className={`mt-2 w-full px-3 py-2 rounded-md border
                ${inputBg} ${inputText} ${border}`}
                disabled={loading || savingProfile}
              />
            </label>

            <label className="block">
              <span className="font-medium">{t("phone", "Phone")}</span>
              <input
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
                className={`mt-2 w-full px-3 py-2 rounded-md border
                ${inputBg} ${inputText} ${border}`}
                disabled={loading || savingProfile}
              />
            </label>

            <div className="flex justify-end">
              <button
                className="heritage-btn heritage-btn--ghost inline-flex items-center gap-2 px-4 py-2 rounded-md"
                type="button"
                disabled={loading || savingProfile}
                onClick={saveProfile}
              >
                <Save className="w-4 h-4" />
                {savingProfile
                  ? t("saving", "Saving...")
                  : t("save_profile", "Save Profile")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="mt-6 flex justify-end">
          <button
            className="heritage-btn inline-flex items-center gap-2 px-5 py-3 rounded-md shadow disabled:opacity-60"
            type="button"
            disabled={loading || savingSettings}
            onClick={saveSettings}
          >
            <Save className="w-5 h-5" />
            {savingSettings
              ? t("saving", "Saving...")
              : t("save_settings", "Save Settings")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
