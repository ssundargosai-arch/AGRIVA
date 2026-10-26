from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(r"D:\AGRIVA\frontend")

PAGE = ROOT / "app" / "marketplace" / "page.tsx"

LOCALES = {
    "en": ROOT / "locales" / "en.json",
    "hi": ROOT / "locales" / "hi.json",
    "mr": ROOT / "locales" / "mr.json",
}

# =========================================================
# BACKUPS
# =========================================================

for path in [PAGE, *LOCALES.values()]:
    backup = path.with_name(
        path.name + ".before-phase10-localization"
    )
    shutil.copy2(path, backup)

print("Backups created.")

# =========================================================
# EXISTING + NEW MARKETPLACE TRANSLATIONS
# =========================================================

EN = {
    "title": "AGRIVA Marketplace",
    "subtitle": "Discover crops and connect farmers with buyers.",
    "loading": "Loading AGRIVA Marketplace...",
    "searchCrop": "Search crop...",
    "location": "Location...",
    "allQualityGrades": "All quality grades",
    "gradeA": "Grade A",
    "gradeB": "Grade B",
    "gradeC": "Grade C",
    "grade": "Grade",
    "noListings": "No marketplace listings found",
    "changeFilters": "Try changing your crop, location, or quality filters.",
    "perKg": "per kg",
    "quantity": "Quantity",
    "status": "Status",
    "findBestBuyers": "Find Best Buyers",
    "buyerMatches": "Buyer Matches",
    "bestBuyersFor": "Best buyers for {crop}",
    "findingBuyers": "Finding the best buyers...",
    "noBuyerMatches": "No buyer matches found.",
    "offer": "Offer",
    "demand": "Demand",
    "distance": "Distance",
    "match": "Match",
    "loginFirst": "Please login first",
    "farmerLoginFirst": "Please login as farmer first",
    "loadError": "Unable to load marketplace listings",
    "generalError": "Something went wrong",
    "favoriteError": "Unable to update favorite",
    "buyerMatchError": "Unable to find buyer matches",
    "favorite": "Favorite",
    "notAvailable": "N/A",

    "sellYourCrop": "Sell Your Crop",
    "secureMarketplace": "Secure farmer-to-buyer marketplace",
    "activeMarketNetwork": "Active Market Network",
    "networkSummary": "Listings • Buyers • Smart Matching",
    "marketplaceSearch": "Marketplace Search",
    "exploreListings": "Explore active crop listings",
    "activeListings": "{count} active listings",
    "rankedBuyers": "Ranked buyers",
    "comparingFactors": "Comparing crop, quantity, price, quality, distance and buyer rating.",
    "buyerRating": "Buyer rating",
    "whyBuyerMatches": "Why this buyer matches",
    "transparentScore": "Transparent 100-point AGRIVA buyer matching score",
    "matchingDisclaimer": "AGRIVA ranks this buyer using crop fit, demand quantity, offered price, quality preference, distance and buyer rating. A higher score indicates a stronger marketplace fit; it is not a guaranteed sale.",
    "qualityGrade": "Quality Grade",
    "qualityHigh": "A · High Quality",
    "qualityStandard": "B · Standard",
    "qualityBasic": "C · Basic",
    "expectedPrice": "Expected Price (₹/kg)",
    "addCropPhotos": "Add crop photos",
    "imageHelp": "Up to 5 JPG, PNG or WEBP images · 10 MB each",
    "validExpectedPrice": "Enter a valid expected price.",
}

HI = {
    "title": "AGRIVA बाज़ार",
    "subtitle": "फसलें खोजें और किसानों को खरीदारों से जोड़ें।",
    "loading": "AGRIVA बाज़ार लोड हो रहा है...",
    "searchCrop": "फसल खोजें...",
    "location": "स्थान...",
    "allQualityGrades": "सभी गुणवत्ता ग्रेड",
    "gradeA": "ग्रेड A",
    "gradeB": "ग्रेड B",
    "gradeC": "ग्रेड C",
    "grade": "ग्रेड",
    "noListings": "बाज़ार में कोई लिस्टिंग नहीं मिली",
    "changeFilters": "फसल, स्थान या गुणवत्ता फ़िल्टर बदलकर देखें।",
    "perKg": "प्रति किग्रा",
    "quantity": "मात्रा",
    "status": "स्थिति",
    "findBestBuyers": "सर्वश्रेष्ठ खरीदार खोजें",
    "buyerMatches": "मिलते-जुलते खरीदार",
    "bestBuyersFor": "{crop} के लिए सर्वश्रेष्ठ खरीदार",
    "findingBuyers": "सर्वश्रेष्ठ खरीदार खोजे जा रहे हैं...",
    "noBuyerMatches": "कोई उपयुक्त खरीदार नहीं मिला।",
    "offer": "प्रस्ताव",
    "demand": "मांग",
    "distance": "दूरी",
    "match": "मिलान",
    "loginFirst": "कृपया पहले लॉगिन करें",
    "farmerLoginFirst": "कृपया पहले किसान के रूप में लॉगिन करें",
    "loadError": "बाज़ार की लिस्टिंग लोड नहीं हो सकी",
    "generalError": "कुछ गलत हो गया",
    "favoriteError": "पसंदीदा सूची अपडेट नहीं हो सकी",
    "buyerMatchError": "खरीदारों का मिलान नहीं हो सका",
    "favorite": "पसंदीदा",
    "notAvailable": "उपलब्ध नहीं",

    "sellYourCrop": "अपनी फसल बेचें",
    "secureMarketplace": "सुरक्षित किसान-से-खरीदार बाज़ार",
    "activeMarketNetwork": "सक्रिय बाज़ार नेटवर्क",
    "networkSummary": "लिस्टिंग • खरीदार • स्मार्ट मिलान",
    "marketplaceSearch": "बाज़ार खोज",
    "exploreListings": "सक्रिय फसल लिस्टिंग देखें",
    "activeListings": "{count} सक्रिय लिस्टिंग",
    "rankedBuyers": "रैंक किए गए खरीदार",
    "comparingFactors": "फसल, मात्रा, कीमत, गुणवत्ता, दूरी और खरीदार रेटिंग की तुलना की जा रही है।",
    "buyerRating": "खरीदार रेटिंग",
    "whyBuyerMatches": "यह खरीदार क्यों उपयुक्त है",
    "transparentScore": "पारदर्शी 100-अंक AGRIVA खरीदार मिलान स्कोर",
    "matchingDisclaimer": "AGRIVA फसल उपयुक्तता, मांग मात्रा, प्रस्तावित कीमत, गुणवत्ता पसंद, दूरी और खरीदार रेटिंग के आधार पर खरीदारों को रैंक करता है। अधिक स्कोर बेहतर बाज़ार मिलान दर्शाता है; यह बिक्री की गारंटी नहीं है।",
    "qualityGrade": "गुणवत्ता ग्रेड",
    "qualityHigh": "A · उच्च गुणवत्ता",
    "qualityStandard": "B · मानक",
    "qualityBasic": "C · मूलभूत",
    "expectedPrice": "अपेक्षित मूल्य (₹/किग्रा)",
    "addCropPhotos": "फसल की तस्वीरें जोड़ें",
    "imageHelp": "अधिकतम 5 JPG, PNG या WEBP तस्वीरें · प्रत्येक 10 MB",
    "validExpectedPrice": "मान्य अपेक्षित मूल्य दर्ज करें।",
}

MR = {
    "title": "AGRIVA बाजारपेठ",
    "subtitle": "पिके शोधा आणि शेतकऱ्यांना खरेदीदारांशी जोडा.",
    "loading": "AGRIVA बाजारपेठ लोड होत आहे...",
    "searchCrop": "पीक शोधा...",
    "location": "स्थान...",
    "allQualityGrades": "सर्व गुणवत्ता ग्रेड",
    "gradeA": "ग्रेड A",
    "gradeB": "ग्रेड B",
    "gradeC": "ग्रेड C",
    "grade": "ग्रेड",
    "noListings": "बाजारपेठेत कोणतीही नोंद सापडली नाही",
    "changeFilters": "पीक, स्थान किंवा गुणवत्ता फिल्टर बदलून पहा.",
    "perKg": "प्रति किलो",
    "quantity": "प्रमाण",
    "status": "स्थिती",
    "findBestBuyers": "सर्वोत्तम खरेदीदार शोधा",
    "buyerMatches": "खरेदीदार जुळणी",
    "bestBuyersFor": "{crop} साठी सर्वोत्तम खरेदीदार",
    "findingBuyers": "सर्वोत्तम खरेदीदार शोधत आहे...",
    "noBuyerMatches": "योग्य खरेदीदार जुळणी सापडली नाही.",
    "offer": "ऑफर",
    "demand": "मागणी",
    "distance": "अंतर",
    "match": "जुळणी",
    "loginFirst": "कृपया प्रथम लॉगिन करा",
    "farmerLoginFirst": "कृपया प्रथम शेतकरी म्हणून लॉगिन करा",
    "loadError": "बाजारपेठेतील नोंदी लोड करता आल्या नाहीत",
    "generalError": "काहीतरी चूक झाली",
    "favoriteError": "आवडती यादी अपडेट करता आली नाही",
    "buyerMatchError": "खरेदीदार जुळणी शोधता आली नाही",
    "favorite": "आवडते",
    "notAvailable": "उपलब्ध नाही",

    "sellYourCrop": "तुमचे पीक विका",
    "secureMarketplace": "सुरक्षित शेतकरी-ते-खरेदीदार बाजारपेठ",
    "activeMarketNetwork": "सक्रिय बाजार नेटवर्क",
    "networkSummary": "नोंदी • खरेदीदार • स्मार्ट जुळणी",
    "marketplaceSearch": "बाजारपेठ शोध",
    "exploreListings": "सक्रिय पीक नोंदी पहा",
    "activeListings": "{count} सक्रिय नोंदी",
    "rankedBuyers": "क्रमवारीतील खरेदीदार",
    "comparingFactors": "पीक, प्रमाण, किंमत, गुणवत्ता, अंतर आणि खरेदीदार रेटिंगची तुलना केली जात आहे.",
    "buyerRating": "खरेदीदार रेटिंग",
    "whyBuyerMatches": "हा खरेदीदार का जुळतो",
    "transparentScore": "पारदर्शक 100-पॉइंट AGRIVA खरेदीदार जुळणी स्कोअर",
    "matchingDisclaimer": "AGRIVA पीक जुळणी, मागणीचे प्रमाण, ऑफर केलेली किंमत, गुणवत्ता पसंती, अंतर आणि खरेदीदार रेटिंग यांच्या आधारे खरेदीदारांना क्रम देते. जास्त स्कोअर म्हणजे अधिक चांगली बाजारपेठ जुळणी; विक्रीची हमी नाही.",
    "qualityGrade": "गुणवत्ता ग्रेड",
    "qualityHigh": "A · उच्च गुणवत्ता",
    "qualityStandard": "B · मानक",
    "qualityBasic": "C · मूलभूत",
    "expectedPrice": "अपेक्षित किंमत (₹/किलो)",
    "addCropPhotos": "पिकाचे फोटो जोडा",
    "imageHelp": "जास्तीत जास्त 5 JPG, PNG किंवा WEBP प्रतिमा · प्रत्येकी 10 MB",
    "validExpectedPrice": "वैध अपेक्षित किंमत टाका.",
}

translations = {
    "en": EN,
    "hi": HI,
    "mr": MR,
}

for locale, path in LOCALES.items():
    with path.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    data["marketplacePage"] = translations[locale]

    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")

    print(f"{locale}.json marketplacePage updated.")

# =========================================================
# PATCH JSX HARDCODED TEXT ONLY
# =========================================================

text = PAGE.read_text(encoding="utf-8")

def rx(pattern: str, replacement: str, label: str):
    global text
    text, count = re.subn(
        pattern,
        replacement,
        text,
        flags=re.MULTILINE,
    )
    print(f"{label}: {count}")

rx(
    r"Secure\s+farmer-to-buyer\s+marketplace",
    '{t("secureMarketplace")}',
    "secureMarketplace",
)

rx(
    r">Active Market Network<",
    '>{t("activeMarketNetwork")}<',
    "activeMarketNetwork",
)

rx(
    r">Listings\s*•\s*Buyers\s*•\s*Smart Matching<",
    '>{t("networkSummary")}<',
    "networkSummary",
)

rx(
    r">\s*Marketplace Search\s*<",
    '>{t("marketplaceSearch")}<',
    "marketplaceSearch",
)

rx(
    r">\s*Explore active crop\s+listings\s*<",
    '>{t("exploreListings")}<',
    "exploreListings",
)

rx(
    r"\{filteredListings\.length\}\s*active listings",
    '{t("activeListings", { count: filteredListings.length })}',
    "activeListings",
)

rx(
    r">\s*Ranked buyers\s*<",
    '>{t("rankedBuyers")}<',
    "rankedBuyers",
)

rx(
    r"Comparing crop,\s*quantity,\s*price,\s*quality,\s*distance and buyer rating\.",
    '{t("comparingFactors")}',
    "comparingFactors",
)

rx(
    r">\s*Buyer\s+rating\s*<",
    '>{t("buyerRating")}<',
    "buyerRating",
)

rx(
    r">\s*Why\s+this buyer matches\s*<",
    '>{t("whyBuyerMatches")}<',
    "whyBuyerMatches",
)

rx(
    r"Transparent 100-point AGRIVA buyer matching score",
    '{t("transparentScore")}',
    "transparentScore",
)

rx(
    r"AGRIVA\s+ranks this buyer using crop fit,\s*demand quantity,\s*offered price,\s*quality\s*preference,\s*distance and buyer rating\.\s*A higher score indicates a stronger\s*marketplace fit;\s*it is not a guaranteed sale\.",
    '{t("matchingDisclaimer")}',
    "matchingDisclaimer",
)

rx(
    r">\s*Quality Grade\s*<",
    '>{t("qualityGrade")}<',
    "qualityGrade",
)

rx(
    r">\s*Expected Price\s*\(₹/kg\)\s*<",
    '>{t("expectedPrice")}<',
    "expectedPrice",
)

rx(
    r">\s*Add crop photos\s*<",
    '>{t("addCropPhotos")}<',
    "addCropPhotos",
)

rx(
    r"Up to 5 JPG,\s*PNG or WEBP images\s*·\s*10 MB each",
    '{t("imageHelp")}',
    "imageHelp",
)

rx(
    r">\s*A\s*·\s*High Quality\s*<",
    '>{t("qualityHigh")}<',
    "qualityHigh",
)

rx(
    r">\s*B\s*·\s*Standard\s*<",
    '>{t("qualityStandard")}<',
    "qualityStandard",
)

rx(
    r">\s*C\s*·\s*Basic\s*<",
    '>{t("qualityBasic")}<',
    "qualityBasic",
)

# Sell Your Crop if currently hardcoded
rx(
    r">\s*Sell Your Crop\s*<",
    '>{t("sellYourCrop")}<',
    "sellYourCrop",
)

# Validation message
text = text.replace(
    'setSellError(\n        "Enter a valid expected price."\n      );',
    'setSellError(t("validExpectedPrice"));',
)

PAGE.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print("Marketplace page localization patch complete.")
