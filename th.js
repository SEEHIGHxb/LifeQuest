// th.js - Thai translation dictionary.
//
// Keys are the exact canonical English strings used in the code (see
// i18n.js). Parameterized keys keep their {placeholder} tokens. Survey
// instruments follow the standard Thai wording where an official Thai
// version exists (WHO-5, ST-5 from the Thai DMH, GSE, UCLA-3, LSNS-6).
// Benchmark SOURCE labels stay in English on purpose (literature citations).

export const TH = {
  // --- Duty-of-care mental-health support (finding #4) ---
  "If things feel heavy, you don't have to face it alone": "ถ้ารู้สึกหนักใจ คุณไม่จำเป็นต้องเผชิญมันเพียงลำพัง",
  "Your recent well-being and stress answers suggest you may be going through a difficult time. This is a self-check, not a diagnosis — talking to a professional can help.": "คำตอบเรื่องสุขภาวะและความเครียดล่าสุดของคุณ บ่งชี้ว่าคุณอาจกำลังเผชิญช่วงเวลาที่ยากลำบาก นี่เป็นเพียงการประเมินตนเอง ไม่ใช่การวินิจฉัย การพูดคุยกับผู้เชี่ยวชาญสามารถช่วยได้",
  "Dept. of Mental Health hotline (free, 24 hrs)": "สายด่วนสุขภาพจิต กรมสุขภาพจิต (ฟรี ตลอด 24 ชม.)",
  "Samaritans of Thailand": "สมาคมสะมาริตันส์แห่งประเทศไทย",
  "Medical emergency": "เหตุฉุกเฉินทางการแพทย์",
  "Mental health support": "การสนับสนุนด้านสุขภาพจิต",
  // --- Instrument-fidelity disclosures (finding #8) ---
  "Grit (perseverance)": "ความมุ่งมั่น (ด้านความเพียร)",
  "Perseverance facet only — {g}/5 vs the ~3.4 full-scale reference": "เฉพาะด้านความเพียร — {g}/5 เทียบกับค่าอ้างอิงฉบับเต็ม ~3.4",
  "Raw {n}/20 — converted with the CFPB's official scoring table (self-administered)": "คะแนนดิบ {n}/20 — แปลงด้วยตารางคะแนนทางการของ CFPB (แบบตอบด้วยตนเอง)",
  "Full 10-item scale — raw {n}/40, converted with the CFPB's official scoring table": "แบบเต็ม 10 ข้อ — คะแนนดิบ {n}/40 แปลงด้วยตารางคะแนนทางการของ CFPB",
  "Grit {g}/5 from your full 12-item scale vs the ~3.4 adult reference point.": "ความมุ่งมั่น {g}/5 จากแบบวัดฉบับเต็ม 12 ข้อ เทียบกับค่าอ้างอิงผู้ใหญ่ ~3.4",
  "Grit {g}/5 — the onboarding measure is the perseverance facet only (4 of the 8 Grit-S items), so this is indicative, not an exact match to the ~3.4 reference.": "ความมุ่งมั่น {g}/5 — แบบวัดตอนเริ่มต้นครอบคลุมเฉพาะด้านความเพียร (4 จาก 8 ข้อของ Grit-S) จึงเป็นเพียงค่าชี้บ่ง ไม่ใช่การเทียบตรงกับค่าอ้างอิง ~3.4",
  // --- Core-surface i18n leaks fixed (finding #10) ---
  "Life Balance Index": "ดัชนีสมดุลชีวิต",
  "Lv.": "Lv.",
  "Points: {xp} / {needed}": "คะแนน: {xp} / {needed}",
  "S-Rank": "ระดับ S",
  "A-Rank": "ระดับ A",
  "B-Rank": "ระดับ B",
  "C-Rank": "ระดับ C",
  "D-Rank": "ระดับ D",
  // Recovery banner + storage-error toast (findings #1/#2, now translated)
  "We found earlier data we couldn't open after an update. Download it before it's replaced.": "เราพบข้อมูลเก่าที่เปิดไม่ได้หลังการอัปเดต ดาวน์โหลดเก็บไว้ก่อนที่จะถูกแทนที่",
  "Download old data": "ดาวน์โหลดข้อมูลเก่า",
  "Old data downloaded.": "ดาวน์โหลดข้อมูลเก่าแล้ว",
  "Dismiss": "ปิด",
  "Your device wouldn't save that change — storage may be full or you're in private mode. Export a backup to avoid losing progress.": "อุปกรณ์ของคุณบันทึกการเปลี่ยนแปลงนั้นไม่ได้ — พื้นที่จัดเก็บอาจเต็มหรือคุณอยู่ในโหมดส่วนตัว ส่งออกข้อมูลสำรองเพื่อไม่ให้ความคืบหน้าสูญหาย",
  // Age is collected but no benchmark norm uses it yet, so the label no
  // longer implies it does (review LOW finding).
  "Age": "อายุ",
  // --- Chart accessible names (review finding: SVGs were silent to AT) ---
  "Trend chart: {n} weekly snapshot(s), latest score {latest} of 100": "แผนภูมิแนวโน้ม: สแนปช็อตรายสัปดาห์ {n} รายการ คะแนนล่าสุด {latest} จาก 100",
  "Radar chart of the eight aspect scores: {summary}": "แผนภูมิเรดาร์คะแนนทั้งแปดด้าน: {summary}",
  "Radar chart of the eight aspect scores: {summary}. Dashed outline shows the population average: {avgSummary}": "แผนภูมิเรดาร์คะแนนทั้งแปดด้าน: {summary} เส้นประแสดงค่าเฉลี่ยของประชากร: {avgSummary}",
  // --- Radar legend (population-average overlay) ---
  "Your scores": "คะแนนของคุณ",
  "Population average": "ค่าเฉลี่ยของประชากร",
  "Average estimated from cited population statistics — see Methodology.": "ค่าเฉลี่ยประมาณจากสถิติประชากรที่มีการอ้างอิง — ดูหน้าระเบียบวิธี",
  "The dashed outline on the dashboard radar is a derived population average: a reference person assembled from the same cited statistics (median income, typical activity levels, published questionnaire means) is scored through the exact formulas that score you.": "เส้นประบนแผนภูมิเรดาร์หน้าภาพรวมคือค่าเฉลี่ยของประชากรที่ประมาณขึ้น: บุคคลอ้างอิงที่ประกอบขึ้นจากสถิติที่มีการอ้างอิงชุดเดียวกัน (รายได้มัธยฐาน ระดับกิจกรรมทางกายทั่วไป ค่าเฉลี่ยของแบบสอบถามที่ตีพิมพ์) จะถูกคำนวณผ่านสูตรเดียวกับที่ใช้คำนวณคะแนนของคุณ",
  "Behavior-driven aspects are re-measured by the weekly review: the quantities you report replace last week's values inside the same formulas, so a score moves exactly as much as the measured change implies — never by flat per-log bonuses.": "ด้านที่ขับเคลื่อนด้วยพฤติกรรมจะถูกวัดใหม่ผ่านการทบทวนรายสัปดาห์: ปริมาณที่คุณรายงานจะแทนที่ค่าของสัปดาห์ก่อนในสูตรเดียวกัน คะแนนจึงขยับเท่าที่การเปลี่ยนแปลงที่วัดได้บ่งชี้เท่านั้น — ไม่ใช่โบนัสคงที่ต่อการบันทึก",
  // --- Footer (privacy/source/version reachable from the app) ---
  "Privacy & Data": "ความเป็นส่วนตัวและข้อมูล",
  "Source code & license": "ซอร์สโค้ดและสัญญาอนุญาต",
  "Version {v}": "เวอร์ชัน {v}",
  // --- Accessibility route announcer (finding #12) ---
  "Re-assessment": "การประเมินซ้ำ",
  "In-depth assessment": "การประเมินเชิงลึก",
  "{view} view": "หน้า {view}",
  // --- App chrome (header, tabs, dialogs) ---
  "Life Balance Index — Personal Wellbeing Assessment": "ดัชนีสมดุลชีวิต — แบบประเมินสุขภาวะส่วนบุคคล",
  "Personal Wellbeing Assessment": "แบบประเมินสุขภาวะส่วนบุคคล",
  "Export": "ส่งออก",
  "Import": "นำเข้า",
  "Reset Data": "ล้างข้อมูล",
  "Overview": "ภาพรวม",
  "Activity Log": "บันทึกกิจกรรม",
  "Goals": "เป้าหมาย",
  "Peer Comparison": "เปรียบเทียบกับผู้อื่น",
  "Are you sure you want to erase all records and your baseline assessment? This cannot be undone.":
    "แน่ใจหรือไม่ว่าต้องการลบบันทึกทั้งหมดและแบบประเมินพื้นฐานของคุณ? การกระทำนี้ย้อนกลับไม่ได้",
  "Importing a backup replaces ALL current data. Continue?": "การนำเข้าข้อมูลสำรองจะแทนที่ข้อมูลปัจจุบันทั้งหมด ดำเนินการต่อหรือไม่?",
  "Data exported.": "ส่งออกข้อมูลแล้ว",
  "Data imported successfully.": "นำเข้าข้อมูลสำเร็จ",
  "Import failed: {msg}": "นำเข้าไม่สำเร็จ: {msg}",
  "Activity recorded: +{xp} points{detail}.": "บันทึกกิจกรรมแล้ว: +{xp} คะแนน{detail}",
  "Re-assessment complete: {parts} (+40 points)": "ประเมินซ้ำเสร็จสิ้น: {parts} (+40 คะแนน)",
  "Re-assessment needs a baseline — complete the initial assessment first.": "การประเมินซ้ำต้องมีข้อมูลพื้นฐานก่อน — กรุณาทำแบบประเมินเริ่มต้นให้เสร็จก่อน",
  // Level is the user's age now, so this moment is a birthday, not an
  // achievement. The copy carries no grading and no "you earned this".
  "Happy birthday": "สุขสันต์วันเกิด",
  "A new year starts today. Your points reset for the year ahead — last year is saved below, not lost.":
    "ปีใหม่ของคุณเริ่มต้นวันนี้ คะแนนจะเริ่มนับใหม่สำหรับปีที่กำลังมาถึง — ปีที่ผ่านมาถูกบันทึกไว้ด้านล่าง ไม่ได้หายไป",
  "AGE {n}": "อายุ {n}",
  "Year {level} filed: {xp} points": "บันทึกปีอายุ {level}: {xp} คะแนน",
  "Your age band changed, so the finance score was recalculated.":
    "ช่วงอายุของคุณเปลี่ยนไป คะแนนด้านการเงินจึงถูกคำนวณใหม่",
  "Continue": "ดำเนินการต่อ",
  'Goal completed: "{title}" (+{xp} points)': 'บรรลุเป้าหมาย: "{title}" (+{xp} คะแนน)',

  // --- Proficiency tiers ---
  "Foundational": "ระดับพื้นฐาน",
  "Developing": "กำลังพัฒนา",
  "Progressing": "ก้าวหน้า",
  "Proficient": "ชำนาญ",
  "Advanced": "ขั้นสูง",
  "Distinguished": "ดีเด่น",
  "Exemplary": "เป็นแบบอย่าง",

  // --- Aspects ---
  "Finance": "การเงิน",
  "Physical": "ร่างกาย",
  "Mental": "จิตใจ",
  "Relationships": "ความสัมพันธ์",
  "Personal Goals": "เป้าหมายส่วนตัว",
  "Social Contribution": "การช่วยเหลือสังคม",
  "Environment": "สิ่งแวดล้อม",
  "Humanity's Future": "อนาคตมนุษยชาติ",
  "Income standing, financial well-being, and savings habits.": "สถานะรายได้ สุขภาวะทางการเงิน และนิสัยการออม",
  "Weekly activity, body composition, sleep, and nutrition.": "กิจกรรมรายสัปดาห์ องค์ประกอบร่างกาย การนอน และโภชนาการ",
  "Well-being (WHO-5) and stress resilience (Thai DMH ST-5).": "สุขภาวะ (WHO-5) และความทนทานต่อความเครียด (ST-5 กรมสุขภาพจิต)",
  "Social network strength, loneliness, and romantic satisfaction.": "ความแข็งแรงของเครือข่ายสังคม ความเหงา และความพึงพอใจในความรัก",
  "Self-efficacy, grit, and active learning habits.": "การรับรู้ความสามารถของตนเอง ความมุ่งมั่น และนิสัยการเรียนรู้",
  "Giving, volunteering, and prosocial habits.": "การให้ การอาสา และพฤติกรรมเพื่อสังคม",
  "Plastic footprint and everyday green behavior.": "การใช้พลาสติกและพฤติกรรมรักษ์โลกในชีวิตประจำวัน",
  "Future skills, long-term security, and future orientation.": "ทักษะแห่งอนาคต ความมั่นคงระยะยาว และการมองการณ์ไกล",

  // --- Profile values shown on the dashboard ---
  "Bangkok": "กรุงเทพฯ",
  "Provinces": "ต่างจังหวัด",
  "Office Worker": "พนักงานออฟฟิศ",
  "Freelancer": "ฟรีแลนซ์",
  "Business Owner": "เจ้าของธุรกิจ",
  "Unemployed": "ว่างงาน",
  "Single": "โสด",
  "Coupled": "มีคู่",

  // --- Onboarding ---
  "PERSONAL WELLBEING ASSESSMENT": "แบบประเมินสุขภาวะส่วนบุคคล",
  "Baseline Assessment": "แบบประเมินพื้นฐาน",
  "Step 1: Profile & Finance": "ขั้นที่ 1: ข้อมูลส่วนตัวและการเงิน",
  "Step {n} of {total}": "ขั้นที่ {n} จาก {total}",
  "About 5 minutes total": "ใช้เวลาทั้งหมดประมาณ 5 นาที",
  "You can finish here anytime": "คุณจบตรงนี้เมื่อไรก็ได้",
  "See my results now": "ดูผลลัพธ์ของฉันเลย",
  "Optional": "ไม่บังคับ",
  "We start with income and demographics so your scores can be compared against real population benchmarks.": "เราเริ่มจากรายได้และข้อมูลประชากร เพื่อให้เทียบคะแนนของคุณกับเกณฑ์มาตรฐานประชากรจริงได้",
  "A few body and activity numbers place your physical health against national norms.": "ตัวเลขร่างกายและกิจกรรมเพียงไม่กี่ข้อ ช่วยวัดสุขภาพกายของคุณเทียบกับเกณฑ์ระดับประเทศ",
  "Two validated screens (ST-5, WHO-5) estimate stress and well-being. This is a self-check, not a diagnosis.": "แบบคัดกรองที่ผ่านการรับรองสองชุด (ST-5, WHO-5) ประเมินความเครียดและสุขภาวะ นี่เป็นการตรวจสอบตนเอง ไม่ใช่การวินิจฉัย",
  "Optional — you can see your results now, or answer to score social connection and loneliness.": "ไม่บังคับ — คุณดูผลลัพธ์เลยก็ได้ หรือจะตอบเพื่อประเมินความสัมพันธ์ทางสังคมและความเหงา",
  "Optional — self-efficacy and perseverance, plus your weekly learning habits.": "ไม่บังคับ — ความเชื่อมั่นในความสามารถและความมุ่งมั่น พร้อมนิสัยการเรียนรู้รายสัปดาห์",
  "Optional — prosocial habits, everyday environmental behavior, and your long-term outlook.": "ไม่บังคับ — พฤติกรรมช่วยเหลือสังคม การดูแลสิ่งแวดล้อมในชีวิตประจำวัน และมุมมองระยะยาว",
  "Quick-start results.": "ผลลัพธ์แบบเริ่มเร็ว",
  "Aspects beyond your first sections use baseline estimates. Log routines to shape them, and monthly re-assessments refine your survey scores over time.": "ด้านที่อยู่นอกเหนือช่วงแรกใช้ค่าประมาณพื้นฐาน บันทึกกิจวัตรเพื่อปรับให้ตรงขึ้น และการประเมินซ้ำรายเดือนจะปรับคะแนนแบบสอบถามของคุณให้แม่นยำขึ้นเมื่อเวลาผ่านไป",
  "points": "คะแนน",
  "Name": "ชื่อ",
  "E.g., Alex": "เช่น อเล็กซ์",
  "Guest": "ผู้มาเยือน",
  "Age (for population benchmarks)": "อายุ (ใช้เทียบสถิติประชากร)",
  "Gender (for benchmark norms)": "เพศ (ใช้เทียบเกณฑ์มาตรฐาน)",
  "Prefer not to say": "ไม่ระบุ",
  "Male": "ชาย",
  "Female": "หญิง",
  "Primary Region (Cost of Living Mapping)": "ภูมิภาคหลัก (ใช้เทียบค่าครองชีพ)",
  "Provinces / Upcountry Thailand": "ต่างจังหวัด",
  "Bangkok & Vicinity": "กรุงเทพฯ และปริมณฑล",
  "Employment Status": "สถานะการทำงาน",
  "Office Worker / Salary Employee": "พนักงานออฟฟิศ / พนักงานประจำ",
  "Freelancer / Independent": "ฟรีแลนซ์ / อาชีพอิสระ",
  "Business Owner / Entrepreneur": "เจ้าของธุรกิจ / ผู้ประกอบการ",
  "Unemployed / Looking for Work": "ว่างงาน / กำลังหางาน",
  "Student": "นักเรียน/นักศึกษา",
  "Relationship Status": "สถานะความสัมพันธ์",
  "In a Relationship / Married": "มีแฟน / แต่งงานแล้ว",
  "Monthly Individual Income (Net THB)": "รายได้ส่วนตัวต่อเดือน (บาทสุทธิ)",
  "Monthly Savings Rate (% of Income)": "อัตราการออมต่อเดือน (% ของรายได้)",
  "Step 2: Physical Baseline": "ขั้นที่ 2: พื้นฐานร่างกาย",
  "Height (cm)": "ส่วนสูง (ซม.)",
  "Weight (kg)": "น้ำหนัก (กก.)",
  "Average Nightly Sleep (Hours)": "ชั่วโมงนอนเฉลี่ยต่อคืน",
  "Vegetable/Fruit Portions per Day": "ผัก/ผลไม้ต่อวัน (ส่วน)",
  "Water Intake per Day (Liters)": "น้ำดื่มต่อวัน (ลิตร)",
  "Weekly Physical Activity (IPAQ)": "กิจกรรมทางกายรายสัปดาห์ (IPAQ)",
  "Vigorous Exercise (Days/Week)": "ออกกำลังหนัก (วัน/สัปดาห์)",
  "Vigorous Minutes per Day": "นาทีที่ออกกำลังหนักต่อวัน",
  "Moderate Exercise (Days/Week)": "ออกกำลังปานกลาง (วัน/สัปดาห์)",
  "Moderate Minutes per Day": "นาทีที่ออกกำลังปานกลางต่อวัน",
  "Walking (Days/Week)": "เดิน (วัน/สัปดาห์)",
  "Walking Minutes per Day": "นาทีที่เดินต่อวัน",
  "Step 3: Mental Well-Being": "ขั้นที่ 3: สุขภาพจิต",
  "Step 4: Relationships": "ขั้นที่ 4: ความสัมพันธ์",
  "Step 5: Goals & Learning": "ขั้นที่ 5: เป้าหมายและการเรียนรู้",
  "Weekly Learning / Study Hours": "ชั่วโมงเรียนรู้/ศึกษาต่อสัปดาห์",
  "Digital Literacy Self-Rating (0-100)": "ประเมินทักษะดิจิทัลของตนเอง (0-100)",
  "Step 6: Contribution, Environment & Future": "ขั้นที่ 6: สังคม สิ่งแวดล้อม และอนาคต",
  "Monthly Donations (THB)": "เงินบริจาคต่อเดือน (บาท)",
  "Volunteering Hours per Month": "ชั่วโมงจิตอาสาต่อเดือน",
  "Single-Use Plastic Items per Day": "พลาสติกใช้ครั้งเดียวต่อวัน (ชิ้น)",
  "Long-term pension / retirement products (SSF, RMF, stock portfolio)?": "มีผลิตภัณฑ์บำนาญ/เกษียณระยะยาว (SSF, RMF, พอร์ตหุ้น) หรือไม่?",
  "No, not yet planning pension": "ยังไม่มี ยังไม่ได้วางแผนเกษียณ",
  "Yes, retirement assets secured": "มีแล้ว มีสินทรัพย์เพื่อเกษียณ",
  "Back": "ย้อนกลับ",
  "Next": "ถัดไป",
  "Complete Assessment": "ทำแบบประเมินให้เสร็จ",
  "Assessment Error: ": "แบบประเมินผิดพลาด: ",

  // --- Survey option scales ---
  "Describes me completely": "ตรงกับฉันที่สุด",
  "Describes me very well": "ตรงกับฉันมาก",
  "Somewhat": "ปานกลาง",
  "Very little": "ตรงเพียงเล็กน้อย",
  "Not at all": "ไม่ตรงเลย",
  "Always": "เสมอ",
  "Often": "บ่อยครั้ง",
  "Sometimes": "บางครั้ง",
  "Rarely": "นาน ๆ ครั้ง",
  "Never": "ไม่เคย",
  "Very often": "บ่อยมาก",
  "Rarely / Not at all": "แทบไม่มี / ไม่มีเลย",
  "Not at all (0 days)": "ไม่มีเลย (0 วัน)",
  "Uniform answers detected.": "ตรวจพบคำตอบแบบเดียวกันทั้งหมด",
  "Some questionnaire answers all sat on the same option, so they are not counted as a confirmed measurement. Re-answer them honestly to confirm this score.":
    "คำตอบบางชุดเลือกตัวเลือกเดียวกันทุกข้อ จึงยังไม่ถูกนับเป็นผลวัดที่ยืนยันแล้ว โปรดตอบใหม่ตามความเป็นจริงเพื่อยืนยันคะแนนนี้",
  "Some answers all sat on the same option, so that questionnaire was not counted. Vary your answers to reflect your real experience and save again.":
    "คำตอบทั้งหมดเลือกตัวเลือกเดียวกันทุกข้อ แบบสอบถามชุดนั้นจึงไม่ถูกนับ โปรดตอบให้ตรงกับประสบการณ์จริงแล้วบันทึกอีกครั้ง",

  // --- Methodology page (#/methodology) ---
  "Methodology": "ระเบียบวิธี",
  "How scores are measured": "คะแนนวัดอย่างไร",
  "Each aspect score (0-100) combines published, validated questionnaires with facts you report about your life. This page shows every instrument, how it is scored, how the parts are weighted, and the known limitations — so no number is a black box.":
    "คะแนนแต่ละด้าน (0-100) มาจากแบบสอบถามมาตรฐานที่ตีพิมพ์แล้ว ร่วมกับข้อมูลจริงที่คุณรายงาน หน้านี้แสดงเครื่องมือทุกชิ้น วิธีคิดคะแนน น้ำหนักของแต่ละส่วน และข้อจำกัดที่ทราบ — เพื่อให้ไม่มีตัวเลขใดเป็นกล่องดำ",
  "This is a self-reflection tool, not a medical or psychological diagnosis. If a score worries you, treat it as a prompt to talk to a professional, not as a verdict.":
    "นี่คือเครื่องมือสำรวจตนเอง ไม่ใช่การวินิจฉัยทางการแพทย์หรือจิตวิทยา หากคะแนนใดทำให้กังวล โปรดถือเป็นสัญญาณให้ปรึกษาผู้เชี่ยวชาญ ไม่ใช่คำตัดสิน",
  "The eight aspects": "แปดด้านของชีวิต",
  "60% income percentile (lognormal model calibrated to Thai Labour Force Survey wages) + 40% CFPB Financial Well-Being score (official age-banded table) + a savings-rate bonus of up to 10 points.":
    "60% เปอร์เซ็นไทล์รายได้ (แบบจำลอง lognormal เทียบค่าจ้างจากการสำรวจภาวะการทำงานของไทย) + 40% คะแนนสุขภาวะทางการเงิน CFPB (ตารางทางการแยกช่วงอายุ) + โบนัสอัตราการออมสูงสุด 10 คะแนน",
  "Objective standing is weighted above sentiment; the savings bonus rewards a habit you fully control.":
    "ให้น้ำหนักสถานะที่วัดได้จริงมากกว่าความรู้สึก และโบนัสการออมให้รางวัลกับนิสัยที่คุณควบคุมได้เอง",
  "40% activity (IPAQ MET-minutes vs the WHO 600 guideline) + 20% Asian-BMI band + 20% sleep (Jenkins Sleep Scale + reported duration) + 20% nutrition (vegetables + water). Missing measurements are omitted and the weights renormalized — never faked.":
    "40% การเคลื่อนไหว (MET-นาทีตาม IPAQ เทียบเกณฑ์ WHO 600) + 20% ช่วง BMI เอเชีย + 20% การนอน (Jenkins Sleep Scale + ชั่วโมงนอนที่รายงาน) + 20% โภชนาการ (ผัก + น้ำ) ค่าที่ไม่ได้กรอกจะถูกตัดออกและกระจายน้ำหนักใหม่ ไม่มีการแต่งตัวเลขแทน",
  "Activity carries the most weight because it has the strongest evidence base and is the component your weekly review re-measures most directly.":
    "การเคลื่อนไหวได้น้ำหนักมากที่สุดเพราะมีหลักฐานวิชาการแข็งแรงที่สุด และเป็นส่วนที่การทบทวนรายสัปดาห์วัดใหม่ได้ตรงที่สุด",
  "50% WHO-5 well-being + 50% ST-5 stress resilience (Thai DMH cutoffs, inverted so calmer scores higher). The in-depth PSS-10 refines the stress half when completed.":
    "50% สุขภาวะ WHO-5 + 50% ความทนทานต่อความเครียด ST-5 (เกณฑ์กรมสุขภาพจิต กลับด้านให้ยิ่งสงบยิ่งคะแนนสูง) แบบประเมินเชิงลึก PSS-10 จะละเอียดขึ้นเมื่อทำครบ",
  "An equal split of positive well-being and stress keeps one bad week from dominating the score.":
    "การแบ่งครึ่งระหว่างสุขภาวะเชิงบวกกับความเครียด ทำให้สัปดาห์แย่ ๆ สัปดาห์เดียวไม่ครอบงำคะแนน",
  "40% social network (LSNS-6) + 30% low loneliness (UCLA-3) + 30% relationship satisfaction (RAS, couples only). Singles reweight to 50/50 — being single is never penalized.":
    "40% เครือข่ายสังคม (LSNS-6) + 30% ความเหงาต่ำ (UCLA-3) + 30% ความพึงพอใจในความสัมพันธ์ (RAS เฉพาะคู่รัก) คนโสดกระจายน้ำหนักเป็น 50/50 — ความโสดไม่ถูกหักคะแนน",
  "Network size and felt loneliness measure different things; both matter, so neither dominates.":
    "ขนาดเครือข่ายกับความเหงาที่รู้สึกวัดคนละสิ่ง ทั้งคู่สำคัญจึงไม่ให้ด้านใดครอบงำ",
  "40% self-efficacy (GSE) + 30% grit (Grit-S perseverance facet) + 30% active learning (weekly study hours + self-rated digital literacy). The in-depth section adds the full GSE-10, Grit-12, and Rosenberg self-esteem.":
    "40% การรับรู้ความสามารถของตน (GSE) + 30% ความมุ่งมั่น (Grit-S ด้านความเพียร) + 30% การเรียนรู้ (ชั่วโมงเรียนต่อสัปดาห์ + ทักษะดิจิทัลที่ประเมินเอง) แบบประเมินเชิงลึกเพิ่ม GSE-10, Grit-12 และความภาคภูมิใจในตนเองของ Rosenberg",
  "Belief you can act, persistence, and actual learning time together approximate progress toward goals.":
    "ความเชื่อว่าทำได้ ความเพียร และเวลาเรียนรู้จริง รวมกันสะท้อนความคืบหน้าสู่เป้าหมาย",
  "40% donations (frequency + amount vs income) + 40% action (volunteering hours + helping behavior) + 20% civic participation.":
    "40% การบริจาค (ความถี่ + จำนวนเทียบรายได้) + 40% การลงมือทำ (ชั่วโมงจิตอาสา + พฤติกรรมช่วยเหลือ) + 20% การมีส่วนร่วมทางสังคม",
  "Giving money and giving time are weighted equally; civic habits count but are the hardest to self-report accurately.":
    "การให้เงินกับการให้เวลาได้น้ำหนักเท่ากัน ส่วนกิจกรรมพลเมืองนับด้วยแต่รายงานเองได้แม่นยำยากที่สุด",
  "40% waste (daily single-use plastics vs the ~3/day Thai average + recycling habits) + 40% transit choices + 20% conservation habits.":
    "40% ขยะ (พลาสติกใช้ครั้งเดียวต่อวันเทียบค่าเฉลี่ยไทย ~3 ชิ้น/วัน + นิสัยแยกขยะ) + 40% การเลือกการเดินทาง + 20% นิสัยประหยัดพลังงาน",
  "Plastics and transport dominate the part of an individual Thai footprint that daily habits can actually change.":
    "พลาสติกกับการเดินทางคือส่วนใหญ่ของรอยเท้าสิ่งแวดล้อมรายบุคคลที่นิสัยประจำวันเปลี่ยนได้จริง",
  "25% future skills + 25% legacy actions + 25% future-oriented giving + 25% long-term security (retirement investments). The in-depth CFC-12 adds a validated future-orientation reading.":
    "25% ทักษะแห่งอนาคต + 25% การสร้างมรดกเชิงบวก + 25% การให้เพื่อคนรุ่นหลัง + 25% ความมั่นคงระยะยาว (การลงทุนเกษียณ) แบบประเมินเชิงลึก CFC-12 เพิ่มการวัดมุมมองต่ออนาคตที่ผ่านการตรวจสอบแล้ว",
  "Four equal parts because there is no published evidence for ranking them — an honest uniform prior.":
    "สี่ส่วนเท่ากันเพราะยังไม่มีหลักฐานตีพิมพ์ที่บอกว่าอะไรสำคัญกว่า — จึงให้น้ำหนักเท่ากันอย่างตรงไปตรงมา",
  "App-authored behavioral items — not a standardized instrument. Read this aspect as a habits index, not a validated psychological measure.":
    "ชุดคำถามพฤติกรรมที่แอปสร้างเอง — ไม่ใช่เครื่องมือมาตรฐาน โปรดอ่านด้านนี้เป็นดัชนีนิสัย ไม่ใช่การวัดทางจิตวิทยาที่ผ่านการตรวจสอบ",
  "Confidence, benchmarks, and answer quality": "ความเชื่อมั่น เกณฑ์เปรียบเทียบ และคุณภาพคำตอบ",
  "Every score carries a confidence tier: High (you answered everything), Partial, Estimated (defaults stood in), or Verified (you completed the full-length in-depth instruments).":
    "ทุกคะแนนมีระดับความเชื่อมั่น: สูง (ตอบครบ), บางส่วน, ประมาณการ (ใช้ค่าเริ่มต้นแทน) หรือยืนยันแล้ว (ทำแบบประเมินเชิงลึกฉบับเต็มครบ)",
  "Society percentiles are honest approximations against cited published statistics — each benchmark names its method and sources, and the band around it is an indicative range, not a statistical confidence interval.":
    "เปอร์เซ็นไทล์เทียบสังคมเป็นการประมาณอย่างตรงไปตรงมาจากสถิติที่ตีพิมพ์และอ้างอิงได้ — แต่ละเกณฑ์ระบุวิธีและแหล่งที่มา และช่วงคะแนนเป็นช่วงบ่งชี้ ไม่ใช่ช่วงความเชื่อมั่นทางสถิติ",
  "Answer quality is checked: a questionnaire answered with the same option on every row (despite reverse-worded questions) is not counted as a confirmed measurement until re-answered.":
    "มีการตรวจคุณภาพคำตอบ: แบบสอบถามที่เลือกตัวเลือกเดียวกันทุกข้อ (ทั้งที่มีข้อกลับความหมาย) จะไม่ถูกนับเป็นผลวัดที่ยืนยัน จนกว่าจะตอบใหม่",
  "Measurement stability": "ความเสถียรของการวัด",
  "Across your {count} re-assessment(s), survey-based scores shifted by an average of {avg} points (each shift is capped at ±15). Smaller average shifts mean the measurement is stable for you.":
    "จากการประเมินซ้ำ {count} ครั้ง คะแนนจากแบบสอบถามขยับเฉลี่ย {avg} คะแนน (แต่ละครั้งจำกัดที่ ±15) ยิ่งขยับเฉลี่ยน้อย แปลว่าการวัดเสถียรสำหรับคุณ",
  "Complete a monthly re-assessment to start tracking how stable your scores are over time.":
    "ทำการประเมินซ้ำรายเดือนเพื่อเริ่มติดตามว่าคะแนนของคุณเสถียรแค่ไหนเมื่อเวลาผ่านไป",
  "1-3 days": "1-3 วัน",
  "4-7 days": "4-7 วัน",
  "8-14 days": "8-14 วัน",
  "15-21 days": "15-21 วัน",
  "22-31 days": "22-31 วัน",
  "Regularly": "เป็นประจำ",
  "All of the time": "ตลอดเวลา",
  "Most of the time": "เกือบตลอดเวลา",
  "More than half the time": "มากกว่าครึ่งหนึ่งของเวลา",
  "Less than half the time": "น้อยกว่าครึ่งหนึ่งของเวลา",
  "Some of the time": "เป็นบางครั้ง",
  "At no time": "ไม่มีเลย",
  "None": "ไม่มี",
  "One": "1 คน",
  "Two": "2 คน",
  "Three or four": "3-4 คน",
  "Five to eight": "5-8 คน",
  "Nine or more": "9 คนขึ้นไป",
  "Hardly ever": "แทบไม่เคย",
  "Very poorly": "แย่มาก",
  "Poorly": "ค่อนข้างแย่",
  "Average": "ปานกลาง",
  "Well": "ดี",
  "Extremely well": "ดีมาก",
  "Not at all true": "ไม่จริงเลย",
  "Hardly true": "แทบไม่จริง",
  "Moderately true": "ค่อนข้างจริง",
  "Exactly true": "จริงที่สุด",
  "Not like me at all": "ไม่เหมือนฉันเลย",
  "Not much like me": "ไม่ค่อยเหมือนฉัน",
  "Somewhat like me": "เหมือนฉันบ้าง",
  "Mostly like me": "ค่อนข้างเหมือนฉัน",
  "Very much like me": "เหมือนฉันมาก",

  // --- Instrument titles ---
  "CFPB Financial Well-Being Assessment": "แบบประเมินสุขภาวะทางการเงิน (CFPB)",
  "Sleep Quality (past month)": "คุณภาพการนอน (1 เดือนที่ผ่านมา)",
  "ST-5 Stress Index (past 2-4 weeks)": "แบบประเมินความเครียด ST-5 (2-4 สัปดาห์ที่ผ่านมา)",
  "WHO-5 Well-Being Index (past 2 weeks)": "ดัชนีสุขภาวะ WHO-5 (2 สัปดาห์ที่ผ่านมา)",
  "LSNS-6 Social Network Scale": "แบบวัดเครือข่ายสังคม LSNS-6",
  "UCLA Loneliness Index": "แบบวัดความเหงา UCLA",
  "Relationship Assessment (couples only)": "แบบประเมินความสัมพันธ์ (เฉพาะคนมีคู่)",
  "GSE-6 Self-Efficacy Scale": "แบบวัดการรับรู้ความสามารถของตนเอง GSE-6",
  "Grit-S (Perseverance)": "แบบวัดความมุ่งมั่น Grit-S",
  "Prosocial Tendencies (typical month)": "พฤติกรรมเพื่อสังคม (ในเดือนทั่วไป)",
  "Green Everyday Behavior": "พฤติกรรมรักษ์โลกในชีวิตประจำวัน",
  "Long-Term Future Index": "ดัชนีการมองอนาคตระยะยาว",

  // --- Instrument items ---
  "Because of my money situation, I feel like I will never have the things I want in life.": "เพราะสถานะการเงินของฉัน ฉันรู้สึกว่าคงไม่มีวันได้สิ่งที่ต้องการในชีวิต",
  "I am just getting by financially.": "ฉันแค่พอประทังตัวไปเดือนต่อเดือน",
  "I am concerned that the money I have or will save won't last.": "ฉันกังวลว่าเงินที่มีหรือที่จะเก็บออมจะไม่พอใช้ในระยะยาว",
  "I have money left over at the end of the month.": "ฉันมีเงินเหลือตอนสิ้นเดือน",
  "My finances control my life.": "เรื่องเงินควบคุมชีวิตของฉัน",
  "How often did you have difficulty falling asleep?": "คุณนอนหลับยากบ่อยแค่ไหน?",
  "How often did you wake up during the night?": "คุณตื่นกลางดึกบ่อยแค่ไหน?",
  "How often did you wake up earlier than planned?": "คุณตื่นเช้ากว่าที่ตั้งใจบ่อยแค่ไหน?",
  "How often did you wake up feeling unrefreshed?": "คุณตื่นมาแล้วรู้สึกไม่สดชื่นบ่อยแค่ไหน?",
  "How often did you have trouble sleeping because of worry?": "มีปัญหาการนอน นอนไม่หลับเพราะคิดมากหรือกังวลใจ บ่อยแค่ไหน?",
  "How often did you have poor concentration?": "มีสมาธิน้อยลง บ่อยแค่ไหน?",
  "How often did you feel irritable, restless, or agitated?": "หงุดหงิด กระวนกระวาย ว้าวุ่นใจ บ่อยแค่ไหน?",
  "How often did you feel bored or discouraged?": "รู้สึกเบื่อ เซ็ง ท้อแท้ บ่อยแค่ไหน?",
  "How often did you not want to meet people?": "ไม่อยากพบปะผู้คน บ่อยแค่ไหน?",
  "I have felt cheerful and in good spirits.": "ฉันรู้สึกร่าเริงและอารมณ์ดี",
  "I have felt calm and relaxed.": "ฉันรู้สึกสงบและผ่อนคลาย",
  "I have felt active and vigorous.": "ฉันรู้สึกกระฉับกระเฉงและมีพลัง",
  "I woke up feeling fresh and rested.": "ฉันตื่นนอนอย่างสดชื่นและรู้สึกได้พักผ่อนเต็มที่",
  "My daily life has been filled with things that interest me.": "ชีวิตประจำวันของฉันเต็มไปด้วยสิ่งที่น่าสนใจ",
  "How many relatives do you see or hear from at least once a month?": "มีญาติกี่คนที่คุณได้พบหรือติดต่อกันอย่างน้อยเดือนละครั้ง?",
  "How many relatives do you feel at ease with to talk about private matters?": "มีญาติกี่คนที่คุณสบายใจพอจะคุยเรื่องส่วนตัวด้วย?",
  "How many relatives do you feel close to such that you could call on them for help?": "มีญาติกี่คนที่สนิทพอจะขอความช่วยเหลือได้?",
  "How many friends do you see or hear from at least once a month?": "มีเพื่อนกี่คนที่คุณได้พบหรือติดต่อกันอย่างน้อยเดือนละครั้ง?",
  "How many friends do you feel at ease with to talk about private matters?": "มีเพื่อนกี่คนที่คุณสบายใจพอจะคุยเรื่องส่วนตัวด้วย?",
  "How many friends do you feel close to such that you could call on them for help?": "มีเพื่อนกี่คนที่สนิทพอจะขอความช่วยเหลือได้?",
  "How often do you feel that you lack companionship?": "คุณรู้สึกขาดเพื่อนหรือคนใกล้ชิดบ่อยแค่ไหน?",
  "How often do you feel left out?": "คุณรู้สึกถูกทิ้งไว้ข้างหลังบ่อยแค่ไหน?",
  "How often do you feel isolated from others?": "คุณรู้สึกโดดเดี่ยวแปลกแยกจากคนอื่นบ่อยแค่ไหน?",
  "How well does your partner meet your needs?": "คู่ของคุณตอบสนองความต้องการของคุณได้ดีแค่ไหน?",
  "In general, how satisfied are you with your relationship?": "โดยรวมแล้วคุณพึงพอใจกับความสัมพันธ์ของคุณแค่ไหน?",
  "How good is your relationship compared to most?": "ความสัมพันธ์ของคุณดีแค่ไหนเมื่อเทียบกับคู่อื่น ๆ?",
  "I can always manage to solve difficult problems if I try hard enough.": "ฉันสามารถแก้ปัญหาที่ยากได้เสมอ ถ้าฉันพยายามมากพอ",
  "If someone opposes me, I can find the means and ways to get what I want.": "หากมีใครขัดขวาง ฉันก็หาหนทางเพื่อให้ได้สิ่งที่ต้องการได้",
  "I am confident that I could deal efficiently with unexpected events.": "ฉันมั่นใจว่าจะรับมือกับเหตุการณ์ที่ไม่คาดคิดได้อย่างมีประสิทธิภาพ",
  "Thanks to my resourcefulness, I know how to handle unforeseen situations.": "ด้วยไหวพริบของฉัน ฉันรู้วิธีจัดการกับสถานการณ์ที่ไม่คาดฝัน",
  "I can solve most problems if I invest the necessary effort.": "ฉันแก้ปัญหาส่วนใหญ่ได้ ถ้าทุ่มเทความพยายามเท่าที่จำเป็น",
  "I can usually handle whatever comes my way.": "ฉันมักรับมือกับสิ่งที่ผ่านเข้ามาได้เสมอ",
  "I finish whatever I begin.": "ฉันทำสิ่งที่เริ่มไว้ให้เสร็จเสมอ",
  "Setbacks don't discourage me. I don't give up easily.": "อุปสรรคไม่ทำให้ฉันท้อ ฉันไม่ยอมแพ้ง่าย ๆ",
  "I am a hard worker.": "ฉันเป็นคนขยัน",
  "I am diligent. I never give up.": "ฉันมุ่งมั่นพากเพียร ไม่เคยยอมแพ้",
  "How often do you donate money to charity, temples, or people in need?": "คุณบริจาคเงินให้การกุศล วัด หรือผู้เดือดร้อนบ่อยแค่ไหน?",
  "How often do you help friends or family members who are in need?": "คุณช่วยเหลือเพื่อนหรือครอบครัวที่เดือดร้อนบ่อยแค่ไหน?",
  "How often do you help strangers (e.g., giving directions, carrying things)?": "คุณช่วยเหลือคนแปลกหน้า (เช่น บอกทาง ช่วยถือของ) บ่อยแค่ไหน?",
  "How often do you participate in community or neighborhood activities?": "คุณเข้าร่วมกิจกรรมชุมชนหรือละแวกบ้านบ่อยแค่ไหน?",
  "How often do you engage in local civic issues (e.g., voting, community meetings)?": "คุณมีส่วนร่วมในประเด็นบ้านเมือง (เช่น เลือกตั้ง ประชุมชุมชน) บ่อยแค่ไหน?",
  "How often do you separate recyclables (plastic, paper, glass) from general waste?": "คุณแยกขยะรีไซเคิล (พลาสติก กระดาษ แก้ว) ออกจากขยะทั่วไปบ่อยแค่ไหน?",
  "How often do you refuse or avoid single-use plastics (bags, straws, cups)?": "คุณปฏิเสธหรือหลีกเลี่ยงพลาสติกใช้ครั้งเดียว (ถุง หลอด แก้ว) บ่อยแค่ไหน?",
  "How often do you use public transit, walk, or cycle instead of a private car?": "คุณใช้ขนส่งสาธารณะ เดิน หรือปั่นจักรยานแทนรถส่วนตัวบ่อยแค่ไหน?",
  "How often do you turn off lights and appliances when not in use?": "คุณปิดไฟและเครื่องใช้ไฟฟ้าเมื่อไม่ใช้งานบ่อยแค่ไหน?",
  "How often do you limit air-conditioning use or set it to 25°C or higher?": "คุณจำกัดการใช้แอร์หรือตั้งอุณหภูมิ 25°C ขึ้นไปบ่อยแค่ไหน?",
  "How often do you choose eco-friendly or refillable products?": "คุณเลือกสินค้ารักษ์โลกหรือแบบเติมได้บ่อยแค่ไหน?",
  "I actively learn skills that will stay relevant in the future (AI, data, languages).": "ฉันเรียนรู้ทักษะที่จะยังสำคัญในอนาคตอย่างจริงจัง (AI ข้อมูล ภาษา)",
  "I do things intended to leave a positive legacy beyond my own life.": "ฉันทำสิ่งที่ตั้งใจให้เป็นมรดกที่ดีเกินอายุขัยของตัวเอง",
  "I support or donate to causes addressing future generations' well-being.": "ฉันสนับสนุนหรือบริจาคให้ประเด็นที่ดูแลความเป็นอยู่ของคนรุ่นหลัง",
  "I plan my finances with a horizon of 10 years or more.": "ฉันวางแผนการเงินโดยมองไกล 10 ปีขึ้นไป",
  "I support causes addressing global existential risks (climate, pandemics, AI safety).": "ฉันสนับสนุนประเด็นความเสี่ยงระดับโลก (สภาพภูมิอากาศ โรคระบาด ความปลอดภัยของ AI)",

  // --- Routine presets ---
  "Add to Savings": "หยอดเงินออม",
  "Deposit money/savings (+8 Finance)": "ฝากเงิน/เงินออม (+8 การเงิน)",
  "Amount saved": "จำนวนเงินที่ออม",
  "THB": "บาท",
  "CBT Journaling": "เขียนบันทึก CBT",
  "Write cognitive reappraisal (+8 Mental)": "เขียนปรับมุมมองความคิด (+8 จิตใจ)",
  "Physiological Sigh": "ถอนหายใจคลายเครียด",
  "Breath control vagus reset (+5 Mental)": "ฝึกลมหายใจรีเซ็ตระบบประสาท (+5 จิตใจ)",
  "Exercise Session": "ออกกำลังกาย",
  "Exercise MVPA (+10 Phys, +3 Mental)": "ออกกำลังระดับปานกลาง-หนัก (+10 ร่างกาย +3 จิตใจ)",
  "Duration": "ระยะเวลา",
  "minutes": "นาที",
  "Veggie Portions": "กินผักผลไม้",
  "Eat healthy greens (+5 Physical)": "กินผักผลไม้เพื่อสุขภาพ (+5 ร่างกาย)",
  "Portions today": "จำนวนส่วนวันนี้",
  "portions": "ส่วน",
  "Water Intake": "ดื่มน้ำ",
  "Hydration target (+5 Physical)": "ดื่มน้ำให้ถึงเป้า (+5 ร่างกาย)",
  "Amount today": "ปริมาณวันนี้",
  "liters": "ลิตร",
  "Connect with Friend": "ติดต่อเพื่อน",
  "Call relative or friend (+10 Rel, +2 Ment)": "โทรหาญาติหรือเพื่อน (+10 ความสัมพันธ์ +2 จิตใจ)",
  "Relationship Date": "เดตกับคู่รัก",
  "Quality partner time (+8 Relationships)": "เวลาคุณภาพกับคู่ (+8 ความสัมพันธ์)",
  "Make Merit / Donation": "ทำบุญ / บริจาค",
  "Tham Bun / Donate (+10 Social, -2 Fin)": "ทำบุญ/บริจาค (+10 สังคม -2 การเงิน)",
  "Amount donated": "จำนวนเงินบริจาค",
  "Volunteer": "จิตอาสา",
  "Community service (+12 Social)": "งานอาสาเพื่อชุมชน (+12 สังคม)",
  "Time spent": "เวลาที่ใช้",
  "hours": "ชั่วโมง",
  "Separate Recycling": "แยกขยะรีไซเคิล",
  "Household waste sort (+8 Env)": "แยกขยะในบ้าน (+8 สิ่งแวดล้อม)",
  "Ride BTS / MRT": "นั่ง BTS / MRT",
  "Avoid car commute (+8 Env)": "เลี่ยงการใช้รถส่วนตัว (+8 สิ่งแวดล้อม)",
  "Study AI / Data Sci": "เรียน AI / วิทยาการข้อมูล",
  "Upskill future tech (+10 Future, +5 Goals)": "อัปสกิลเทคโนโลยีอนาคต (+10 อนาคต +5 เป้าหมาย)",
  "Study time": "เวลาเรียน",
  "Mentor / Teach": "สอน / เป็นพี่เลี้ยง",
  "Share upskilling (+8 Future, +2 Rel)": "ถ่ายทอดความรู้ (+8 อนาคต +2 ความสัมพันธ์)",

  // --- Missions ---
  "Stay Hydrated": "ดื่มน้ำให้พอ",
  "Log your 2L+ hydration once today.": "บันทึกการดื่มน้ำ 2 ลิตรขึ้นไปวันนี้ 1 ครั้ง",
  "Breath Control": "ควบคุมลมหายใจ",
  "Log 3 physiological sighs to reset stress.": "บันทึกการถอนหายใจคลายเครียด 3 ครั้ง",
  "Active Core": "ขยับให้ครบ",
  "Log at least 3 exercise sessions this week.": "บันทึกการออกกำลังกายอย่างน้อย 3 ครั้งในสัปดาห์นี้",
  "Safety Deposit": "เงินฝากนิรภัย",
  "Log a savings deposit 10 times.": "บันทึกการฝากเงินออม 10 ครั้ง",
  "3 deposits logged": "ฝากแล้ว 3 ครั้ง",
  "6 deposits logged": "ฝากแล้ว 6 ครั้ง",
  "10 deposits logged": "ฝากแล้ว 10 ครั้ง",
  "DAILY": "รายวัน",
  "WEEKLY": "รายสัปดาห์",
  "EPIC": "มหากาพย์",
  "Active Goals": "เป้าหมายที่กำลังทำ",
  "Goals progress automatically as you log matching routines. Daily goals reset each day, weekly goals each week.":
    "เป้าหมายคืบหน้าอัตโนมัติเมื่อคุณบันทึกกิจวัตรที่เกี่ยวข้อง เป้าหมายรายวันรีเซ็ตทุกวัน รายสัปดาห์รีเซ็ตทุกสัปดาห์",
  "All goals completed. New cycles begin tomorrow.": "ทำเป้าหมายครบแล้ว รอบใหม่เริ่มพรุ่งนี้",
  "Aspect: {aspect} • +{xp} points": "ด้าน: {aspect} • +{xp} คะแนน",
  "{current} / {target} logged": "บันทึกแล้ว {current} / {target}",
  "Completed Goals": "เป้าหมายที่สำเร็จ",
  "No completed goals in this cycle yet.": "ยังไม่มีเป้าหมายที่สำเร็จในรอบนี้",
  "Completed: +{xp} points": "สำเร็จ: +{xp} คะแนน",

  // --- Dashboard ---
  "Erase all data": "ลบข้อมูลทั้งหมด",
  "Erase all data?": "ลบข้อมูลทั้งหมดหรือไม่",
  "This deletes every logged routine, your goals, and your baseline assessment.": "การดำเนินการนี้จะลบกิจวัตรที่บันทึกไว้ทั้งหมด เป้าหมาย และผลประเมินพื้นฐานของคุณ",
  "It cannot be undone, and this browser holds the only copy.": "ไม่สามารถกู้คืนได้ และเบราว์เซอร์นี้เก็บข้อมูลสำเนาเดียวเท่านั้น",
  "Download a backup, then erase": "ดาวน์โหลดไฟล์สำรอง แล้วจึงลบ",
  "Erase without a backup": "ลบโดยไม่สำรองข้อมูล",
  "Back up your data.": "สำรองข้อมูลของคุณ",
  "Everything here is stored only in this browser. Clearing site data, or the browser reclaiming space, would erase it with no way back.": "ข้อมูลทั้งหมดถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น หากล้างข้อมูลเว็บไซต์หรือเบราว์เซอร์เรียกคืนพื้นที่ ข้อมูลจะถูกลบโดยกู้คืนไม่ได้",
  "Your last backup was {days} days ago. Everything here is stored only in this browser, so a cleared cache would erase it.": "คุณสำรองข้อมูลครั้งล่าสุดเมื่อ {days} วันที่แล้ว ข้อมูลทั้งหมดถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น การล้างแคชจะลบข้อมูลทิ้ง",
  "Monthly re-assessment due.": "ถึงเวลาประเมินซ้ำประจำเดือนแล้ว",
  "Re-run the short well-being instruments so your scores track your real standing, not last month's.":
    "ทำแบบประเมินชุดสั้นอีกครั้ง เพื่อให้คะแนนสะท้อนสถานะจริงของคุณ ไม่ใช่ของเดือนที่แล้ว",
  "Start Re-assessment": "เริ่มประเมินซ้ำ",
  "This year's points": "คะแนนปีนี้",
  "{xp} points this year": "{xp} คะแนนในปีนี้",
  "Year just started": "ปีนี้เพิ่งเริ่ม",
  "Points: {xp} / {possible}": "คะแนน: {xp} / {possible}",
  "Progress: {pct}%": "ความคืบหน้า: {pct}%",

  // --- Level-year screen (#/year) + the birthday question ---
  "Your year": "ปีของคุณ",
  "Birth month": "เดือนเกิด",
  "Day of month": "วันที่",
  "Save": "บันทึก",
  "When does your year turn?": "ปีของคุณเปลี่ยนวันไหน?",
  "Your level is your age. Tell the app the day and it can close each year and open the next — month and day only, never the year you were born.":
    "เลเวลของคุณคืออายุ บอกวันให้แอปรู้ แล้วแอปจะปิดปีเก่าและเปิดปีใหม่ให้ — ระบุเพียงเดือนและวันที่ ไม่เก็บปีเกิด",
  "Answer": "ตอบคำถาม",
  "Not now": "ไว้ก่อน",
  "Your level is simply your age — a fact about you, not a score you earned. Tell the app which day your year turns and it can close each year and open the next one for you.":
    "เลเวลของคุณคืออายุ — เป็นข้อเท็จจริงเกี่ยวกับตัวคุณ ไม่ใช่คะแนนที่ต้องไขว่คว้า บอกแอปว่าปีของคุณเปลี่ยนวันไหน แล้วแอปจะปิดปีเก่าและเปิดปีใหม่ให้คุณ",
  "Month and day only. Your birth year is never asked for and never stored.":
    "ระบุเพียงเดือนและวันที่ ไม่มีการถามหรือเก็บปีเกิดของคุณ",
  "Optional — month and day only, so the app knows when your year turns. Your birth year is never asked for and never stored.":
    "ไม่บังคับ — ระบุเพียงเดือนและวันที่ เพื่อให้แอปรู้ว่าปีของคุณเปลี่ยนวันไหน ไม่มีการถามหรือเก็บปีเกิดของคุณ",
  "Year {level}": "ปีอายุ {level}",
  "This year closes today.": "ปีนี้ปิดวันนี้",
  "Closes on {date} — {days} days from now.": "ปิดวันที่ {date} — อีก {days} วัน",
  "This year has only just opened — there is nothing to measure yet.": "ปีนี้เพิ่งเปิด — ยังไม่มีอะไรให้วัด",
  "{xp} points earned of the {possible} your pledges have offered so far.":
    "ได้รับ {xp} คะแนน จาก {possible} คะแนนที่คำมั่นของคุณเปิดโอกาสไว้จนถึงตอนนี้",
  "{weeks} weeks still to run.": "ยังเหลืออีก {weeks} สัปดาห์",
  "Change the day your year turns": "เปลี่ยนวันที่ปีของคุณเปลี่ยน",
  "Movement this year": "ความเปลี่ยนแปลงในปีนี้",
  "Measured against your closest recorded snapshot, {date}.": "วัดเทียบกับบันทึกภาพรวมที่ใกล้ที่สุดของคุณ วันที่ {date}",
  "Your scores have held steady so far.": "คะแนนของคุณยังคงที่จนถึงตอนนี้",
  "Years filed": "ปีที่บันทึกไว้",
  "Nothing filed yet — your first year closes on your next birthday.":
    "ยังไม่มีปีที่บันทึกไว้ — ปีแรกของคุณจะปิดในวันเกิดครั้งถัดไป",
  "{xp} / {possible} points": "{xp} / {possible} คะแนน",
  "That date doesn't exist — check the day of the month.": "ไม่มีวันที่นี้จริง — โปรดตรวจสอบวันที่ของเดือน",
  "Weekly Commitment": "คำมั่นประจำสัปดาห์",
  "Aspect Radar": "เรดาร์รายด้าน",
  "Recommendations": "คำแนะนำ",
  "Targeting your weakest measured components — tap one to open that aspect.": "เจาะจงองค์ประกอบที่อ่อนที่สุดของคุณ — แตะเพื่อเปิดด้านนั้น",
  "Aspect Scores": "คะแนนรายด้าน",
  "Open {aspect} details": "เปิดรายละเอียดด้าน{aspect}",
  "vs published norms": "เทียบเกณฑ์ที่ตีพิมพ์",
  "vs participation rates": "เทียบอัตราการมีส่วนร่วม",
  "estimate": "ค่าประมาณ",
  "Benchmark sources & methodology": "แหล่งอ้างอิงและวิธีการเทียบ",
  'Percentiles compare your baseline answers with published population statistics — they are honest approximations, not exact ranks. "Estimate" marks curves calibrated to a published anchor point.':
    'เปอร์เซ็นไทล์เทียบคำตอบพื้นฐานของคุณกับสถิติประชากรที่ตีพิมพ์ — เป็นค่าประมาณอย่างตรงไปตรงมา ไม่ใช่อันดับที่แน่นอน ป้าย "ค่าประมาณ" หมายถึงเส้นโค้งที่ปรับเทียบกับจุดอ้างอิงที่ตีพิมพ์',
  "Recent Activity": "กิจกรรมล่าสุด",
  "No logs recorded yet. Ledger is clean.": "ยังไม่มีบันทึก สมุดยังว่างอยู่",
  "Logged:": "บันทึก:",
  "Reward +{xp} points.": "รางวัล +{xp} คะแนน",

  // --- Commitment pin ---
  "{aspect} • this week": "{aspect} • สัปดาห์นี้",
  "Commitment progress": "ความคืบหน้าคำมั่น",
  "✅ Pledge complete — bonus points banked. Resets next week.": "✅ ทำตามคำมั่นสำเร็จ — รับโบนัสคะแนนแล้ว เริ่มใหม่สัปดาห์หน้า",
  "Log {n} more {aspect} routine(s) for +{xp} bonus points.": "บันทึกกิจวัตรด้าน{aspect}อีก {n} ครั้ง เพื่อรับโบนัส +{xp} คะแนน",

  // --- Aspect pages ---
  "Log {title}": "บันทึก {title}",
  "Remove routine": "ลบกิจวัตร",
  "Standing vs Society": "สถานะเทียบกับสังคม",
  "Percentile vs society": "เปอร์เซ็นไทล์เทียบสังคม",
  "Sources": "แหล่งอ้างอิง",
  "No baseline data for this comparison yet — re-run the onboarding sync to unlock it.": "ยังไม่มีข้อมูลพื้นฐานสำหรับการเทียบนี้ — ทำแบบประเมินเริ่มต้นใหม่เพื่อปลดล็อก",
  "Component Breakdown": "องค์ประกอบย่อย",
  "Baseline survey data needed for this breakdown.": "ต้องมีข้อมูลแบบประเมินพื้นฐานจึงจะแสดงส่วนนี้ได้",
  "Suggested Focus": "จุดที่ควรโฟกัส",
  "End Commitment": "ยกเลิกคำมั่น",
  "You're already committed to {link} this week — one pledge at a time keeps it honest.":
    "สัปดาห์นี้คุณให้คำมั่นกับด้าน{link}อยู่แล้ว — ทีละหนึ่งคำมั่นถึงจะทำได้จริง",
  "Pledge a weekly routine count for {aspect}. Hitting it earns bonus points; the pledge renews every week until you end it.":
    "ตั้งคำมั่นจำนวนกิจวัตรต่อสัปดาห์สำหรับด้าน{aspect} ทำถึงเป้าได้โบนัสคะแนน และคำมั่นจะต่ออายุทุกสัปดาห์จนกว่าคุณจะยกเลิก",
  "Routine logs per week (3-21)": "จำนวนบันทึกต่อสัปดาห์ (3-21)",
  "Commit": "ให้คำมั่น",
  "Trend (Weekly Snapshots)": "แนวโน้ม (ภาพรวมรายสัปดาห์)",
  "Log a {aspect} Routine": "บันทึกกิจวัตรด้าน{aspect}",
  "No routines target this aspect yet — register one in the Routines Ledger.": "ยังไม่มีกิจวัตรสำหรับด้านนี้ — ลงทะเบียนได้ในสมุดกิจวัตร",
  "End this week's commitment? Progress will be discarded.": "ยกเลิกคำมั่นของสัปดาห์นี้? ความคืบหน้าจะถูกลบ",
  "No snapshots yet — trends appear after your first weekly sync.": "ยังไม่มีภาพรวม — แนวโน้มจะแสดงหลังซิงก์รายสัปดาห์ครั้งแรก",

  // --- Confidence & completeness (Phase 2) ---
  "High": "สูง",
  "Partial": "บางส่วน",
  "Estimated": "ประมาณการ",
  "Score confidence: {answered} of {total} inputs answered": "ความเชื่อมั่นของคะแนน: ตอบแล้ว {answered} จาก {total} รายการ",
  "{answered}/{total} inputs answered": "ตอบแล้ว {answered}/{total} รายการ",
  "Some scores are estimates.": "บางคะแนนเป็นค่าประมาณ",
  "These are scored from default answers: {aspects}. Re-run your assessment or log related routines to confirm them.":
    "คะแนนเหล่านี้คิดจากคำตอบเริ่มต้น: {aspects} ทำแบบประเมินใหม่หรือบันทึกกิจวัตรที่เกี่ยวข้องเพื่อยืนยัน",
  "Estimated score.": "คะแนนประมาณการ",
  "This score comes from default answers. Answer the {aspect} questions or log routines to confirm it.":
    "คะแนนนี้มาจากคำตอบเริ่มต้น ตอบคำถามด้าน{aspect}หรือบันทึกกิจวัตรเพื่อยืนยัน",

  // --- Monthly re-sync page ---
  "MONTHLY RE-ASSESSMENT": "การประเมินซ้ำประจำเดือน",
  "Short instruments only • recalibrates Mental, Relationships & Personal Goals": "แบบประเมินชุดสั้น • ปรับเทียบด้านจิตใจ ความสัมพันธ์ และเป้าหมายส่วนตัว",
  "Answer for the recent weeks, not how you felt at onboarding. Scores shift by at most ±15 points per re-assessment, and consistent weekly reviews since the last one add a small bonus. Reward: +40 points.":
    "ตอบตามช่วงสัปดาห์ที่ผ่านมา ไม่ใช่ความรู้สึกตอนเริ่มต้น คะแนนขยับได้ไม่เกิน ±15 คะแนนต่อการประเมินซ้ำ และการทบทวนรายสัปดาห์อย่างสม่ำเสมอตั้งแต่ครั้งก่อนจะได้โบนัสเล็กน้อย รางวัล: +40 คะแนน",
  "Complete Re-assessment": "เสร็จสิ้นการประเมินซ้ำ",
  "Re-assessment Error: ": "การประเมินซ้ำผิดพลาด: ",

  // --- Routines ledger ---
  "Log Routine": "บันทึกกิจวัตร",
  "Select a routine below to record it. Your aspect scores update automatically (max 5 logs per routine per day).":
    "เลือกกิจวัตรด้านล่างเพื่อบันทึก คะแนนรายด้านของคุณจะอัปเดตอัตโนมัติ (สูงสุด 5 ครั้งต่อกิจวัตรต่อวัน)",
  "Register New Routine": "ลงทะเบียนกิจวัตรใหม่",
  "Registered routines appear in the routine grid and can be logged like presets.": "กิจวัตรที่ลงทะเบียนจะปรากฏในตารางและบันทึกได้เหมือนรายการสำเร็จรูป",
  "Routine Name": "ชื่อกิจวัตร",
  "E.g., Practice Meditating": "เช่น ฝึกนั่งสมาธิ",
  "Target Aspect": "ด้านที่ต้องการพัฒนา",
  "Aspect Sync Impact (+1 to +15)": "ผลต่อค่าด้าน (+1 ถึง +15)",
  "Points Reward (+5 to +50)": "รางวัลคะแนน (+5 ถึง +50)",
  "Register Routine": "ลงทะเบียนกิจวัตร",
  "Enter the real amount — it becomes part of your measured record.": "กรอกจำนวนจริง — จะถูกเก็บเป็นข้อมูลที่วัดได้ของคุณ",
  "Cancel": "ยกเลิก",
  "Log It": "บันทึกเลย",
  'Daily limit reached for "{name}" (max {max} logs). Take a break and return tomorrow.': 'วันนี้บันทึก "{name}" ครบแล้ว (สูงสุด {max} ครั้ง) พักก่อนแล้วค่อยกลับมาใหม่พรุ่งนี้',

  // --- Rankings / Crew Codes ---
  "Comparison Codes": "รหัสเปรียบเทียบ",
  "Peer comparison uses <strong>real people</strong>: share your code with others over LINE or Discord, and paste theirs below. A code carries only your name and the eight aspect scores — no age, no points, nothing else. Re-paste a newer code any time to update a participant.":
    "การเปรียบเทียบกับผู้อื่นใช้<strong>คนจริง</strong>: แชร์รหัสของคุณให้ผู้อื่นทาง LINE หรือ Discord แล้วนำรหัสของพวกเขามาวางด้านล่าง รหัสมีแค่ชื่อและคะแนนรายด้านทั้งแปด — ไม่มีอายุ ไม่มีคะแนนสะสม ไม่มีอย่างอื่น วางรหัสใหม่ได้ทุกเมื่อเพื่ออัปเดตผู้เข้าร่วม",
  "Your Comparison Code": "รหัสเปรียบเทียบของคุณ",
  "Copy": "คัดลอก",
  "Copied!": "คัดลอกแล้ว!",
  "Add a participant's code": "เพิ่มรหัสของผู้เข้าร่วม",
  "Add": "เพิ่ม",
  "No participants added yet — sample profiles fill the board until you add codes.": "ยังไม่มีผู้เข้าร่วม — โปรไฟล์ตัวอย่างจะเติมกระดานจนกว่าคุณจะเพิ่มรหัส",
  "{n} participant added. Sample rows are marked.": "เพิ่มผู้เข้าร่วม {n} คน แถวตัวอย่างมีป้ายกำกับ",
  "{n} participants added. Sample rows are marked.": "เพิ่มผู้เข้าร่วม {n} คน แถวตัวอย่างมีป้ายกำกับ",
  "Rank": "อันดับ",
  "Participant": "ผู้เข้าร่วม",
  "Level": "เลเวล",
  "Total Points": "คะแนนรวม",
  "Balance": "ดัชนีสมดุล",
  "Tier": "ระดับ",
  "Sample": "ตัวอย่าง",
  "{name} (You)": "{name} (คุณ)",
  "Remove {name}": "ลบ {name}",
  "Remove participant": "ลบผู้เข้าร่วม",
  "Participant list is full (max {max}).": "รายชื่อผู้เข้าร่วมเต็มแล้ว (สูงสุด {max} คน)",
  // --- Weekly pledges (state.js) ---
  "Pledge list is full (max {max}).": "รายการคำมั่นเต็มแล้ว (สูงสุด {max} รายการ)",
  "You already have a pledge on that metric.": "คุณมีคำมั่นในตัวชี้วัดนี้อยู่แล้ว",
  "Unknown pledge type.": "ไม่รู้จักประเภทคำมั่นนี้",
  // --- Weekly review (#/review) ---
  "Weekly Review": "ทบทวนรายสัปดาห์",
  "Reviewed this week.": "ทบทวนสัปดาห์นี้แล้ว",
  "Nothing to do here until {date} — live your week; the app can wait.": "ไม่มีอะไรต้องทำจนถึงวันที่ {date} — ใช้ชีวิตของคุณไปเลย แอปรอได้",
  "One thing while you're here: the monthly re-assessment is due.": "อีกหนึ่งอย่างระหว่างที่อยู่ตรงนี้: ถึงกำหนดการประเมินซ้ำประจำเดือนแล้ว",
  "Report a rough weekly average for each habit — no daily logging needed. Every value is prefilled with last week's answer, so only touch what changed. Takes about two minutes.": "รายงานค่าเฉลี่ยคร่าว ๆ ของแต่ละพฤติกรรมในสัปดาห์นี้ — ไม่ต้องบันทึกรายวัน ทุกช่องเติมคำตอบของสัปดาห์ก่อนไว้ให้แล้ว แก้เฉพาะที่เปลี่ยนไปก็พอ ใช้เวลาราวสองนาที",
  "Activity this week": "กิจกรรมทางกายสัปดาห์นี้",
  "Daily habits (weekly average)": "พฤติกรรมประจำวัน (ค่าเฉลี่ยรายสัปดาห์)",
  "Monthly habits (update when they change)": "พฤติกรรมรายเดือน (แก้ไขเมื่อเปลี่ยนแปลง)",
  "Complete Weekly Review": "ส่งการทบทวนรายสัปดาห์",
  "Past Reviews": "การทบทวนที่ผ่านมา",
  "scores steady": "คะแนนคงที่",
  "{met}/{total} pledges met": "ทำได้ {met}/{total} คำมั่น",
  "+{xp} points": "+{xp} คะแนน",
  "Weekly review open.": "การทบทวนรายสัปดาห์เปิดแล้ว",
  "Two minutes of rough weekly numbers keep every score measured — no daily logging.": "ตัวเลขคร่าว ๆ รายสัปดาห์เพียงสองนาทีช่วยให้ทุกคะแนนมาจากการวัดจริง — ไม่ต้องบันทึกรายวัน",
  "Start Weekly Review": "เริ่มทบทวนรายสัปดาห์",
  "Recent Reviews": "การทบทวนล่าสุด",
  "No weekly reviews yet — your first one opens the week after onboarding.": "ยังไม่มีการทบทวนรายสัปดาห์ — ครั้งแรกจะเปิดในสัปดาห์ถัดจากการประเมินเริ่มต้น",
  "This week's review is already recorded — come back next week.": "บันทึกการทบทวนของสัปดาห์นี้ไปแล้ว — กลับมาใหม่สัปดาห์หน้า",
  "Weekly review saved: {met}/{total} pledges met.": "บันทึกการทบทวนรายสัปดาห์แล้ว: ทำได้ {met}/{total} คำมั่น",
  "Weekly review saved.": "บันทึกการทบทวนรายสัปดาห์แล้ว",
  "Here to help. One short weekly review keeps your scores honest — about two minutes, once a week.": "พร้อมช่วยเสมอ การทบทวนรายสัปดาห์สั้น ๆ ช่วยให้คะแนนของคุณตรงกับความจริง — ราวสองนาที สัปดาห์ละครั้ง",
  "Complete your weekly review to keep your assessment current and track your progress.": "ทำการทบทวนรายสัปดาห์เพื่อให้การประเมินเป็นปัจจุบันและติดตามความคืบหน้าของคุณ",
  // --- Goals tab (weekly pledges) ---
  "Weekly Pledges": "คำมั่นรายสัปดาห์",
  "A pledge is a weekly quantity target. Your weekly review grades every pledge automatically — nothing to log day to day.": "คำมั่นคือเป้าหมายเชิงปริมาณรายสัปดาห์ การทบทวนรายสัปดาห์จะตรวจทุกคำมั่นให้อัตโนมัติ — ไม่ต้องบันทึกอะไรรายวัน",
  "No pledges yet — add one from the catalog.": "ยังไม่มีคำมั่น — เพิ่มจากรายการได้เลย",
  "Add a Pledge": "เพิ่มคำมั่นใหม่",
  "Pledges for the aspects you're graded lowest on are listed first.": "คำมั่นสำหรับด้านที่คุณได้เกรดต่ำที่สุดจะแสดงก่อน",
  "Pledge type": "ประเภทคำมั่น",
  "Weekly target": "เป้าหมายรายสัปดาห์",
  "Add Pledge": "เพิ่มคำมั่น",
  "Every pledge type is already in use.": "คำมั่นทุกประเภทถูกใช้งานแล้ว",
  "Remove": "ลบ",
  "Remove this pledge? Its streak will be lost.": "ลบคำมั่นนี้หรือไม่? สถิติต่อเนื่องจะหายไป",
  "Met last week ({value} {unit})": "สัปดาห์ที่แล้วทำได้ ({value} {unit})",
  "Missed last week ({value} {unit})": "สัปดาห์ที่แล้วพลาด ({value} {unit})",
  "Graded at your next weekly review.": "จะตรวจในการทบทวนรายสัปดาห์ครั้งถัดไป",
  "{n}-week streak": "ต่อเนื่อง {n} สัปดาห์",
  "+{xp} points each week it's met": "+{xp} คะแนนทุกสัปดาห์ที่ทำได้",
  // --- Pledge templates (goals.js, rendered via t(variable)) ---
  "Hydration pledge": "คำมั่นดื่มน้ำ",
  "Average at least {target} L of water per day.": "ดื่มน้ำเฉลี่ยอย่างน้อยวันละ {target} ลิตร",
  "Sleep pledge": "คำมั่นการนอน",
  "Average at least {target} hours of sleep per night.": "นอนเฉลี่ยอย่างน้อยคืนละ {target} ชั่วโมง",
  "Vegetables pledge": "คำมั่นกินผัก",
  "Average at least {target} vegetable portions per day.": "กินผักเฉลี่ยอย่างน้อยวันละ {target} ส่วน",
  "Exercise days pledge": "คำมั่นวันออกกำลังกาย",
  "Exercise (vigorous or moderate) on at least {target} days this week.": "ออกกำลังกาย (หนักหรือปานกลาง) อย่างน้อย {target} วันในสัปดาห์นี้",
  "Activity volume pledge": "คำมั่นปริมาณกิจกรรม",
  "Reach at least {target} MET-minutes of activity this week (600 meets the WHO guideline).": "สะสมกิจกรรมอย่างน้อย {target} MET-นาทีในสัปดาห์นี้ (600 ตามเกณฑ์ WHO)",
  "Learning pledge": "คำมั่นการเรียนรู้",
  "Spend at least {target} hours on active learning this week.": "ใช้เวลาเรียนรู้อย่างน้อย {target} ชั่วโมงในสัปดาห์นี้",
  "Plastics pledge": "คำมั่นลดพลาสติก",
  "Keep single-use plastics to at most {target} pieces per day.": "ใช้พลาสติกใช้ครั้งเดียวไม่เกินวันละ {target} ชิ้น",
  "Savings pledge": "คำมั่นการออม",
  "Keep your savings rate at or above {target}% of income.": "รักษาอัตราการออมไว้อย่างน้อย {target}% ของรายได้",
  "Giving pledge": "คำมั่นการให้",
  "Donate at least {target} THB this month.": "บริจาคอย่างน้อย {target} บาทในเดือนนี้",
  "Volunteering pledge": "คำมั่นจิตอาสา",
  "Volunteer at least {target} hours this month.": "เป็นจิตอาสาอย่างน้อย {target} ชั่วโมงในเดือนนี้",
  "L/day": "ลิตร/วัน",
  "hours/night": "ชั่วโมง/คืน",
  "portions/day": "ส่วน/วัน",
  "days/week": "วัน/สัปดาห์",
  "MET-min/week": "MET-นาที/สัปดาห์",
  "hours/week": "ชั่วโมง/สัปดาห์",
  "pieces/day": "ชิ้น/วัน",
  "% of income": "% ของรายได้",
  "THB/month": "บาท/เดือน",
  "hours/month": "ชั่วโมง/เดือน",
  // --- Aspect page: measured-weekly card ---
  "Measured Weekly": "วัดรายสัปดาห์",
  "Your weekly review re-measures this aspect from: {fields}.": "การทบทวนรายสัปดาห์วัดด้านนี้ใหม่จาก: {fields}",
  "Savings rate": "อัตราการออม",
  "Exercise days and minutes, sleep, water, vegetables": "จำนวนวันและนาทีที่ออกกำลังกาย การนอน น้ำ ผัก",
  "Learning hours": "ชั่วโมงการเรียนรู้",
  "Donations and volunteering hours": "เงินบริจาคและชั่วโมงจิตอาสา",
  "Single-use plastic items": "พลาสติกใช้ครั้งเดียว",
  "Reviewed this week — the next review opens next week.": "ทบทวนสัปดาห์นี้แล้ว — ครั้งถัดไปเปิดสัปดาห์หน้า",
  "This aspect is measured by its questionnaires rather than weekly quantities — update it at the monthly re-assessment.": "ด้านนี้วัดด้วยแบบสอบถาม ไม่ใช่ปริมาณรายสัปดาห์ — อัปเดตได้ที่การประเมินซ้ำประจำเดือน",
  'Comparison codes start with "{prefix}".': 'รหัสเปรียบเทียบต้องขึ้นต้นด้วย "{prefix}"',
  "That code is damaged — ask the participant to copy it again.": "รหัสนี้เสียหาย — ให้ผู้เข้าร่วมคัดลอกส่งมาใหม่อีกครั้ง",
  "Unsupported comparison code version.": "เวอร์ชันรหัสเปรียบเทียบไม่รองรับ",
  "Comparison code is missing a name.": "รหัสเปรียบเทียบไม่มีชื่อ",
  "Comparison code has an invalid level.": "รหัสเปรียบเทียบมีเลเวลไม่ถูกต้อง",
  "Comparison code has invalid points.": "รหัสเปรียบเทียบมีคะแนนไม่ถูกต้อง",
  "Comparison code has invalid aspect scores.": "รหัสเปรียบเทียบมีคะแนนรายด้านไม่ถูกต้อง",
  "Nadia": "นาเดีย",
  "Marcus": "มาร์คัส",
  "Priya": "ปรียา",
  "Kenji": "เคนจิ",
  "Sofia": "โซเฟีย",
  "Liam": "เลียม",

  // --- Backup / import errors ---
  "File is not valid JSON.": "ไฟล์ไม่ใช่ JSON ที่ถูกต้อง",
  "This file is not a valid backup (missing profile/aspects).": "ไฟล์นี้ไม่ใช่ข้อมูลสำรองที่ถูกต้อง (ไม่มี profile/aspects)",
  "Backup schema v{found} is not compatible with v{expected}.": "ข้อมูลสำรองสคีมา v{found} ไม่เข้ากันกับ v{expected}",

  // --- Guidance assistant dialogue ---
  "Your finance score has room to grow. A simple monthly budget and a set savings rate are good starting points.":
    "คะแนนการเงินของคุณยังพัฒนาได้อีก การทำงบรายเดือนง่าย ๆ และตั้งอัตราการออมเป็นจุดเริ่มต้นที่ดี",
  "Your physical activity could use a lift. A short walk today is an easy way to build momentum.":
    "กิจกรรมทางกายของคุณน่าจะเพิ่มได้อีก เดินสั้น ๆ วันนี้เป็นวิธีง่าย ๆ ในการสร้างแรงส่ง",
  "Feeling stretched? Try a slow breathing break — two short inhales through the nose, then one long exhale.":
    "รู้สึกตึงเครียดไหม? ลองพักหายใจช้า ๆ — สูดเข้าทางจมูกสั้น ๆ สองครั้ง แล้วผ่อนออกยาว ๆ หนึ่งครั้ง",
  "Connection matters. Consider reaching out to a close friend or relative this week.":
    "ความสัมพันธ์สำคัญ ลองติดต่อเพื่อนสนิทหรือญาติสักคนในสัปดาห์นี้",
  "Steady practice moves your goals forward. Even 20 minutes of focused learning today helps.":
    "การฝึกฝนสม่ำเสมอช่วยให้เป้าหมายก้าวหน้า แค่ตั้งใจเรียนรู้ 20 นาทีวันนี้ก็ช่วยได้",
  "Small acts of giving add up. A minor kindness or a modest donation strengthens this area.":
    "การให้เล็ก ๆ น้อย ๆ สะสมได้ น้ำใจเล็กน้อยหรือการบริจาคพอประมาณช่วยเสริมด้านนี้",
  "Everyday choices shape your footprint. Separating recyclables today is a simple step.":
    "ทางเลือกในแต่ละวันกำหนดรอยเท้าทางสิ่งแวดล้อมของคุณ การแยกขยะรีไซเคิลวันนี้เป็นก้าวง่าย ๆ",
  "Long-term security grows from consistent habits — saving and upskilling both anchor your future.":
    "ความมั่นคงระยะยาวเติบโตจากนิสัยที่สม่ำเสมอ — การออมและการอัปสกิลต่างช่วยยึดอนาคตของคุณ",
  "Log a routine today to keep your assessment current and track your progress.":
    "บันทึกกิจวัตรวันนี้เพื่อให้แบบประเมินของคุณเป็นปัจจุบันและติดตามความก้าวหน้า",

  // --- Component labels & details (aspects.js) ---
  "Income standing": "สถานะรายได้",
  "Percentile vs Thai worker earnings (estimate)": "เปอร์เซ็นไทล์เทียบรายได้แรงงานไทย (ค่าประมาณ)",
  "Financial well-being (CFPB)": "สุขภาวะทางการเงิน (CFPB)",
  "Raw {n}/20 at baseline": "คะแนนดิบ {n}/20 ณ จุดเริ่มต้น",
  "Savings habit": "นิสัยการออม",
  "Saving {rate}% of income (20%+ maxes this)": "ออม {rate}% ของรายได้ (20% ขึ้นไปได้เต็ม)",
  "Activity": "การเคลื่อนไหว",
  "{met} MET-min/week (WHO guideline 600)": "{met} MET-นาที/สัปดาห์ (เกณฑ์ WHO 600)",
  "Body composition": "องค์ประกอบร่างกาย",
  "Asian BMI bands (18.5-22.9 ideal)": "เกณฑ์ BMI เอเชีย (18.5-22.9 คือช่วงดี)",
  "Sleep": "การนอน",
  "{h}h/night + baseline quality {jss}/20 issues": "{h} ชม./คืน + ปัญหาคุณภาพการนอน {jss}/20 ณ จุดเริ่มต้น",
  "Sleep duration": "ระยะเวลานอน",
  "{h}h/night (7-9h ideal)": "{h} ชม./คืน (7-9 ชม. คือช่วงดี)",
  "Nutrition": "โภชนาการ",
  "{veg} veg portions, {water}L water/day": "ผัก {veg} ส่วน, น้ำ {water} ลิตร/วัน",
  "Well-being (WHO-5)": "สุขภาวะ (WHO-5)",
  "Raw {n}/25 at baseline (scores under 50/100 suggest low mood)": "คะแนนดิบ {n}/25 ณ จุดเริ่มต้น (ต่ำกว่า 50/100 บ่งชี้อารมณ์ซึม)",
  "Stress resilience (ST-5)": "ความทนทานต่อความเครียด (ST-5)",
  "Stress {n}/15 — DMH bands: 0-4 fine, 5-6 watch, 7+ problem": "ความเครียด {n}/15 — เกณฑ์กรมสุขภาพจิต: 0-4 ปกติ, 5-6 เฝ้าระวัง, 7 ขึ้นไปมีปัญหา",
  "Social network (LSNS-6)": "เครือข่ายสังคม (LSNS-6)",
  "Raw {n}/30 (under 12 = isolation risk)": "คะแนนดิบ {n}/30 (ต่ำกว่า 12 = เสี่ยงโดดเดี่ยว)",
  "Low loneliness (UCLA-3)": "ความเหงาต่ำ (UCLA-3)",
  "Loneliness {n}/9, inverted (higher bar = less lonely)": "ความเหงา {n}/9 กลับด้าน (แถบสูง = เหงาน้อย)",
  "Romantic satisfaction (RAS)": "ความพึงพอใจในความรัก (RAS)",
  "Raw {n}/15 at baseline": "คะแนนดิบ {n}/15 ณ จุดเริ่มต้น",
  "Self-efficacy (GSE)": "การรับรู้ความสามารถของตนเอง (GSE)",
  "Raw {n}/24 at baseline": "คะแนนดิบ {n}/24 ณ จุดเริ่มต้น",
  "Active learning": "การเรียนรู้เชิงรุก",
  "{h}h/week study + digital skills {d}/100": "เรียน {h} ชม./สัปดาห์ + ทักษะดิจิทัล {d}/100",
  "Giving": "การให้",
  "{thb} THB/month (500+ maxes this)": "{thb} บาท/เดือน (500 ขึ้นไปได้เต็ม)",
  "Volunteering": "จิตอาสา",
  "{h}h/month (4h+ maxes this)": "{h} ชม./เดือน (4 ชม. ขึ้นไปได้เต็ม)",
  "Prosocial habits (PTM)": "พฤติกรรมเพื่อสังคม (PTM)",
  "Plastic reduction": "การลดพลาสติก",
  "{n} single-use pieces/day (Thai avg ~3)": "พลาสติกใช้ครั้งเดียว {n} ชิ้น/วัน (เฉลี่ยไทย ~3)",
  "Green habits (GEB)": "นิสัยรักษ์โลก (GEB)",
  "Raw {n}/24 at baseline ": "คะแนนดิบ {n}/24 ณ จุดเริ่มต้น",
  "Future skills": "ทักษะแห่งอนาคต",
  "{h}h/week toward future-proof skills — reuses your weekly learning hours": "{h} ชม./สัปดาห์กับทักษะที่พร้อมรับอนาคต — ใช้ชั่วโมงการเรียนรู้รายสัปดาห์ร่วมกัน",
  "Long-term security": "ความมั่นคงระยะยาว",
  "Holds retirement/long-term investments": "มีการลงทุนเพื่อเกษียณ/ระยะยาว",
  "No retirement/long-term investments yet": "ยังไม่มีการลงทุนเพื่อเกษียณ/ระยะยาว",
  "Future orientation (LFIS)": "การมองการณ์ไกล (LFIS)",

  // --- Benchmarks (benchmarks.js) ---
  "Income of {income} THB/mo vs Bangkok workers": "รายได้ {income} บาท/เดือน เทียบกับแรงงานกรุงเทพฯ",
  "Income of {income} THB/mo vs Thai workers": "รายได้ {income} บาท/เดือน เทียบกับแรงงานไทย",
  "Lognormal curve calibrated to the Labour Force Survey average wage; NSO does not publish worker-level deciles openly.":
    "เส้นโค้ง lognormal ปรับเทียบกับค่าจ้างเฉลี่ยจากการสำรวจภาวะการทำงาน; สสช. ไม่เผยแพร่ข้อมูลเดไซล์รายบุคคล",
  "The income spread (log-sigma 0.65) is an assumed wage dispersion, not published decile data — the rank is approximate.":
    "การกระจายของรายได้ (log-sigma 0.65) เป็นค่าสมมติของการกระจายค่าจ้าง ไม่ใช่ข้อมูลเดไซล์ที่ตีพิมพ์ — อันดับจึงเป็นค่าโดยประมาณ",
  "{met} MET-min/week vs Thai adults (WHO guideline = 600)": "{met} MET-นาที/สัปดาห์ เทียบกับผู้ใหญ่ไทย (เกณฑ์ WHO = 600)",
  "BMI {bmi} — below the BMI-25 line that {share}% of Thai adults are over.": "BMI {bmi} — ต่ำกว่าเส้น BMI 25 ที่ผู้ใหญ่ไทย {share}% อยู่เหนือเส้นนี้",
  "BMI {bmi} — in the {share}% of Thai adults at BMI 25+.": "BMI {bmi} — อยู่ในกลุ่ม {share}% ของผู้ใหญ่ไทยที่ BMI 25 ขึ้นไป",
  'ST-5 stress score {n}/15 — "{band}" band on the Thai DMH scale.': 'คะแนนความเครียด ST-5 {n}/15 — อยู่ในเกณฑ์ "{band}" ของกรมสุขภาพจิต',
  "no stress problem": "ไม่มีปัญหาความเครียด",
  "possible stress problem": "อาจมีปัญหาความเครียด",
  "stress problem": "มีปัญหาความเครียด",
  "WHO-5 well-being {score}/100 vs general-population norms": "สุขภาวะ WHO-5 {score}/100 เทียบเกณฑ์ประชากรทั่วไป",
  "Percentile is against a German WHO-5 community sample — no representative Thai WHO-5 norm is published, so read it as indicative.":
    "เปอร์เซ็นไทล์เทียบกับกลุ่มตัวอย่างชุมชนเยอรมัน WHO-5 — ยังไม่มีเกณฑ์ WHO-5 ของไทยที่เป็นตัวแทน จึงควรถือเป็นค่าชี้แนวโน้มเท่านั้น",
  "range ≈ {low}–{high}": "ช่วงประมาณ {low}–{high}",
  "Deepen my survey scores": "เพิ่มความแม่นยำของคะแนนแบบสอบถาม",
  "The range is an indicative band reflecting the method's precision, not a statistical confidence interval.":
    "ช่วงนี้เป็นแถบโดยประมาณที่สะท้อนความแม่นยำของวิธีคำนวณ ไม่ใช่ช่วงความเชื่อมั่นทางสถิติ",
  "LSNS-6 score {n}/30 is under the social-isolation cutoff of 12.": "คะแนน LSNS-6 {n}/30 ต่ำกว่าจุดตัดภาวะโดดเดี่ยวทางสังคมที่ 12",
  "LSNS-6 score {n}/30 is above the social-isolation cutoff of 12.": "คะแนน LSNS-6 {n}/30 สูงกว่าจุดตัดภาวะโดดเดี่ยวทางสังคมที่ 12",
  "Loneliness (UCLA-3) and social network (LSNS-6) vs published community samples": "ความเหงา (UCLA-3) และเครือข่ายสังคม (LSNS-6) เทียบกับกลุ่มตัวอย่างที่ตีพิมพ์",
  "Self-efficacy (GSE) vs 25-country norms, N=19,120": "การรับรู้ความสามารถของตนเอง (GSE) เทียบเกณฑ์ 25 ประเทศ N=19,120",
  "Your 6-item GSE is compared per-item against 10-item GSE norms — a short-form approximation, not an exact match.":
    "GSE แบบ 6 ข้อของคุณถูกเทียบรายข้อกับเกณฑ์ GSE แบบ 10 ข้อ — เป็นการประมาณจากแบบสั้น ไม่ใช่การเทียบที่ตรงกันพอดี",
  "Giving participation: {band}": "การมีส่วนร่วมในการให้: {band}",
  "donates and volunteers — inside the 19% of Thais who volunteer": "ทั้งบริจาคและอาสา — อยู่ในกลุ่ม 19% ของคนไทยที่ทำงานอาสา",
  "volunteers — inside the 19% of Thais who volunteer": "ทำงานอาสา — อยู่ในกลุ่ม 19% ของคนไทยที่ทำงานอาสา",
  "donates — inside the 52% of Thais who gave money": "บริจาค — อยู่ในกลุ่ม 52% ของคนไทยที่บริจาคเงิน",
  "no regular giving yet — 52% of Thais donated last year": "ยังไม่มีการให้เป็นประจำ — ปีที่แล้ว 52% ของคนไทยบริจาค",
  "Participation-rate placement, not an exact rank — CAF publishes yes/no rates, not amounts.":
    "จัดวางตามอัตราการมีส่วนร่วม ไม่ใช่อันดับที่แน่นอน — CAF เผยแพร่เพียงอัตราใช่/ไม่ใช่ ไม่ใช่จำนวนเงิน",
  "{pieces} single-use plastic pieces/day vs the ~3/day Thai average": "พลาสติกใช้ครั้งเดียว {pieces} ชิ้น/วัน เทียบค่าเฉลี่ยคนไทย ~3 ชิ้น/วัน",
  "Banded around the post-plastic-ban Thai average; per-person distribution data is not published.":
    "จัดช่วงรอบค่าเฉลี่ยคนไทยหลังมาตรการงดถุงพลาสติก; ไม่มีข้อมูลการแจกแจงรายบุคคลที่เผยแพร่",
  "Holds long-term retirement investments — ahead of most Thai workers": "มีการลงทุนเพื่อเกษียณระยะยาว — นำหน้าแรงงานไทยส่วนใหญ่",
  "No long-term retirement investments yet — like most Thai workers": "ยังไม่มีการลงทุนเพื่อเกษียณระยะยาว — เหมือนแรงงานไทยส่วนใหญ่",
  "Most Thai workers lack adequate retirement savings; ~2 in 3 over-60s get no social-security annuity.":
    "แรงงานไทยส่วนใหญ่มีเงินเก็บเกษียณไม่พอ; ผู้สูงวัย 60+ ราว 2 ใน 3 ไม่มีสิทธิ์รับบำนาญประกันสังคม",

  // --- Suggestions (suggestions.js) ---
  "Grow your savings rate": "เพิ่มอัตราการออม",
  "Even 5% of any money that comes in counts — set it aside the day you receive it, before spending.":
    "แม้แค่ 5% ของเงินที่เข้ามาก็มีค่า — แยกเก็บทันทีวันที่ได้รับ ก่อนเอาไปใช้",
  "Automate a transfer on payday so saving happens before spending — 15-20% of income maxes this component.":
    "ตั้งโอนอัตโนมัติทุกวันเงินเดือนออก ให้การออมเกิดก่อนการใช้ — ออม 15-20% ของรายได้จะได้คะแนนเต็มส่วนนี้",
  "Raise your earning power": "เพิ่มพลังการหารายได้",
  "Review your rates against the market and pitch one new client this month — freelance income moves fastest through rate and volume.":
    "ทบทวนเรตราคาเทียบตลาด แล้วเสนองานลูกค้าใหม่สักรายในเดือนนี้ — รายได้ฟรีแลนซ์โตเร็วที่สุดผ่านเรตและปริมาณงาน",
  "Audit your margins: raising prices 5% or cutting one recurring cost usually beats chasing new customers.":
    "ตรวจสอบมาร์จิน: ขึ้นราคา 5% หรือตัดรายจ่ายประจำหนึ่งรายการ มักได้ผลกว่าการไล่หาลูกค้าใหม่",
  "A paid internship or part-time role in your field raises income now and your starting salary later.":
    "ฝึกงานแบบมีค่าตอบแทนหรืองานพาร์ตไทม์ในสายของคุณ เพิ่มทั้งรายได้ตอนนี้และเงินเดือนเริ่มต้นในอนาคต",
  "Focus applications on roles matching your strongest skill, and treat upskilling hours as your day job.":
    "โฟกัสสมัครงานที่ตรงกับทักษะที่แข็งที่สุดของคุณ และถือว่าชั่วโมงอัปสกิลคืองานประจำ",
  "Certifications and a documented win file are the strongest levers for your next salary negotiation.":
    "ใบรับรองและแฟ้มผลงานที่บันทึกไว้คือแต้มต่อที่ดีที่สุดในการต่อรองเงินเดือนครั้งหน้า",
  "Reduce money stress": "ลดความเครียดเรื่องเงิน",
  "Write a simple monthly budget — knowing exactly where you stand improves financial well-being even before income changes.":
    "เขียนงบประมาณรายเดือนง่าย ๆ — แค่รู้สถานะการเงินชัดเจนก็ช่วยเพิ่มสุขภาวะทางการเงินได้ก่อนที่รายได้จะเปลี่ยน",
  "Move more each week": "ขยับให้มากขึ้นทุกสัปดาห์",
  "Get off the BTS/MRT one station early or walk a park loop (Benjakitti, Lumphini) — the WHO guideline is 600 MET-min/week and brisk walking counts.":
    "ลง BTS/MRT ก่อนถึงหนึ่งสถานี หรือเดินรอบสวน (เบญจกิติ ลุมพินี) — เกณฑ์ WHO คือ 600 MET-นาที/สัปดาห์ และการเดินเร็วก็นับ",
  "Brisk walks or cycling around your neighborhood count — the WHO guideline is 600 MET-min/week, about 150 minutes of moderate movement.":
    "เดินเร็วหรือปั่นจักรยานรอบละแวกบ้านก็นับ — เกณฑ์ WHO คือ 600 MET-นาที/สัปดาห์ ราว 150 นาทีของการขยับระดับปานกลาง",
  "Rebalance body composition": "ปรับสมดุลองค์ประกอบร่างกาย",
  "Composition follows the activity and nutrition components — pair regular movement with regular meals, not crash changes.":
    "องค์ประกอบร่างกายตามมาจากการขยับและโภชนาการ — จับคู่การเคลื่อนไหวสม่ำเสมอกับมื้ออาหารสม่ำเสมอ ไม่ใช่การหักโหมเปลี่ยนกะทันหัน",
  "Protect your sleep window": "ปกป้องช่วงเวลานอน",
  "Anchor a fixed wake time and go screens-off 30 minutes before bed — 7-9 hours is the target band.":
    "ตั้งเวลาตื่นให้คงที่และวางหน้าจอ 30 นาทีก่อนนอน — เป้าหมายคือ 7-9 ชั่วโมง",
  "Hit 5 portions and 2.5L": "ให้ถึงผัก 5 ส่วนและน้ำ 2.5 ลิตร",
  "Add one vegetable portion to lunch and keep a water bottle at your desk — 5 portions and 2.5L/day max this component.":
    "เพิ่มผักหนึ่งส่วนในมื้อกลางวันและวางขวดน้ำไว้ที่โต๊ะ — ผัก 5 ส่วนกับน้ำ 2.5 ลิตร/วันได้คะแนนเต็มส่วนนี้",
  "Schedule something to look forward to": "วางแผนสิ่งที่จะได้ตั้งตารอ",
  "Low WHO-5 improves with planned positive activities — book one small enjoyable thing this week and journal how it went.":
    "คะแนน WHO-5 ต่ำดีขึ้นได้ด้วยกิจกรรมเชิงบวกที่วางแผนไว้ — นัดสิ่งเล็ก ๆ ที่ชอบสักอย่างในสัปดาห์นี้ แล้วจดบันทึกว่าเป็นอย่างไร",
  "Downshift stress daily": "ผ่อนความเครียดทุกวัน",
  "Two quick nasal inhales and one long exhale (the physiological sigh) is the fastest evidence-backed stress reset — do 3 before stressful blocks.":
    "สูดจมูกสั้น ๆ สองครั้งแล้วผ่อนลมหายใจออกยาว ๆ (physiological sigh) คือวิธีรีเซ็ตความเครียดที่เร็วที่สุดตามหลักฐาน — ทำ 3 ครั้งก่อนช่วงเวลาตึงเครียด",
  "Widen your circle": "ขยายวงสัมพันธ์",
  "Message one relative and one friend you haven't spoken to this month — social networks grow with regular contact, not grand gestures.":
    "ทักญาติหนึ่งคนและเพื่อนหนึ่งคนที่เดือนนี้ยังไม่ได้คุยกัน — เครือข่ายสังคมโตจากการติดต่อสม่ำเสมอ ไม่ใช่ท่าทีอลังการ",
  "Counter loneliness with contact": "สู้ความเหงาด้วยการติดต่อ",
  "Loneliness drops fastest with voice or face time, not feeds — call one person today instead of scrolling.":
    "ความเหงาลดเร็วที่สุดด้วยเสียงหรือการเจอหน้า ไม่ใช่ฟีด — วันนี้โทรหาใครสักคนแทนการไถจอ",
  "Invest in your relationship": "ลงทุนกับความสัมพันธ์",
  "Plan one distraction-free date this week — satisfaction tracks shared, novel experiences.":
    "วางแผนเดตแบบไม่มีสิ่งรบกวนหนึ่งครั้งในสัปดาห์นี้ — ความพึงพอใจมาจากประสบการณ์ใหม่ที่ทำร่วมกัน",
  "Stack small wins": "สะสมชัยชนะเล็ก ๆ",
  "Self-efficacy grows from completed challenges — pick one finishable task each morning and see it through.":
    "ความเชื่อมั่นในความสามารถโตจากความท้าทายที่ทำสำเร็จ — เลือกงานที่จบได้หนึ่งชิ้นทุกเช้าแล้วทำให้เสร็จ",
  "Build a streak": "สร้างสตรีค",
  "Choose one skill and touch it daily for 10 minutes — consistency, not intensity, moves grit.":
    "เลือกหนึ่งทักษะแล้วฝึกทุกวันวันละ 10 นาที — ความสม่ำเสมอ ไม่ใช่ความหนักหน่วง ที่ขยับความมุ่งมั่น",
  "Block learning hours": "บล็อกเวลาเรียนรู้",
  "Put 2-3 recurring study blocks on your calendar — 5h/week maxes this component.":
    "วางช่วงเรียนซ้ำ ๆ 2-3 บล็อกในปฏิทิน — 5 ชั่วโมง/สัปดาห์ได้คะแนนเต็มส่วนนี้",
  "Give a little, regularly": "ให้ทีละน้อยแต่สม่ำเสมอ",
  "Small recurring giving beats occasional large gifts — even 100 THB/month of merit-making or charity moves this.":
    "การให้เล็ก ๆ เป็นประจำชนะการให้ก้อนใหญ่นาน ๆ ครั้ง — แค่ทำบุญหรือบริจาคเดือนละ 100 บาทก็ขยับส่วนนี้ได้",
  "Volunteer a few hours": "อาสาสักสองสามชั่วโมง",
  "4 hours a month maxes this — one weekend morning at a local temple, shelter, or community event is enough.":
    "4 ชั่วโมงต่อเดือนได้คะแนนเต็ม — เช้าวันหยุดหนึ่งครั้งที่วัด ศูนย์พักพิง หรืองานชุมชนก็พอ",
  "Practice everyday prosociality": "ฝึกน้ำใจในชีวิตประจำวัน",
  "Help one stranger or neighbor this week — directions, carrying things, a genuine check-in all count.":
    "ช่วยคนแปลกหน้าหรือเพื่อนบ้านหนึ่งคนในสัปดาห์นี้ — บอกทาง ช่วยถือของ หรือทักถามสารทุกข์ก็นับ",
  "Cut single-use plastics": "ลดพลาสติกใช้ครั้งเดียว",
  "Carry a bottle and a bag — refill stations and no-bag discounts are common around Bangkok, and the Thai average is ~3 pieces/day.":
    "พกขวดน้ำและถุงผ้า — จุดเติมน้ำและส่วนลดงดถุงมีทั่วกรุงเทพฯ ค่าเฉลี่ยคนไทยอยู่ที่ ~3 ชิ้น/วัน",
  "Carry a reusable bottle and bag on every errand — the Thai average is ~3 single-use pieces/day; beating it is very achievable.":
    "พกขวดและถุงใช้ซ้ำทุกครั้งที่ออกไปทำธุระ — ค่าเฉลี่ยคนไทย ~3 ชิ้น/วัน เอาชนะได้ไม่ยากเลย",
  "Green your commute and home": "เดินทางและอยู่บ้านแบบรักษ์โลก",
  "Swap two car trips for the BTS/MRT this week and set the aircon to 25°C or higher.":
    "เปลี่ยนการใช้รถสองเที่ยวเป็น BTS/MRT ในสัปดาห์นี้ และตั้งแอร์ 25°C ขึ้นไป",
  "Walk or cycle short errands and set the aircon to 25°C or higher — everyday habits are the whole green-behavior score.":
    "เดินหรือปั่นจักรยานทำธุระใกล้ ๆ และตั้งแอร์ 25°C ขึ้นไป — คะแนนพฤติกรรมรักษ์โลกมาจากนิสัยประจำวันล้วน ๆ",
  "Upskill for the future": "อัปสกิลเพื่ออนาคต",
  "One hour of AI/data study per week already scores — 4h/week maxes this component.":
    "เรียน AI/ข้อมูลสัปดาห์ละหนึ่งชั่วโมงก็ได้คะแนนแล้ว — 4 ชั่วโมง/สัปดาห์ได้เต็มส่วนนี้",
  "Start long-term investing": "เริ่มลงทุนระยะยาว",
  "Open an SSF/RMF or index fund with any amount — most Thai workers have no retirement savings, so starting at all puts you ahead.":
    "เปิด SSF/RMF หรือกองทุนดัชนีด้วยเงินเท่าไรก็ได้ — แรงงานไทยส่วนใหญ่ไม่มีเงินเก็บเกษียณ แค่เริ่มก็นำหน้าแล้ว",
  "Act with a longer horizon": "ลงมือโดยมองให้ไกลขึ้น",
  "Mentor someone or support one cause aimed at future generations this month.":
    "เป็นพี่เลี้ยงให้ใครสักคน หรือสนับสนุนประเด็นเพื่อคนรุ่นหลังหนึ่งเรื่องในเดือนนี้",

  // --- Onboarding input validation (Phase 1) ---
  "Enter a number.": "กรุณากรอกตัวเลข",
  "Enter a value between {min} and {max}.": "กรุณากรอกค่าระหว่าง {min} ถึง {max}",
  "Please fix the highlighted fields before continuing.":
    "กรุณาแก้ไขช่องที่ไฮไลต์ก่อนดำเนินการต่อ",

  // --- Friendlier percentiles + deep assessment (Phase 4) ---
  // NOTE: the in-depth questionnaire ITEM texts are translated in the
  // "Deep instrument item texts" block at the end of this file. They are
  // unofficial Thai renderings kept faithful to the published English items
  // (the earlier English-only carve-out rendered half-translated forms,
  // because items shared with onboarding already had Thai entries). The
  // canonical instruments remain the cited English versions on #/methodology.
  "In-depth": "เชิงลึก",
  "Measured with the full long-form instruments (deep assessment complete)":
    "วัดด้วยแบบประเมินฉบับเต็ม (ทำแบบประเมินเชิงลึกครบแล้ว)",
  "Ahead of about {pct}% of people like you": "นำหน้าผู้คนที่คล้ายคุณราว {pct}%",
  // {pct}/{low}/{high} arrive from percentileLabel() already prefixed with
  // "ที่ " in Thai, so the template adds no space before them.
  "{pct} percentile · typical range {low}–{high}": "เปอร์เซ็นไทล์{pct} · ช่วงทั่วไป{low}–{high}",
  "in-depth verified": "ยืนยันเชิงลึกแล้ว",
  "“Percentile” = the share of people you're ahead of, so higher is better. The range shows how precise this estimate is, not a statistical confidence interval.":
    "“เปอร์เซ็นไทล์” = สัดส่วนของคนที่คุณนำหน้า ยิ่งสูงยิ่งดี ส่วนช่วงบอกว่าค่าประมาณนี้แม่นแค่ไหน ไม่ใช่ช่วงความเชื่อมั่นทางสถิติ",

  "Go deeper for more accurate scores.": "ทำแบบประเมินเชิงลึกเพื่อคะแนนที่แม่นยำขึ้น",
  "An optional in-depth assessment uses the full-length validated questionnaires to sharpen your estimates and tighten each percentile band.":
    "แบบประเมินเชิงลึก (ไม่บังคับ) ใช้แบบสอบถามฉบับเต็มที่ผ่านการตรวจสอบ เพื่อให้ค่าประมาณคมขึ้นและช่วงเปอร์เซ็นไทล์แคบลง",
  "In-depth sections completed: {done}/{total}": "ทำแบบประเมินเชิงลึกแล้ว: {done}/{total} หมวด",
  "Continue in-depth": "ทำเชิงลึกต่อ",
  "Start in-depth assessment": "เริ่มแบบประเมินเชิงลึก",
  "IN-DEPTH ASSESSMENT": "แบบประเมินเชิงลึก",
  "Optional • full-length validated questionnaires • one section at a time":
    "ไม่บังคับ • แบบสอบถามฉบับเต็มที่ผ่านการตรวจสอบ • ทำทีละหมวด",
  "These longer questionnaires make each aspect's estimate more reliable and tighten its percentile band. Save each section on its own — completed sections are kept as you go. Reward: +60 points per section.":
    "แบบสอบถามที่ยาวขึ้นเหล่านี้ทำให้ค่าประมาณของแต่ละด้านน่าเชื่อถือขึ้นและช่วงเปอร์เซ็นไทล์แคบลง บันทึกแต่ละหมวดแยกกันได้ — หมวดที่ทำเสร็จจะถูกเก็บไว้ รางวัล: +60 คะแนนต่อหมวด",
  "Completed — this aspect's score is verified. You can redo it to update.":
    "เสร็จแล้ว — คะแนนด้านนี้ได้รับการยืนยัน คุณทำซ้ำเพื่ออัปเดตได้",
  "Update this section": "อัปเดตหมวดนี้",
  "Save this section": "บันทึกหมวดนี้",
  "{aspect} verified in depth — score now {score} (+60 points)":
    "{aspect} ยืนยันเชิงลึกแล้ว — คะแนนตอนนี้ {score} (+60 คะแนน)",
  "In-depth assessment needs a baseline — complete the initial assessment first.":
    "แบบประเมินเชิงลึกต้องมีค่าพื้นฐานก่อน — กรุณาทำแบบประเมินเริ่มต้นให้เสร็จก่อน",

  // Percentile band labels
  "Top 10%": "10% แรก",
  "Top 25%": "25% แรก",
  "Above average": "สูงกว่าค่าเฉลี่ย",
  "Around average": "ราวค่าเฉลี่ย",
  "Below average": "ต่ำกว่าค่าเฉลี่ย",
  "Bottom 25%": "25% ล่าง",

  // --- Letter grades and the Balance Index (Phase L1) ---
  // Grade band labels (GRADE_BANDS in grades.js) — rendered via t(variable),
  // so the data-walking guard in tests/i18n-coverage.test.mjs pins them.
  "Top 30%": "30% แรก",
  "Typical range": "ช่วงทั่วไป",
  "Below typical": "ต่ำกว่าทั่วไป",
  "Bottom 10%": "10% ล่าง",
  // Balance Index band labels (BALANCE_BANDS in grades.js).
  "Strong balance": "สมดุลดีมาก",
  "Steady balance": "สมดุลมั่นคง",
  "Uneven balance": "สมดุลไม่สม่ำเสมอ",
  "Strained balance": "สมดุลตึงเครียด",

  "Grade {letter}": "เกรด {letter}",
  "Not graded": "ยังไม่ให้เกรด",
  "Not graded yet.": "ยังไม่ให้เกรด",
  "Balance Index": "ดัชนีสมดุล",
  "Grades and the Balance Index": "เกรดและดัชนีสมดุล",
  "Grade {letter} — {band} of people like you (percentile {pct}).":
    "เกรด {letter} — {band} ของคนที่คล้ายคุณ (เปอร์เซ็นไทล์ที่ {pct})",
  "{band} of people like you, from the population comparison below.":
    "{band} ของคนที่คล้ายคุณ จากการเทียบกับประชากรด้านล่าง",
  "Grades come from the cited percentile, not from the 0-100 score — the score is this app's own composite, while the percentile is the part that compares you with real published data.":
    "เกรดมาจากเปอร์เซ็นไทล์ที่อ้างอิงแหล่งข้อมูล ไม่ได้มาจากคะแนน 0-100 เพราะคะแนนเป็นค่าที่แอปนี้ประกอบขึ้นเอง ส่วนเปอร์เซ็นไทล์คือส่วนที่เทียบคุณกับข้อมูลที่เผยแพร่จริง",
  "This aspect is graded from its population comparison, which needs its questionnaires answered first.":
    "ด้านนี้ให้เกรดจากการเทียบกับประชากร ซึ่งต้องตอบแบบสอบถามของด้านนี้ก่อน",
  "Answer this aspect's questionnaires to unlock its grade.":
    "ตอบแบบสอบถามของด้านนี้เพื่อปลดล็อกเกรด",
  "A harmonic mean of your eight aspects — it rises fastest when your lowest aspect rises. This is this app's own summary figure, not a published measure.":
    "ค่าเฉลี่ยฮาร์มอนิกของทั้งแปดด้าน — จะขยับขึ้นเร็วที่สุดเมื่อด้านที่ต่ำที่สุดของคุณดีขึ้น นี่เป็นตัวเลขสรุปที่แอปนี้สร้างขึ้นเอง ไม่ใช่มาตรวัดที่มีการเผยแพร่",
  "Lifting {aspect} would move it most.": "การยกระดับด้าน{aspect}จะทำให้ค่านี้ขยับมากที่สุด",
  "A letter grade (A-F) comes from an aspect's population percentile, never from its 0-100 score: A is the top 10%, B the top 30%, C the typical middle (30th-69th), D below typical, and F the bottom 10%. The percentile is the part of an aspect that compares you with published data, so it is the only part worth grading. An aspect whose questionnaires you have not answered is shown as “not graded” — never as an F, because missing data is not a failing result.":
    "เกรด (A-F) มาจากเปอร์เซ็นไทล์เทียบประชากรของแต่ละด้าน ไม่ได้มาจากคะแนน 0-100: A คือ 10% แรก, B คือ 30% แรก, C คือช่วงกลางทั่วไป (เปอร์เซ็นไทล์ที่ 30-69), D คือต่ำกว่าทั่วไป และ F คือ 10% ล่าง เปอร์เซ็นไทล์คือส่วนของคะแนนที่เทียบคุณกับข้อมูลที่เผยแพร่จริง จึงเป็นส่วนเดียวที่ควรนำมาให้เกรด ด้านที่คุณยังไม่ได้ตอบแบบสอบถามจะแสดงว่า “ยังไม่ให้เกรด” ไม่ใช่ F เพราะการไม่มีข้อมูลไม่ใช่ผลลัพธ์ที่ล้มเหลว",
  "The Balance Index is this app's own summary figure, not a published or validated measure — unlike the eight aspect scores and their percentiles, no research proposes it and nothing outside this app uses it. It is the harmonic mean of your eight aspect scores, which means your lowest aspect pulls it down hardest: eight scores of 70 give an index of 70, while seven scores near 79 with one at 10 give 42, even though both average 70. That is deliberate — a single number that rewarded a high average would reward neglecting an aspect entirely, and this app is about balance.":
    "ดัชนีสมดุลเป็นตัวเลขสรุปที่แอปนี้สร้างขึ้นเอง ไม่ใช่มาตรวัดที่มีการเผยแพร่หรือผ่านการตรวจสอบความตรง ต่างจากคะแนนทั้งแปดด้านและเปอร์เซ็นไทล์ของมัน ไม่มีงานวิจัยใดเสนอค่านี้ และไม่มีที่ใดนอกแอปนี้ใช้มัน ค่านี้คือค่าเฉลี่ยฮาร์มอนิกของคะแนนทั้งแปดด้าน ซึ่งหมายความว่าด้านที่ต่ำที่สุดจะดึงค่านี้ลงแรงที่สุด: คะแนน 70 ทั้งแปดด้านได้ดัชนี 70 ขณะที่เจ็ดด้านราว 79 กับอีกหนึ่งด้านที่ 10 ได้ดัชนี 42 ทั้งที่ค่าเฉลี่ยเท่ากับ 70 เหมือนกัน นี่เป็นความตั้งใจ เพราะตัวเลขเดียวที่ให้รางวัลกับค่าเฉลี่ยสูง ย่อมให้รางวัลกับการละเลยบางด้านไปเลย และแอปนี้ว่าด้วยเรื่องสมดุล",
  "Because the index is dominated by your weakest aspect, raising a low score moves it far more than raising an already-high one. Treat it as a prompt about where attention is missing, not as a verdict on your life.":
    "เพราะดัชนีนี้ถูกกำหนดโดยด้านที่อ่อนที่สุดของคุณเป็นหลัก การยกคะแนนที่ต่ำจึงทำให้ดัชนีขยับมากกว่าการยกคะแนนที่สูงอยู่แล้วมาก ให้มองว่านี่เป็นสัญญาณว่าคุณกำลังละเลยด้านไหน ไม่ใช่คำตัดสินชีวิตของคุณ",
  "Grades also steer suggestions: when you add a weekly pledge, the ones tied to your lowest-graded aspects are listed first, so the easiest win to act on is already at the top.":
    "เกรดยังชี้นำคำแนะนำด้วย: เมื่อคุณเพิ่มคำมั่นรายสัปดาห์ คำมั่นที่ผูกกับด้านที่คุณได้เกรดต่ำที่สุดจะแสดงก่อน เพื่อให้เป้าหมายที่ลงมือทำได้ง่ายที่สุดอยู่บนสุดแล้ว",

  // Deep section titles & blurbs
  "Finance — in depth": "การเงิน — เชิงลึก",
  "Physical — in depth": "ร่างกาย — เชิงลึก",
  "Mental — in depth": "จิตใจ — เชิงลึก",
  "Relationships — in depth": "ความสัมพันธ์ — เชิงลึก",
  "Personal Goals — in depth": "เป้าหมายส่วนตัว — เชิงลึก",
  "Social Contribution — in depth": "การช่วยเหลือสังคม — เชิงลึก",
  "Environment — in depth": "สิ่งแวดล้อม — เชิงลึก",
  "Humanity's Future — in depth": "อนาคตมนุษยชาติ — เชิงลึก",
  "The full 10-item CFPB Financial Well-Being Scale (onboarding used 5).":
    "แบบวัดสุขภาวะทางการเงิน CFPB ฉบับเต็ม 10 ข้อ (ตอนเริ่มต้นใช้ 5 ข้อ)",
  "Sedentary time and sleep hygiene refine your activity and sleep scores.":
    "เวลานั่งและสุขอนามัยการนอนช่วยปรับคะแนนการเคลื่อนไหวและการนอนให้แม่นขึ้น",
  "The 10-item Perceived Stress Scale adds a validated stress reading.":
    "แบบวัดความเครียด PSS-10 เพิ่มการวัดความเครียดที่ผ่านการตรวจสอบ",
  "The full LSNS-R social-network scale, plus the full relationship scale for couples.":
    "แบบวัดเครือข่ายสังคม LSNS-R ฉบับเต็ม พร้อมแบบวัดความสัมพันธ์ฉบับเต็มสำหรับผู้มีคู่",
  "Full GSE-10 and Grit-12, plus the Rosenberg Self-Esteem Scale.":
    "GSE-10 และ Grit-12 ฉบับเต็ม พร้อมแบบวัดความภาคภูมิใจในตนเองของ Rosenberg",
  "Additional giving and civic-participation habits.": "พฤติกรรมการให้และการมีส่วนร่วมพลเมืองเพิ่มเติม",
  "Additional everyday green habits.": "นิสัยรักษ์โลกในชีวิตประจำวันเพิ่มเติม",
  "The 12-item Consideration of Future Consequences scale.": "แบบวัดการคำนึงถึงผลในอนาคต (CFC) 12 ข้อ",

  // Deep instrument titles
  "CFPB Financial Well-Being Scale (full 10-item)": "แบบวัดสุขภาวะทางการเงิน CFPB (ฉบับเต็ม 10 ข้อ)",
  "Sedentary time & sleep hygiene": "เวลานั่งและสุขอนามัยการนอน",
  "Perceived Stress Scale (PSS-10, past month)": "แบบวัดความเครียด (PSS-10, เดือนที่ผ่านมา)",
  "Lubben Social Network Scale – Revised (LSNS-R)": "แบบวัดเครือข่ายสังคม Lubben ฉบับปรับปรุง (LSNS-R)",
  "Relationship Assessment Scale (full 7-item)": "แบบวัดความสัมพันธ์ (ฉบับเต็ม 7 ข้อ)",
  "General Self-Efficacy Scale (full 10-item)": "แบบวัดการรับรู้ความสามารถของตนเอง (ฉบับเต็ม 10 ข้อ)",
  "Grit Scale (full 12-item)": "แบบวัดความมุ่งมั่น (ฉบับเต็ม 12 ข้อ)",
  "Rosenberg Self-Esteem Scale": "แบบวัดความภาคภูมิใจในตนเองของ Rosenberg",
  "Giving & civic habits (self-report)": "นิสัยการให้และพลเมือง (รายงานตนเอง)",
  "Everyday green habits (self-report)": "นิสัยรักษ์โลกประจำวัน (รายงานตนเอง)",
  "Consideration of Future Consequences (CFC-12)": "การคำนึงถึงผลในอนาคต (CFC-12)",

  // Deep component labels & details (aspects.js)
  "Financial well-being (CFPB-10)": "สุขภาวะทางการเงิน (CFPB-10)",
  "Perceived stress (PSS-10)": "ความเครียดที่รับรู้ (PSS-10)",
  "Social network (LSNS-R)": "เครือข่ายสังคม (LSNS-R)",
  "Relationship quality (RAS-7)": "คุณภาพความสัมพันธ์ (RAS-7)",
  "Self-efficacy (GSE-10)": "การรับรู้ความสามารถของตนเอง (GSE-10)",
  "Grit (12-item)": "ความมุ่งมั่น (12 ข้อ)",
  "Self-esteem (Rosenberg)": "ความภาคภูมิใจในตนเอง (Rosenberg)",
  "Giving & civic habits": "นิสัยการให้และพลเมือง",
  "Green habits (extended)": "นิสัยรักษ์โลก (ฉบับขยาย)",
  "Future orientation (CFC-12)": "การมองการณ์ไกล (CFC-12)",
  "Full 10-item scale — raw {n}/40": "แบบเต็ม 10 ข้อ — คะแนนดิบ {n}/40",
  "Sitting time + sleep habits — raw {n}/12": "เวลานั่ง + นิสัยการนอน — คะแนนดิบ {n}/12",
  "Stress {n}/40, inverted (lower stress scores higher)": "ความเครียด {n}/40 กลับด้าน (เครียดน้อยได้คะแนนสูงกว่า)",
  "Full 12-item network scale — raw {n}/60": "แบบเครือข่ายเต็ม 12 ข้อ — คะแนนดิบ {n}/60",
  "Full 7-item scale — raw {n}/35": "แบบเต็ม 7 ข้อ — คะแนนดิบ {n}/35",
  "Full 12-item scale — raw {n}/60": "แบบเต็ม 12 ข้อ — คะแนนดิบ {n}/60",
  "Rosenberg scale — raw {n}/30": "แบบ Rosenberg — คะแนนดิบ {n}/30",
  "Additional habits — raw {n}/16": "นิสัยเพิ่มเติม — คะแนนดิบ {n}/16",
  "Scored from your full 10-item GSE — a direct match to the 25-country norm, no short-form approximation.":
    "คิดจาก GSE ฉบับเต็ม 10 ข้อของคุณ — ตรงกับเกณฑ์ 25 ประเทศพอดี ไม่ต้องประมาณจากแบบสั้น",

  // New answer-option labels used by the deep instruments
  "Almost never": "แทบไม่เคย",
  "Fairly often": "ค่อนข้างบ่อย",
  "Extremely characteristic of me": "ตรงกับฉันมากที่สุด",
  "Somewhat characteristic of me": "ค่อนข้างตรงกับฉัน",
  "Uncertain": "ไม่แน่ใจ",
  "Somewhat uncharacteristic of me": "ค่อนข้างไม่ตรงกับฉัน",
  "Extremely uncharacteristic of me": "ไม่ตรงกับฉันเลย",
  "Strongly agree": "เห็นด้วยอย่างยิ่ง",
  "Agree": "เห็นด้วย",
  "Disagree": "ไม่เห็นด้วย",
  "Strongly disagree": "ไม่เห็นด้วยอย่างยิ่ง",
  "Less than monthly": "น้อยกว่าเดือนละครั้ง",
  "Monthly": "เดือนละครั้ง",
  "A few times a month": "เดือนละไม่กี่ครั้ง",
  "Weekly": "ทุกสัปดาห์",
  "A few times a week": "สัปดาห์ละไม่กี่ครั้ง",
  "Daily": "ทุกวัน",
  "Seldom": "นาน ๆ ครั้ง",
  "None / very few": "ไม่มี / น้อยมาก",
  "A few": "ไม่กี่อย่าง",
  "Some": "บ้าง",
  "Many": "มาก",
  "Very many": "มากมาย",
  "Less than 4 hours": "น้อยกว่า 4 ชั่วโมง",
  "4–6 hours": "4–6 ชั่วโมง",
  "6–8 hours": "6–8 ชั่วโมง",
  "8–10 hours": "8–10 ชั่วโมง",
  "More than 10 hours": "มากกว่า 10 ชั่วโมง",

  // --- Deep instrument item texts ---
  // Unofficial Thai renderings of the deep-only items (items shared with the
  // onboarding short forms are translated in the onboarding block above, and
  // the two sets must read as one voice: questions end "…บ่อยแค่ไหน?",
  // statements are first-person ฉัน without trailing punctuation).

  // CFPB-10 (the five items not in the onboarding CFPB-5)
  "I could handle a major unexpected expense.": "ฉันรับมือกับรายจ่ายก้อนใหญ่ที่ไม่คาดคิดได้",
  "I am securing my financial future.": "ฉันกำลังสร้างความมั่นคงให้อนาคตทางการเงินของฉัน",
  "I can enjoy life because of the way I'm managing my money.": "ฉันมีความสุขกับชีวิตได้ เพราะวิธีจัดการเงินของฉัน",
  "Giving a gift for a wedding, birthday, or other occasion would put a strain on my finances for the month.":
    "การให้ของขวัญในงานแต่งงาน วันเกิด หรือโอกาสอื่น ๆ ทำให้การเงินของฉันตึงมือไปทั้งเดือน",
  "I am behind with my finances.": "ฉันมีภาระการเงินค้างจ่ายอยู่",

  // Sedentary time & sleep hygiene
  "On a typical weekday, about how many hours do you spend sitting?": "ในวันธรรมดาทั่วไป คุณใช้เวลานั่งประมาณกี่ชั่วโมง?",
  "I keep a consistent sleep and wake schedule.": "ฉันเข้านอนและตื่นนอนเป็นเวลาสม่ำเสมอ",
  "I avoid screens for at least 30 minutes before bed.": "ฉันงดใช้หน้าจออย่างน้อย 30 นาทีก่อนนอน",

  // PSS-10 (Cohen, past month)
  "In the last month, how often have you been upset because of something that happened unexpectedly?":
    "ในเดือนที่ผ่านมา คุณรู้สึกไม่สบายใจเพราะมีเรื่องไม่คาดคิดเกิดขึ้นบ่อยแค่ไหน?",
  "In the last month, how often have you felt unable to control the important things in your life?":
    "ในเดือนที่ผ่านมา คุณรู้สึกว่าควบคุมเรื่องสำคัญในชีวิตไม่ได้บ่อยแค่ไหน?",
  "In the last month, how often have you felt nervous and stressed?":
    "ในเดือนที่ผ่านมา คุณรู้สึกเครียดและวิตกกังวลบ่อยแค่ไหน?",
  "In the last month, how often have you felt confident about your ability to handle your personal problems?":
    "ในเดือนที่ผ่านมา คุณรู้สึกมั่นใจว่าจัดการปัญหาส่วนตัวของตัวเองได้บ่อยแค่ไหน?",
  "In the last month, how often have you felt that things were going your way?":
    "ในเดือนที่ผ่านมา คุณรู้สึกว่าสิ่งต่าง ๆ เป็นไปอย่างที่ใจต้องการบ่อยแค่ไหน?",
  "In the last month, how often have you found that you could not cope with all the things you had to do?":
    "ในเดือนที่ผ่านมา คุณพบว่ารับมือกับทุกเรื่องที่ต้องทำไม่ไหวบ่อยแค่ไหน?",
  "In the last month, how often have you been able to control irritations in your life?":
    "ในเดือนที่ผ่านมา คุณควบคุมความหงุดหงิดในชีวิตได้บ่อยแค่ไหน?",
  "In the last month, how often have you felt that you were on top of things?":
    "ในเดือนที่ผ่านมา คุณรู้สึกว่าจัดการทุกอย่างได้อยู่มือบ่อยแค่ไหน?",
  "In the last month, how often have you been angered because of things that were outside of your control?":
    "ในเดือนที่ผ่านมา คุณรู้สึกโกรธเพราะเรื่องที่อยู่นอกเหนือการควบคุมบ่อยแค่ไหน?",
  "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?":
    "ในเดือนที่ผ่านมา คุณรู้สึกว่าปัญหาสุมเข้ามามากจนก้าวข้ามไม่ไหวบ่อยแค่ไหน?",

  // LSNS-R (the six contact/decision items the -6 short form doesn't have)
  "How often do you see or hear from the relative with whom you have the most contact?":
    "คุณได้พบหรือติดต่อกับญาติคนที่ติดต่อกันมากที่สุดบ่อยแค่ไหน?",
  "When one of your relatives has an important decision to make, how often do they talk to you about it?":
    "เมื่อญาติของคุณต้องตัดสินใจเรื่องสำคัญ เขามาปรึกษาคุณบ่อยแค่ไหน?",
  "How often is one of your relatives available for you to talk to when you have an important decision to make?":
    "เมื่อคุณต้องตัดสินใจเรื่องสำคัญ มีญาติพร้อมให้ปรึกษาบ่อยแค่ไหน?",
  "How often do you see or hear from the friend with whom you have the most contact?":
    "คุณได้พบหรือติดต่อกับเพื่อนคนที่ติดต่อกันมากที่สุดบ่อยแค่ไหน?",
  "When one of your friends has an important decision to make, how often do they talk to you about it?":
    "เมื่อเพื่อนของคุณต้องตัดสินใจเรื่องสำคัญ เขามาปรึกษาคุณบ่อยแค่ไหน?",
  "How often is one of your friends available for you to talk to when you have an important decision to make?":
    "เมื่อคุณต้องตัดสินใจเรื่องสำคัญ มีเพื่อนพร้อมให้ปรึกษาบ่อยแค่ไหน?",

  // RAS-7 (items 4-7 beyond the onboarding RAS-3)
  "How often do you wish you hadn't gotten into this relationship?":
    "คุณรู้สึกว่าไม่น่าเข้ามาอยู่ในความสัมพันธ์นี้เลยบ่อยแค่ไหน?",
  "To what extent has your relationship met your original expectations?":
    "ความสัมพันธ์ของคุณเป็นไปตามที่คาดหวังไว้แต่แรกมากน้อยแค่ไหน?",
  "How much do you love your partner?": "คุณรักคู่ของคุณมากแค่ไหน?",
  "How many problems are there in your relationship?": "ความสัมพันธ์ของคุณมีปัญหามากน้อยแค่ไหน?",

  // GSE-10 (the four items not in the onboarding GSE-6)
  "It is easy for me to stick to my aims and accomplish my goals.":
    "เป็นเรื่องง่ายสำหรับฉันที่จะยึดมั่นกับความตั้งใจและทำเป้าหมายให้สำเร็จ",
  "I can remain calm when facing difficulties because I can rely on my coping abilities.":
    "ฉันใจเย็นได้เมื่อเจอความยากลำบาก เพราะพึ่งความสามารถรับมือของตัวเองได้",
  "When I am confronted with a problem, I can usually find several solutions.": "เมื่อเจอปัญหา ฉันมักหาทางแก้ได้หลายทาง",
  "If I am in trouble, I can usually think of a solution.": "หากตกที่นั่งลำบาก ฉันมักคิดหาทางออกได้",

  // Grit-12 (the items not in the onboarding Grit-S)
  "I have overcome setbacks to conquer an important challenge.": "ฉันเคยฝ่าอุปสรรคจนพิชิตความท้าทายสำคัญมาแล้ว",
  "New ideas and projects sometimes distract me from previous ones.":
    "ไอเดียหรือโปรเจกต์ใหม่ ๆ บางครั้งก็ดึงความสนใจฉันไปจากของเดิม",
  "My interests change from year to year.": "ความสนใจของฉันเปลี่ยนไปปีต่อปี",
  "Setbacks don't discourage me.": "อุปสรรคไม่ทำให้ฉันท้อ",
  "I have been obsessed with a certain idea or project for a short time but later lost interest.":
    "ฉันเคยหมกมุ่นกับไอเดียหรือโปรเจกต์หนึ่งอยู่ช่วงสั้น ๆ แล้วก็หมดความสนใจไป",
  "I often set a goal but later choose to pursue a different one.":
    "ฉันมักตั้งเป้าหมายไว้ แล้วภายหลังก็เปลี่ยนไปตามเป้าหมายอื่น",
  "I have difficulty maintaining my focus on projects that take more than a few months to complete.":
    "ฉันจดจ่อกับโปรเจกต์ที่ใช้เวลาหลายเดือนกว่าจะเสร็จได้ยาก",
  "I have achieved a goal that took years of work.": "ฉันเคยทำเป้าหมายที่ใช้เวลาหลายปีจนสำเร็จ",
  "I become interested in new pursuits every few months.": "ฉันหันไปสนใจเรื่องใหม่ ๆ ทุกสองสามเดือน",
  "I am diligent.": "ฉันมุ่งมั่นพากเพียร",

  // Rosenberg Self-Esteem Scale
  "On the whole, I am satisfied with myself.": "โดยรวมแล้ว ฉันพอใจในตัวเอง",
  "At times I think I am no good at all.": "บางครั้งฉันก็คิดว่าตัวเองไม่ได้เรื่องเลย",
  "I feel that I have a number of good qualities.": "ฉันรู้สึกว่าตัวเองมีข้อดีหลายอย่าง",
  "I am able to do things as well as most other people.": "ฉันทำสิ่งต่าง ๆ ได้ดีพอ ๆ กับคนส่วนใหญ่",
  "I feel I do not have much to be proud of.": "ฉันรู้สึกว่าตัวเองไม่ค่อยมีอะไรให้ภูมิใจ",
  "I certainly feel useless at times.": "บางครั้งฉันก็รู้สึกว่าตัวเองไร้ประโยชน์",
  "I feel that I'm a person of worth, at least on an equal plane with others.":
    "ฉันรู้สึกว่าตัวเองเป็นคนมีคุณค่า อย่างน้อยก็เท่าเทียมกับคนอื่น ๆ",
  "I wish I could have more respect for myself.": "ฉันอยากนับถือตัวเองได้มากกว่านี้",
  "All in all, I am inclined to feel that I am a failure.": "เมื่อมองทุกอย่างรวมกัน ฉันค่อนไปทางรู้สึกว่าตัวเองล้มเหลว",
  "I take a positive attitude toward myself.": "ฉันมองตัวเองในแง่ดี",

  // Giving & civic habits
  "I give to or support causes I care about on a regular basis.": "ฉันบริจาคหรือสนับสนุนประเด็นที่ใส่ใจอย่างสม่ำเสมอ",
  "I volunteer my time or skills for others or my community.": "ฉันสละเวลาหรือใช้ทักษะเป็นจิตอาสาเพื่อผู้อื่นหรือชุมชน",
  "I take part in civic activities such as voting, community meetings, or petitions.":
    "ฉันเข้าร่วมกิจกรรมพลเมือง เช่น เลือกตั้ง ประชุมชุมชน หรือลงชื่อเรียกร้อง",
  "I go out of my way to help strangers when I see a need.": "ฉันเต็มใจออกแรงช่วยคนแปลกหน้าเมื่อเห็นว่าเขาเดือดร้อน",

  // Everyday green habits
  "I choose products with less packaging or more eco-friendly options.": "ฉันเลือกสินค้าที่บรรจุภัณฑ์น้อยหรือรักษ์โลกกว่า",
  "I repair or reuse items instead of replacing them.": "ฉันซ่อมหรือใช้ซ้ำสิ่งของแทนการซื้อใหม่",
  "I limit food waste and compost when I can.": "ฉันลดขยะอาหาร และทำปุ๋ยหมักเมื่อทำได้",
  "I use energy- and water-saving practices at home.": "ฉันใช้วิธีประหยัดพลังงานและน้ำที่บ้าน",

  // CFC-12
  "I consider how things might be in the future, and try to influence those things with my day-to-day behavior.":
    "ฉันคำนึงว่าอนาคตจะเป็นอย่างไร และพยายามให้พฤติกรรมประจำวันของตัวเองส่งผลต่อสิ่งเหล่านั้น",
  "Often I engage in a particular behavior in order to achieve outcomes that may not result for many years.":
    "บ่อยครั้งฉันทำสิ่งต่าง ๆ เพื่อผลลัพธ์ที่อาจต้องรออีกหลายปีกว่าจะเกิด",
  "I only act to satisfy immediate concerns, figuring the future will take care of itself.":
    "ฉันทำเพียงเพื่อตอบโจทย์เรื่องเฉพาะหน้า โดยคิดว่าอนาคตจะดูแลตัวมันเอง",
  "My behavior is only influenced by the immediate (a matter of days or weeks) outcomes of my actions.":
    "พฤติกรรมของฉันขึ้นกับผลลัพธ์เฉพาะหน้า (ภายในไม่กี่วันหรือไม่กี่สัปดาห์) ของการกระทำเท่านั้น",
  "My convenience is a big factor in the decisions I make or the actions I take.":
    "ความสะดวกของตัวเองเป็นปัจจัยใหญ่ในการตัดสินใจหรือการลงมือทำของฉัน",
  "I am willing to sacrifice my immediate happiness or well-being in order to achieve future outcomes.":
    "ฉันยอมสละความสุขหรือความสบายในตอนนี้ เพื่อให้ได้ผลลัพธ์ในอนาคต",
  "I think it is important to take warnings about negative outcomes seriously even if the negative outcome will not occur for many years.":
    "ฉันคิดว่าการใส่ใจคำเตือนถึงผลเสียเป็นเรื่องสำคัญ แม้ผลเสียนั้นจะยังไม่เกิดไปอีกหลายปี",
  "I think it is more important to perform a behavior with important distant consequences than a behavior with less-important immediate consequences.":
    "ฉันคิดว่าการทำสิ่งที่ส่งผลสำคัญในระยะไกล สำคัญกว่าการทำสิ่งที่ให้ผลเฉพาะหน้าแต่สำคัญน้อยกว่า",
  "I generally ignore warnings about possible future problems because I think the problems will be resolved before they reach crisis level.":
    "โดยทั่วไปฉันไม่ใส่ใจคำเตือนถึงปัญหาที่อาจเกิดในอนาคต เพราะคิดว่าปัญหาจะคลี่คลายก่อนถึงขั้นวิกฤต",
  "I think that sacrificing now is usually unnecessary since future outcomes can be dealt with at a later time.":
    "ฉันคิดว่าการเสียสละตอนนี้มักไม่จำเป็น เพราะเรื่องในอนาคตค่อยไปจัดการทีหลังได้",
  "I only act to satisfy immediate concerns, figuring that I will take care of future problems that may occur at a later date.":
    "ฉันทำเพียงเพื่อตอบโจทย์เรื่องเฉพาะหน้า โดยคิดว่าปัญหาในอนาคตค่อยไปแก้ทีหลัง",
  "Since my day-to-day work has specific outcomes, it is more important to me than behavior that has distant outcomes.":
    "เพราะงานประจำวันของฉันให้ผลลัพธ์ที่ชัดเจน มันจึงสำคัญกับฉันมากกว่าสิ่งที่ให้ผลในระยะไกล"
};
