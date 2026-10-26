const fs = require("fs");

const filePath = "./locales/hi.json";

let raw = fs.readFileSync(filePath, "utf8");
raw = raw.replace(/^\uFEFF/, "");

const data = JSON.parse(raw);

function repairString(value) {
  if (typeof value !== "string") {
    return value;
  }

  if (!/[àâ]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(
      [...value].map((char) => {
        const code = char.charCodeAt(0);

        // Windows-1252 characters that commonly
        // appear in corrupted UTF-8 text.
        const cp1252 = {
          0x20ac: 0x80,
          0x201a: 0x82,
          0x0192: 0x83,
          0x201e: 0x84,
          0x2026: 0x85,
          0x2020: 0x86,
          0x2021: 0x87,
          0x02c6: 0x88,
          0x2030: 0x89,
          0x0160: 0x8a,
          0x2039: 0x8b,
          0x0152: 0x8c,
          0x017d: 0x8e,
          0x2018: 0x91,
          0x2019: 0x92,
          0x201c: 0x93,
          0x201d: 0x94,
          0x2022: 0x95,
          0x2013: 0x96,
          0x2014: 0x97,
          0x02dc: 0x98,
          0x2122: 0x99,
          0x0161: 0x9a,
          0x203a: 0x9b,
          0x0153: 0x9c,
          0x017e: 0x9e,
          0x0178: 0x9f,
        };

        if (code <= 255) {
          return code;
        }

        if (cp1252[code] !== undefined) {
          return cp1252[code];
        }

        throw new Error(
          `Cannot convert character U+${code
            .toString(16)
            .toUpperCase()}`
        );
      })
    );

    const repaired =
      new TextDecoder("utf-8", {
        fatal: true,
      }).decode(bytes);

    return repaired;
  } catch {
    return value;
  }
}

function repair(value) {
  if (typeof value === "string") {
    let result = value;

    // Maximum 3 passes in case text was
    // accidentally encoded more than once.
    for (let i = 0; i < 3; i++) {
      const next = repairString(result);

      if (next === result) {
        break;
      }

      result = next;
    }

    return result;
  }

  if (Array.isArray(value)) {
    return value.map(repair);
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const output = {};

    for (const [key, item] of Object.entries(value)) {
      output[key] = repair(item);
    }

    return output;
  }

  return value;
}

const repaired = repair(data);

fs.writeFileSync(
  filePath,
  JSON.stringify(repaired, null, 2) + "\n",
  "utf8"
);

console.log(
  "SUCCESS: hi.json Hindi encoding repaired"
);