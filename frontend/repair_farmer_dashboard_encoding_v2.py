from pathlib import Path
import re
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\page.tsx"
)

backup = path.with_name(
    "page.before-mojibake-repair-v2.tsx"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

BAD = (
    "à",
    "ð",
    "Â",
    "Ã",
    "â",
)

def bad_score(value: str) -> int:
    return sum(
        value.count(x)
        for x in BAD
    )

def recover(value: str) -> str:
    raw = bytearray()

    for ch in value:
        code = ord(ch)

        # Raw control bytes and Latin-1 range
        if code <= 255:
            raw.append(code)
            continue

        # Characters such as €, —, ™ etc. produced
        # by Windows-1252 mojibake
        try:
            encoded = ch.encode("cp1252")
        except UnicodeEncodeError:
            return value

        raw.extend(encoded)

    try:
        candidate = raw.decode("utf-8")
    except UnicodeDecodeError:
        return value

    if bad_score(candidate) < bad_score(value):
        return candidate

    return value


def fix_string(match: re.Match) -> str:
    quote = match.group(1)
    content = match.group(2)

    if not any(x in content for x in BAD):
        return match.group(0)

    fixed = recover(content)

    if fixed != content:
        print("FIXED:")
        print(" OLD:", content)
        print(" NEW:", fixed)
        print()

    return quote + fixed + quote


# Repair double-quoted and single-quoted string literals.
pattern = re.compile(
    r'(["\'])(.*?)(?<!\\)\1'
)

fixed_text = pattern.sub(
    fix_string,
    text
)

path.write_text(
    fixed_text,
    encoding="utf-8",
    newline="\n",
)

print(
    "FARMER DASHBOARD MOJIBAKE V2 REPAIR COMPLETE"
)
print("Backup:", backup)
