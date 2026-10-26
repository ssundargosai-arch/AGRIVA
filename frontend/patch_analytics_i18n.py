from pathlib import Path
import re
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\analytics\page.tsx"
)

backup = path.with_name(
    "page.before-analytics-i18n.tsx"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

# =========================================================
# 1. useLocale
# =========================================================

if 'from "next-intl"' not in text:
    text = text.replace(
        'import Link from "next/link";',
        'import Link from "next/link";\n'
        'import { useLocale } from "next-intl";'
    )

# =========================================================
# 2. LOCALIZED COPY
# =========================================================

copy_block = r'''
type AnalyticsLocale =
  | "en"
  | "hi"
  | "mr";

const ANALYTICS_COPY = {
  en: {
    loading: "Loading AGRIVA Analytics...",
    backDashboard: "Back to Farmer Dashboard",

    eyebrow: "AGRIVA Analytics Intelligence",
    title: "Smart Farm Performance Analytics",
    subtitle:
      "Understand revenue, expenses, profit, crop performance, buyer activity and farm health from one database-backed AGRIVA intelligence dashboard.",

    databaseBacked: "Database-backed Analytics",
    liveRecords: "Live AGRIVA farm & marketplace records",

    analysisPeriod: "Analysis Period",
    periodHint:
      "Switch the time window without changing the underlying data source.",

    periods: {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    },

    unavailable: "Analytics unavailable",
    refreshData: "Refresh Data",
    refreshing: "Refreshing...",

    farmOverview: "Farm Intelligence Overview",
    performanceSnapshot: "performance snapshot",
    overviewSource:
      "All figures below come from AGRIVA farm, crop, listing and completed-order records.",

    totalRevenue: "Total Revenue",
    completedCropSales: "Completed crop sales",
    totalExpenses: "Total Expenses",
    recordedExpenses: "Recorded farm expenses",
    netProfit: "Net Profit",
    revenueMinusExpenses: "Revenue minus expenses",
    profitMargin: "Profit Margin",
    profitShare: "Profit as share of revenue",
    roi: "ROI",
    roiHelper: "Return on recorded expenses",

    orders: "Orders",
    completed: "Completed",
    quantitySold: "Quantity Sold",
    farmArea: "Farm Area",
    crops: "Crops",
    activeListings: "Active Listings",

    financialIntelligence: "Financial Intelligence",
    revenueExpensesProfit: "Revenue, Expenses & Profit",
    financialDescription:
      "Financial movement for the {period} analytics period.",

    revenue: "Revenue",
    expenses: "Expenses",
    profit: "Profit",

    salesIntelligence: "Sales Intelligence",
    monthlySales: "Monthly Sales",
    monthlySalesDescription:
      "Revenue and completed order activity over time.",

    cropIntelligence: "Crop Intelligence",
    cropPerformance: "Crop Performance",
    cropPerformanceDescription:
      "Compare crop revenue and order activity.",

    buyerIntelligence: "Buyer Intelligence",
    buyerDistribution: "Buyer Distribution",
    buyerDescription:
      "See which buyers contribute most to completed crop revenue.",

    cropHealthIntelligence: "Crop Health Intelligence",
    farmHealth: "Farm Health",
    farmHealthDescription:
      "Current crop-health status distribution recorded by AGRIVA.",

    salesBreakdown: "Sales Breakdown",
    cropSalesDetails: "Crop Sales Details",
    cropSalesDescription:
      "Completed sales performance by crop.",

    topBuyer: "Top Buyer",
    crop: "Crop",

    noFinancial:
      "No financial series is available for this period.",
    noMonthlySales:
      "No monthly sales are available for this period.",
    noCropPerformance:
      "No crop performance is available for this period.",
    noBuyerActivity:
      "No completed buyer activity is available for this period.",
    noCropHealth:
      "No crop-health analysis is available yet.",
    noCropSales:
      "No crop sales are available for this period.",

    insightNoRevenue:
      "No completed crop revenue is available for this period yet. AGRIVA will populate these insights as orders are completed.",
    insightProfit:
      "Your farm is profitable in this period with a {margin} margin. Compare crop performance and buyer concentration before your next selling decision.",
    insightLoss:
      "Recorded expenses are higher than completed sales revenue in this period. Review high-cost activity and compare crop-level returns before the next sale.",
    insightBalanced:
      "Revenue and recorded expenses are currently balanced. Use crop and buyer analytics to identify the next opportunity for margin improvement.",

    footer:
      "AGRIVA Farmer Analytics • Database-backed intelligence",
  },

  hi: {
    loading: "AGRIVA विश्लेषण लोड हो रहा है...",
    backDashboard: "किसान डैशबोर्ड पर वापस जाएँ",

    eyebrow: "AGRIVA विश्लेषण इंटेलिजेंस",
    title: "स्मार्ट खेती प्रदर्शन विश्लेषण",
    subtitle:
      "आय, खर्च, लाभ, फसल प्रदर्शन, खरीदार गतिविधि और खेत की स्थिति को एक ही AGRIVA डेटाबेस-आधारित डैशबोर्ड में समझें।",

    databaseBacked: "डेटाबेस-आधारित विश्लेषण",
    liveRecords: "AGRIVA खेत और बाज़ार के लाइव रिकॉर्ड",

    analysisPeriod: "विश्लेषण अवधि",
    periodHint:
      "मूल डेटा स्रोत बदले बिना समय अवधि चुनें।",

    periods: {
      daily: "दैनिक",
      weekly: "साप्ताहिक",
      monthly: "मासिक",
      yearly: "वार्षिक",
    },

    unavailable: "विश्लेषण उपलब्ध नहीं है",
    refreshData: "डेटा रीफ्रेश करें",
    refreshing: "रीफ्रेश हो रहा है...",

    farmOverview: "खेत विश्लेषण सारांश",
    performanceSnapshot: "प्रदर्शन सारांश",
    overviewSource:
      "नीचे दिए गए आंकड़े AGRIVA के खेत, फसल, लिस्टिंग और पूर्ण ऑर्डर रिकॉर्ड से आते हैं।",

    totalRevenue: "कुल आय",
    completedCropSales: "पूर्ण फसल बिक्री",
    totalExpenses: "कुल खर्च",
    recordedExpenses: "दर्ज किए गए खेती खर्च",
    netProfit: "शुद्ध लाभ",
    revenueMinusExpenses: "आय में से खर्च घटाकर",
    profitMargin: "लाभ मार्जिन",
    profitShare: "आय में लाभ का प्रतिशत",
    roi: "ROI",
    roiHelper: "दर्ज खर्च पर रिटर्न",

    orders: "ऑर्डर",
    completed: "पूर्ण",
    quantitySold: "बेची गई मात्रा",
    farmArea: "खेत क्षेत्र",
    crops: "फसलें",
    activeListings: "सक्रिय लिस्टिंग",

    financialIntelligence: "वित्तीय विश्लेषण",
    revenueExpensesProfit: "आय, खर्च और लाभ",
    financialDescription:
      "{period} अवधि की वित्तीय गतिविधि।",

    revenue: "आय",
    expenses: "खर्च",
    profit: "लाभ",

    salesIntelligence: "बिक्री विश्लेषण",
    monthlySales: "मासिक बिक्री",
    monthlySalesDescription:
      "समय के अनुसार आय और पूर्ण ऑर्डर गतिविधि।",

    cropIntelligence: "फसल विश्लेषण",
    cropPerformance: "फसल प्रदर्शन",
    cropPerformanceDescription:
      "फसल आय और ऑर्डर गतिविधि की तुलना करें।",

    buyerIntelligence: "खरीदार विश्लेषण",
    buyerDistribution: "खरीदार वितरण",
    buyerDescription:
      "देखें कि पूर्ण फसल बिक्री की आय में किन खरीदारों का योगदान अधिक है।",

    cropHealthIntelligence: "फसल स्वास्थ्य विश्लेषण",
    farmHealth: "खेत की स्थिति",
    farmHealthDescription:
      "AGRIVA में दर्ज वर्तमान फसल स्वास्थ्य स्थिति।",

    salesBreakdown: "बिक्री विवरण",
    cropSalesDetails: "फसल बिक्री विवरण",
    cropSalesDescription:
      "फसल के अनुसार पूर्ण बिक्री प्रदर्शन।",

    topBuyer: "शीर्ष खरीदार",
    crop: "फसल",

    noFinancial:
      "इस अवधि के लिए वित्तीय डेटा उपलब्ध नहीं है।",
    noMonthlySales:
      "इस अवधि में मासिक बिक्री उपलब्ध नहीं है।",
    noCropPerformance:
      "इस अवधि के लिए फसल प्रदर्शन उपलब्ध नहीं है।",
    noBuyerActivity:
      "इस अवधि में पूर्ण खरीदार गतिविधि उपलब्ध नहीं है।",
    noCropHealth:
      "अभी फसल स्वास्थ्य विश्लेषण उपलब्ध नहीं है।",
    noCropSales:
      "इस अवधि में फसल बिक्री उपलब्ध नहीं है।",

    insightNoRevenue:
      "इस अवधि में अभी कोई पूर्ण फसल बिक्री आय उपलब्ध नहीं है। ऑर्डर पूर्ण होने पर AGRIVA जानकारी दिखाएगा।",
    insightProfit:
      "इस अवधि में आपका खेत {margin} लाभ मार्जिन के साथ लाभ में है। अगली बिक्री से पहले फसल प्रदर्शन और खरीदार वितरण की तुलना करें।",
    insightLoss:
      "इस अवधि में दर्ज खर्च पूर्ण बिक्री आय से अधिक है। अगली बिक्री से पहले अधिक खर्च वाली गतिविधियों और फसल रिटर्न की समीक्षा करें।",
    insightBalanced:
      "आय और दर्ज खर्च अभी संतुलित हैं। लाभ बढ़ाने के अगले अवसर के लिए फसल और खरीदार विश्लेषण देखें।",

    footer:
      "AGRIVA किसान विश्लेषण • डेटाबेस-आधारित इंटेलिजेंस",
  },

  mr: {
    loading: "AGRIVA विश्लेषण लोड होत आहे...",
    backDashboard: "शेतकरी डॅशबोर्डवर परत जा",

    eyebrow: "AGRIVA विश्लेषण इंटेलिजन्स",
    title: "स्मार्ट शेती कामगिरी विश्लेषण",
    subtitle:
      "उत्पन्न, खर्च, नफा, पीक कामगिरी, खरेदीदारांची हालचाल आणि शेताची स्थिती एका AGRIVA डेटाबेस-आधारित डॅशबोर्डमध्ये समजा.",

    databaseBacked: "डेटाबेस-आधारित विश्लेषण",
    liveRecords: "AGRIVA शेती आणि बाजारपेठेतील थेट नोंदी",

    analysisPeriod: "विश्लेषण कालावधी",
    periodHint:
      "मूळ डेटा स्रोत न बदलता कालावधी निवडा.",

    periods: {
      daily: "दैनिक",
      weekly: "साप्ताहिक",
      monthly: "मासिक",
      yearly: "वार्षिक",
    },

    unavailable: "विश्लेषण उपलब्ध नाही",
    refreshData: "डेटा रीफ्रेश करा",
    refreshing: "रीफ्रेश होत आहे...",

    farmOverview: "शेती विश्लेषण आढावा",
    performanceSnapshot: "कामगिरी आढावा",
    overviewSource:
      "खालील सर्व आकडे AGRIVA मधील शेती, पीक, लिस्टिंग आणि पूर्ण झालेल्या ऑर्डरच्या नोंदींवर आधारित आहेत.",

    totalRevenue: "एकूण उत्पन्न",
    completedCropSales: "पूर्ण झालेली पीक विक्री",
    totalExpenses: "एकूण खर्च",
    recordedExpenses: "नोंदवलेला शेती खर्च",
    netProfit: "निव्वळ नफा",
    revenueMinusExpenses: "उत्पन्नातून खर्च वजा करून",
    profitMargin: "नफा मार्जिन",
    profitShare: "उत्पन्नातील नफ्याचा वाटा",
    roi: "ROI",
    roiHelper: "नोंदवलेल्या खर्चावरील परतावा",

    orders: "ऑर्डर",
    completed: "पूर्ण",
    quantitySold: "विकलेले प्रमाण",
    farmArea: "शेती क्षेत्र",
    crops: "पिके",
    activeListings: "सक्रिय लिस्टिंग",

    financialIntelligence: "आर्थिक विश्लेषण",
    revenueExpensesProfit: "उत्पन्न, खर्च आणि नफा",
    financialDescription:
      "{period} कालावधीतील आर्थिक हालचाल.",

    revenue: "उत्पन्न",
    expenses: "खर्च",
    profit: "नफा",

    salesIntelligence: "विक्री विश्लेषण",
    monthlySales: "मासिक विक्री",
    monthlySalesDescription:
      "कालावधीनुसार उत्पन्न आणि पूर्ण ऑर्डरची हालचाल.",

    cropIntelligence: "पीक विश्लेषण",
    cropPerformance: "पीक कामगिरी",
    cropPerformanceDescription:
      "पीक उत्पन्न आणि ऑर्डर हालचालीची तुलना करा.",

    buyerIntelligence: "खरेदीदार विश्लेषण",
    buyerDistribution: "खरेदीदार वितरण",
    buyerDescription:
      "पूर्ण पीक विक्रीच्या उत्पन्नात कोणत्या खरेदीदारांचे योगदान जास्त आहे ते पहा.",

    cropHealthIntelligence: "पीक आरोग्य विश्लेषण",
    farmHealth: "शेताची स्थिती",
    farmHealthDescription:
      "AGRIVA मध्ये नोंदवलेले सध्याचे पीक आरोग्य वितरण.",

    salesBreakdown: "विक्री तपशील",
    cropSalesDetails: "पीक विक्री तपशील",
    cropSalesDescription:
      "पिकानुसार पूर्ण झालेल्या विक्रीची कामगिरी.",

    topBuyer: "सर्वोत्तम खरेदीदार",
    crop: "पीक",

    noFinancial:
      "या कालावधीसाठी आर्थिक डेटा उपलब्ध नाही.",
    noMonthlySales:
      "या कालावधीत मासिक विक्री उपलब्ध नाही.",
    noCropPerformance:
      "या कालावधीसाठी पीक कामगिरी उपलब्ध नाही.",
    noBuyerActivity:
      "या कालावधीत पूर्ण खरेदीदार हालचाल उपलब्ध नाही.",
    noCropHealth:
      "अद्याप पीक आरोग्य विश्लेषण उपलब्ध नाही.",
    noCropSales:
      "या कालावधीत पीक विक्री उपलब्ध नाही.",

    insightNoRevenue:
      "या कालावधीत अद्याप पूर्ण झालेल्या पीक विक्रीचे उत्पन्न उपलब्ध नाही. ऑर्डर पूर्ण झाल्यावर AGRIVA माहिती दाखवेल.",
    insightProfit:
      "या कालावधीत तुमची शेती {margin} नफा मार्जिनसह नफ्यात आहे. पुढील विक्रीपूर्वी पीक कामगिरी आणि खरेदीदार वितरण तपासा.",
    insightLoss:
      "या कालावधीत नोंदवलेला खर्च पूर्ण विक्री उत्पन्नापेक्षा जास्त आहे. पुढील विक्रीपूर्वी जास्त खर्चाच्या कामांचा आणि पीक परताव्याचा आढावा घ्या.",
    insightBalanced:
      "उत्पन्न आणि नोंदवलेला खर्च सध्या संतुलित आहे. नफा वाढवण्याच्या पुढील संधीसाठी पीक आणि खरेदीदार विश्लेषण पहा.",

    footer:
      "AGRIVA शेतकरी विश्लेषण • डेटाबेस-आधारित इंटेलिजन्स",
  },
} as const;

'''

if "const ANALYTICS_COPY =" not in text:
    text = text.replace(
        "function money(",
        copy_block + "\nfunction money(",
        1,
    )

# =========================================================
# 3. ACTIVE LOCALE
# =========================================================

router_pattern = re.compile(
    r'(\s+const router\s*=\s*useRouter\(\);)'
)

if "const locale = useLocale();" not in text:
    text, count = router_pattern.subn(
        r'''\1

  const locale = useLocale();

  const copy =
    ANALYTICS_COPY[
      locale === "hi" ||
      locale === "mr"
        ? locale
        : "en"
    ];''',
        text,
        count=1,
    )

    print("locale hook:", count)

# =========================================================
# 4. PERIOD BUTTONS
# =========================================================

text = text.replace(
    "{item.label}",
    "{copy.periods[item.value]}"
)

# =========================================================
# 5. HERO + HEADER TEXT
# =========================================================

simple_jsx = {
    "AGRIVA Analytics Intelligence":
        "{copy.eyebrow}",
    "Smart Farm Performance Analytics":
        "{copy.title}",
    "Database-backed Analytics":
        "{copy.databaseBacked}",
    "Live AGRIVA farm & marketplace records":
        "{copy.liveRecords}",
    "Farm Intelligence Overview":
        "{copy.farmOverview}",
}

for old, new in simple_jsx.items():
    text = text.replace(old, new)

text = re.sub(
    r'Understand\s+revenue,\s+expenses,\s+profit,\s+crop performance,\s+buyer\s+activity and farm health from one database-backed\s+AGRIVA\s+intelligence dashboard\.',
    "{copy.subtitle}",
    text,
)

text = re.sub(
    r'>\s*Analysis\s+Period\s*<',
    '>{copy.analysisPeriod}<',
    text,
)

text = re.sub(
    r'Switch\s+the time window without changing the underlying data source\.',
    '{copy.periodHint}',
    text,
)

text = re.sub(
    r'All\s+figures below come from AGRIVA farm,\s+crop,\s+listing\s+and completed-order records\.',
    '{copy.overviewSource}',
    text,
)

text = re.sub(
    r'>\s*Back to Farmer Dashboard\s*<',
    '>{copy.backDashboard}<',
    text,
)

text = text.replace(
    "Loading AGRIVA Analytics...",
    "{copy.loading}"
)

text = text.replace(
    "Analytics unavailable",
    "{copy.unavailable}"
)

# =========================================================
# 6. REFRESH
# =========================================================

text = text.replace(
    '"Refreshing..."',
    "copy.refreshing"
)

text = text.replace(
    '"Refresh Data"',
    "copy.refreshData"
)

# =========================================================
# 7. MAIN METRIC CARDS
# =========================================================

replacements = {
    'title="Total Revenue"':
        'title={copy.totalRevenue}',
    'helper="Completed crop sales"':
        'helper={copy.completedCropSales}',

    'title="Total Expenses"':
        'title={copy.totalExpenses}',
    'helper="Recorded farm expenses"':
        'helper={copy.recordedExpenses}',

    'title="Net Profit"':
        'title={copy.netProfit}',
    'helper="Revenue minus expenses"':
        'helper={copy.revenueMinusExpenses}',

    'title="Profit Margin"':
        'title={copy.profitMargin}',
    'helper="Profit as share of revenue"':
        'helper={copy.profitShare}',

    'title="ROI"':
        'title={copy.roi}',
    'helper="Return on recorded expenses"':
        'helper={copy.roiHelper}',

    'title="Orders"':
        'title={copy.orders}',

    'title="Completed"':
        'title={copy.completed}',

    'title="Quantity Sold"':
        'title={copy.quantitySold}',

    'title="Farm Area"':
        'title={copy.farmArea}',

    'title="Crops"':
        'title={copy.crops}',

    'title="Active Listings"':
        'title={copy.activeListings}',
}

for old, new in replacements.items():
    text = text.replace(old, new)

# =========================================================
# 8. SECTION TITLES
# =========================================================

section_replacements = {
    'eyebrow="Financial Intelligence"':
        'eyebrow={copy.financialIntelligence}',

    'title="Revenue, Expenses & Profit"':
        'title={copy.revenueExpensesProfit}',

    'eyebrow="Sales Intelligence"':
        'eyebrow={copy.salesIntelligence}',

    'title="Monthly Sales"':
        'title={copy.monthlySales}',

    'description="Revenue and completed order activity over time."':
        'description={copy.monthlySalesDescription}',

    'eyebrow="Crop Intelligence"':
        'eyebrow={copy.cropIntelligence}',

    'title="Crop Performance"':
        'title={copy.cropPerformance}',

    'description="Compare crop revenue and order activity."':
        'description={copy.cropPerformanceDescription}',

    'eyebrow="Buyer Intelligence"':
        'eyebrow={copy.buyerIntelligence}',

    'title="Buyer Distribution"':
        'title={copy.buyerDistribution}',

    'description="See which buyers contribute most to completed crop revenue."':
        'description={copy.buyerDescription}',

    'eyebrow="Crop Health Intelligence"':
        'eyebrow={copy.cropHealthIntelligence}',

    'title="Farm Health"':
        'title={copy.farmHealth}',

    'description="Current crop-health status distribution recorded by AGRIVA."':
        'description={copy.farmHealthDescription}',

    'eyebrow="Sales Breakdown"':
        'eyebrow={copy.salesBreakdown}',

    'title="Crop Sales Details"':
        'title={copy.cropSalesDetails}',

    'description="Completed sales performance by crop."':
        'description={copy.cropSalesDescription}',
}

for old, new in section_replacements.items():
    text = text.replace(old, new)

# Dynamic financial period description
text = re.sub(
    r'description=\{`Financial movement for the \$\{period\} analytics period\.`\}',
    'description={copy.financialDescription.replace("{period}", copy.periods[period])}',
    text,
)

# =========================================================
# 9. CHART LEGEND NAMES
# =========================================================

text = text.replace(
    'name="Revenue"',
    'name={copy.revenue}'
)

text = text.replace(
    'name="Expenses"',
    'name={copy.expenses}'
)

text = text.replace(
    'name="Profit"',
    'name={copy.profit}'
)

text = text.replace(
    'name="Orders"',
    'name={copy.orders}'
)

# =========================================================
# 10. EMPTY STATES
# =========================================================

empty_states = {
    'text="No financial series is available for this period."':
        'text={copy.noFinancial}',

    'text="No monthly sales are available for this period."':
        'text={copy.noMonthlySales}',

    'text="No crop performance is available for this period."':
        'text={copy.noCropPerformance}',

    'text="No completed buyer activity is available for this period."':
        'text={copy.noBuyerActivity}',

    'text="No crop-health analysis is available yet."':
        'text={copy.noCropHealth}',

    'text="No crop sales are available for this period."':
        'text={copy.noCropSales}',
}

for old, new in empty_states.items():
    text = text.replace(old, new)

# =========================================================
# 11. PERFORMANCE INSIGHT
# =========================================================

performance_pattern = re.compile(
    r'const performanceMessage\s*=\s*'
    r'useMemo\(\(\)\s*=>\s*\{.*?'
    r'\},\s*\[analytics\]\);',
    re.DOTALL,
)

performance_replacement = r'''const performanceMessage =
    useMemo(() => {
      if (!analytics) {
        return "";
      }

      const summary =
        analytics.summary;

      if (
        summary.total_revenue <=
        0
      ) {
        return copy.insightNoRevenue;
      }

      if (
        summary.net_profit >
        0
      ) {
        return copy.insightProfit.replace(
          "{margin}",
          percent(
            summary.profit_margin
          )
        );
      }

      if (
        summary.net_profit <
        0
      ) {
        return copy.insightLoss;
      }

      return copy.insightBalanced;
    }, [analytics, copy]);'''

text, performance_count = (
    performance_pattern.subn(
        performance_replacement,
        text,
        count=1,
    )
)

print(
    "performance insight:",
    performance_count
)

# =========================================================
# 12. TOP BUYER + TABLE HEADERS
# =========================================================

text = re.sub(
    r'>\s*Top\s+Buyer\s*<',
    '>{copy.topBuyer}<',
    text,
)

table_headings = {
    "Crop": "copy.crop",
    "Orders": "copy.orders",
    "Quantity Sold": "copy.quantitySold",
    "Revenue": "copy.revenue",
}

for label, key in table_headings.items():
    pattern = (
        r'(<TableHeading>\s*)'
        + re.escape(label)
        + r'(\s*</TableHeading>)'
    )

    text = re.sub(
        pattern,
        rf'\1{{{key}}}\2',
        text,
    )

# =========================================================
# 13. FOOTER
# =========================================================

text = text.replace(
    "AGRIVA Farmer Analytics • Database-backed intelligence",
    "{copy.footer}"
)

# =========================================================
# SAVE UTF-8
# =========================================================

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print(
    "ANALYTICS EN/HI/MR LOCALIZATION PATCH COMPLETE"
)
print(
    "Backup:",
    backup
)
