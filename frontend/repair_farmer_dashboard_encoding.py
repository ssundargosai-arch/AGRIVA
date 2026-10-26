from pathlib import Path
import shutil

path = Path(r"D:\AGRIVA\frontend\app\dashboard\farmer\page.tsx")
backup = path.with_name("page.before-mojibake-repair.tsx")

shutil.copy2(path, backup)

text = path.read_text(encoding="utf-8-sig")

markers = (
    "\u00c3",   # Ã
    "\u00c2",   # Â
    "\u00e2",   # â
    "\u00f0",   # ð
    "\u00e0",   # à
)

def bad_score(value: str) -> int:
    return sum(value.count(marker) for marker in markers)

def repair_line(line: str) -> str:
    if bad_score(line) == 0:
        return line

    original = line
    best = line
    best_score = bad_score(line)

    for encoding in ("cp1252", "latin1"):
        try:
            candidate = line.encode(encoding).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue

        score = bad_score(candidate)

        if score < best_score:
            best = candidate
            best_score = score

    if best != original:
        print("FIXED:")
        print(" OLD:", original.strip())
        print(" NEW:", best.strip())
        print()

    return best

lines = text.splitlines(keepends=True)
fixed = "".join(repair_line(line) for line in lines)

path.write_text(
    fixed,
    encoding="utf-8",
    newline="\n",
)

print("FARMER DASHBOARD MOJIBAKE REPAIR COMPLETE")
print("Backup:", backup)
