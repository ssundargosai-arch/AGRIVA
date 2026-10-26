from pathlib import Path
import re
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\page.tsx"
)

css = Path(
    r"D:\AGRIVA\frontend\app\globals.css"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-weather-metric-visibility-fix"
)

backup.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(
    path,
    backup / "page.tsx"
)

shutil.copy2(
    css,
    backup / "globals.css"
)

text = path.read_text(
    encoding="utf-8-sig"
)

pattern = re.compile(
    r'function Metric\('
    r'\{ label, value \}'
    r': \{ label: string; value: string \}'
    r'\) \{.*?'
    r'(?=\nfunction |\Z)',
    re.DOTALL,
)

replacement = '''function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="agriva-weather-metric rounded-2xl border p-5 shadow-sm">
      <p className="agriva-weather-metric-label text-xs font-black uppercase tracking-wider">
        {label}
      </p>

      <p className="agriva-weather-metric-value mt-3 text-2xl font-black leading-tight">
        {value || "—"}
      </p>
    </div>
  );
}
'''

text, count = pattern.subn(
    replacement,
    text,
    count=1,
)

if count != 1:
    raise RuntimeError(
        "Metric component not found exactly. No file changed."
    )

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)


css_text = css.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_WEATHER_METRIC_VISIBILITY_FIX */"

patch = r'''

/* AGRIVA_WEATHER_METRIC_VISIBILITY_FIX */

/*
   Dashboard weather mini-cards intentionally stay light
   in both themes for maximum readability.
*/

.agriva-weather-metric {
  background: #f8fafc !important;
  border-color: #d7e3da !important;
  color: #0f172a !important;
}

.agriva-weather-metric-label {
  color: #334155 !important;
  opacity: 1 !important;
}

.agriva-weather-metric-value {
  color: #0f172a !important;
  opacity: 1 !important;
  visibility: visible !important;
  -webkit-text-fill-color: #0f172a !important;
}


/* Dark mode: keep these four data cards readable */

html.dark .agriva-weather-metric,
html[data-theme="dark"] .agriva-weather-metric,
.agriva-dark .agriva-weather-metric {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
}

html.dark .agriva-weather-metric-label,
html[data-theme="dark"] .agriva-weather-metric-label,
.agriva-dark .agriva-weather-metric-label {
  color: #334155 !important;
}

html.dark .agriva-weather-metric-value,
html[data-theme="dark"] .agriva-weather-metric-value,
.agriva-dark .agriva-weather-metric-value {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
}


/* Weather section subtitle on dark card */

.agriva-dark [class*="text-[#475569]"] {
  color: #a9bac8 !important;
}

'''

if marker not in css_text:
    css.write_text(
        css_text.rstrip()
        + "\n"
        + patch
        + "\n",
        encoding="utf-8",
        newline="\n",
    )

print("Weather Metric component replaced:", count)
print("WEATHER DETAILS VISIBILITY FIX COMPLETE ✅")
print("Backup:", backup)
