from pathlib import Path
import re
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")
BACKUP = Path(
    r"D:\AGRIVA\frontend_source_backups"
)

BACKUP.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# FILES
# =========================================================

market_path = (
    ROOT /
    "app/marketplace/page.tsx"
)

buyer_dashboard_path = (
    ROOT /
    "app/dashboard/buyer/page.tsx"
)

admin_dashboard_path = (
    ROOT /
    "app/dashboard/admin/page.tsx"
)

for path in [
    market_path,
    buyer_dashboard_path,
    admin_dashboard_path,
]:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    backup_name = (
        path.relative_to(ROOT)
        .as_posix()
        .replace("/", "__")
        + ".before-verification-repair"
    )

    shutil.copy2(
        path,
        BACKUP / backup_name,
    )


# =========================================================
# SHARED MARKETPLACE HELPERS
# =========================================================

helpers = r'''
function buyerVerificationLabel(
  status: string,
  locale: string
) {
  if (
    status ===
    "AGRIVA_VERIFIED"
  ) {
    return "AGRIVA Verified";
  }

  if (status === "PENDING") {
    if (locale === "hi") {
      return "AGRIVA समीक्षा लंबित";
    }

    if (locale === "mr") {
      return "AGRIVA पुनरावलोकन प्रलंबित";
    }

    return "AGRIVA review pending";
  }

  if (status === "REJECTED") {
    if (locale === "hi") {
      return "AGRIVA समीक्षा अस्वीकृत";
    }

    if (locale === "mr") {
      return "AGRIVA पुनरावलोकन नाकारले";
    }

    return "AGRIVA review rejected";
  }

  if (locale === "hi") {
    return "AGRIVA द्वारा सत्यापित नहीं";
  }

  if (locale === "mr") {
    return "AGRIVA कडून पडताळलेले नाही";
  }

  return "Not verified by AGRIVA";
}


function buyerVerificationNote(
  status: string,
  locale: string
) {
  if (
    status ===
    "AGRIVA_VERIFIED"
  ) {
    if (locale === "hi") {
      return "AGRIVA एडमिन ने जमा प्लेटफ़ॉर्म व्यवसाय दस्तावेज़ की समीक्षा की है। यह सरकारी KYC या बैंक सत्यापन नहीं है।";
    }

    if (locale === "mr") {
      return "AGRIVA अॅडमिनने सादर केलेल्या प्लॅटफॉर्म व्यवसाय दस्तऐवजाचे पुनरावलोकन केले आहे. हे सरकारी KYC किंवा बँक पडताळणी नाही.";
    }

    return "AGRIVA admin reviewed the submitted platform business document. This is not Government KYC or bank verification.";
  }

  if (status === "PENDING") {
    if (locale === "hi") {
      return "दस्तावेज़ AGRIVA एडमिन समीक्षा की प्रतीक्षा में हैं। स्वतंत्र सरकारी/KYC सत्यापन का दावा नहीं है।";
    }

    if (locale === "mr") {
      return "दस्तऐवज AGRIVA अॅडमिन पुनरावलोकनाच्या प्रतीक्षेत आहेत. स्वतंत्र सरकारी/KYC पडताळणीचा दावा नाही.";
    }

    return "Documents are awaiting AGRIVA admin review. No Government/KYC verification is claimed.";
  }

  if (locale === "hi") {
    return "इस खरीदार के लिए सरकारी, KYC या बैंक सत्यापन का दावा नहीं किया गया है।";
  }

  if (locale === "mr") {
    return "या खरेदीदारासाठी सरकारी, KYC किंवा बँक पडताळणीचा दावा केलेला नाही.";
  }

  return "No Government, KYC or bank verification is claimed for this buyer.";
}

'''


# =========================================================
# 1. MAIN MARKETPLACE
# =========================================================

market = market_path.read_text(
    encoding="utf-8-sig"
)


# Add API response fields to BuyerMatch type
if (
    "agriva_verified: boolean;"
    not in market
):
    type_anchor = (
        "  buyer_rating: number | null;\n"
        "  breakdown: BuyerMatchBreakdown;\n"
        "};"
    )

    if type_anchor not in market:
        raise RuntimeError(
            "Marketplace BuyerMatch "
            "type anchor not found."
        )

    market = market.replace(
        type_anchor,
'''  buyer_rating: number | null;

  verification_status: string;
  verification_label: string;
  verification_note: string;
  agriva_verified: boolean;

  breakdown: BuyerMatchBreakdown;
};''',
        1,
    )

    print(
        "UPDATED: Marketplace BuyerMatch type"
    )


# Add helper functions
if (
    "function buyerVerificationLabel("
    not in market
):
    export_pos = market.find(
        "export default function"
    )

    if export_pos == -1:
        raise RuntimeError(
            "Marketplace export function "
            "not found."
        )

    market = (
        market[:export_pos]
        + helpers
        + market[export_pos:]
    )

    print(
        "UPDATED: Marketplace verification helpers"
    )


# Add badge after buyer name.
# Important: current source renders:
#
# {
#   match.buyer_name
# }
#
# so whitespace inside braces must be accepted.
if (
    "data-agriva-verification-badge"
    not in market
):
    buyer_heading = re.compile(
        r'('
        r'<h3'
        r'\s+className='
        r'"text-xl font-bold text-slate-900"'
        r'>'
        r'\s*'
        r'\{'
        r'\s*match\.buyer_name\s*'
        r'\}'
        r'\s*'
        r'</h3>'
        r')',
        re.DOTALL,
    )

    badge = r'''\1

                                  <span
                                    data-agriva-verification-badge
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${
                                      match.agriva_verified
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : match.verification_status === "PENDING"
                                          ? "border-amber-200 bg-amber-50 text-amber-800"
                                          : match.verification_status === "REJECTED"
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-slate-200 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    {buyerVerificationLabel(
                                      match.verification_status,
                                      locale
                                    )}
                                  </span>

                                  <p className="basis-full text-xs leading-5 text-slate-500">
                                    {buyerVerificationNote(
                                      match.verification_status,
                                      locale
                                    )}
                                  </p>'''

    market, count = (
        buyer_heading.subn(
            badge,
            market,
            count=1,
        )
    )

    if count != 1:
        raise RuntimeError(
            "Marketplace buyer name "
            "could not be patched."
        )

    print(
        "UPDATED: Main Marketplace verification badge"
    )


market_path.write_text(
    market,
    encoding="utf-8",
    newline="\n",
)


# =========================================================
# 2. BUYER DASHBOARD LINK
# =========================================================

buyer = (
    buyer_dashboard_path
    .read_text(
        encoding="utf-8-sig"
    )
)

if (
    "/dashboard/buyer/verification"
    not in buyer
):
    intro_pattern = re.compile(
        r'('
        r'<p'
        r'\s+className='
        r'"mt-2\s+text-slate-500"'
        r'>'
        r'\s*Marketplace,\s*'
        r'orders,\s*'
        r'payments,\s*'
        r'transport\s+and\s*'
        r'Phase\s+11\s+'
        r'order\s+tracking\.'
        r'\s*</p>'
        r')',
        re.DOTALL,
    )

    buyer_link = r'''\1

          <a
            href="/dashboard/buyer/verification"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
          >
            ✓ Buyer Verification
          </a>'''

    buyer, count = (
        intro_pattern.subn(
            buyer_link,
            buyer,
            count=1,
        )
    )

    if count != 1:
        raise RuntimeError(
            "Buyer dashboard intro "
            "anchor not found."
        )

    print(
        "UPDATED: Buyer dashboard link"
    )

else:
    print(
        "SKIP: Buyer dashboard link already exists"
    )


buyer_dashboard_path.write_text(
    buyer,
    encoding="utf-8",
    newline="\n",
)


# =========================================================
# 3. ADMIN DASHBOARD LINK
# =========================================================

admin = (
    admin_dashboard_path
    .read_text(
        encoding="utf-8-sig"
    )
)

if (
    "/dashboard/admin/buyer-verification"
    not in admin
):
    # Insert inside root JSX element after return.
    return_pos = admin.find(
        "return ("
    )

    if return_pos == -1:
        raise RuntimeError(
            "Admin dashboard return block "
            "not found."
        )

    remaining = admin[
        return_pos:
    ]

    root_match = re.search(
        r'<(?:main|div)\b[^>]*>',
        remaining,
        flags=re.DOTALL,
    )

    if not root_match:
        raise RuntimeError(
            "Admin dashboard root JSX "
            "element not found."
        )

    insert_at = (
        return_pos
        + root_match.end()
    )

    admin_link = r'''

        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <a
            href="/dashboard/admin/buyer-verification"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
          >
            ✓ Buyer Verification Review
          </a>
        </div>'''

    admin = (
        admin[:insert_at]
        + admin_link
        + admin[insert_at:]
    )

    print(
        "UPDATED: Admin dashboard link"
    )

else:
    print(
        "SKIP: Admin dashboard link already exists"
    )


admin_dashboard_path.write_text(
    admin,
    encoding="utf-8",
    newline="\n",
)


# =========================================================
# FINAL ASSERTIONS
# =========================================================

final_market = (
    market_path.read_text(
        encoding="utf-8"
    )
)

final_buyer = (
    buyer_dashboard_path
    .read_text(
        encoding="utf-8"
    )
)

final_admin = (
    admin_dashboard_path
    .read_text(
        encoding="utf-8"
    )
)

assert (
    "agriva_verified: boolean;"
    in final_market
)

assert (
    "data-agriva-verification-badge"
    in final_market
)

assert (
    "/dashboard/buyer/verification"
    in final_buyer
)

assert (
    "/dashboard/admin/buyer-verification"
    in final_admin
)

print()
print(
    "BUYER VERIFICATION UI REPAIR COMPLETE"
)

print(
    "Main Marketplace badge: PASS"
)

print(
    "Buyer dashboard link: PASS"
)

print(
    "Admin dashboard link: PASS"
)

print(
    "Match score changed: NO"
)

print(
    "Government/KYC claim added: NO"
)
