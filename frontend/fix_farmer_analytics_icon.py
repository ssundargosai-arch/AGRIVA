from pathlib import Path

path = Path(r"D:\AGRIVA\frontend\app\dashboard\farmer\page.tsx")
text = path.read_text(encoding="utf-8")

old = '''  TrendingUp,
  Truck,'''

new = '''  TrendingUp,
  BarChart3,
  Truck,'''

if old not in text:
    raise RuntimeError(
        "TrendingUp/Truck import location not found. No change made."
    )

text = text.replace(old, new, 1)

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("BarChart3 IMPORT ADDED")
