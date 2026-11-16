/* =========================================================================
   হিসাব ইঞ্জিন — জেএসআই ০১/২০২৬
   ========================================================================= */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** সংখ্যা → বাংলা অঙ্ক (বাংলাদেশি কমা বিন্যাস) */
function bn(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  const neg = num < 0;
  let n = Math.abs(num);
  let s = decimals ? n.toFixed(decimals) : String(Math.round(n));
  let [ip, fp] = s.split('.');
  if (ip.length > 3) {
    let head = ip.slice(0, -3), tail = ip.slice(-3);
    const parts = [];
    while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
    if (head) parts.unshift(head);
    ip = parts.join(',') + ',' + tail;
  }
  s = ip + (fp ? '.' + fp : '');
  s = s.replace(/\d/g, d => BN_DIGITS[d]);
  return (neg ? '−' : '') + s;
}
const tk = (n, d = 0) => `৳\u00A0${bn(n, d)}`;

/** বাংলা/ইংরেজি অঙ্ক মিশ্রিত স্ট্রিং → সংখ্যা */
function toNum(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(/[০-৯]/g, d => BN_DIGITS.indexOf(d)).replace(/[,\s৳]/g, '');
  if (s === '') return NaN;
  return Number(s);
}

const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
function bnDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return '—';
  return `${bnPlain(d.getDate()).padStart(2, '০')} ${BN_MONTHS[d.getMonth()]} ${bnPlain(d.getFullYear())}`;
}
/** কমা ছাড়া বাংলা অঙ্ক (সাল, তারিখ) */
const bnPlain = n => String(n).replace(/\d/g, d => BN_DIGITS[d]);
function parseDate(s) {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? null : d;
}
/** a থেকে b পর্যন্ত পূর্ণ বছর ও মাস */
function diffYM(a, b) {
  let y = b.getFullYear() - a.getFullYear();
  let m = b.getMonth() - a.getMonth();
  if (b.getDate() < a.getDate()) m -= 1;
  if (m < 0) { y -= 1; m += 12; }
  return { y, m };
}
const ageOn = (dob, on) => diffYM(dob, on).y;

/* ---------- মূল বেতন নির্ধারণ ---------- */
function rankLevel(rankKey) {
  if (['MWO','SWO','WO'].includes(rankKey)) return 'JCO';
  if (rankKey === 'SGT') return 'SGT';
  return 'CPL'; // কর্পোরাল ও তদনিম্ন
}
const isSgtUp = k => ['MWO','SWO','WO','SGT'].includes(k);
const isCplDown = k => ['CPL','LCPL','SNK','NCE'].includes(k);

/** অনুচ্ছেদ ২(খ): পুরোনো বেতন → নতুন স্কেলে নির্ধারণ */
function fixPay(rankKey, oldBasic, oldStart) {
  const scale = RANKS[rankKey].newScale;
  if (oldBasic <= oldStart) {
    return { diff: 0, target: scale[0], idx: 0, fixed: scale[0], personal: 0, atStart: true };
  }
  const diff = oldBasic - oldStart;
  const target = scale[0] + diff;
  let idx = scale.findIndex(s => s >= target);
  let personal = 0;
  if (idx === -1) { idx = scale.length - 1; personal = target - scale[idx]; }
  return { diff, target, idx, fixed: scale[idx], personal, exact: scale[idx] === target, atStart: false };
}

/** ধাপ থেকে ইনক্রিমেন্ট (সর্বোচ্চ ধাপে আটকে যাবে) */
function stepUp(rankKey, idx, n = 1) {
  const scale = RANKS[rankKey].newScale;
  const ni = Math.min(idx + n, scale.length - 1);
  return { idx: ni, basic: scale[ni], capped: idx + n > scale.length - 1 };
}

/* ---------- পুরোনো (জুন ২০২৬) ভাতার আনুমানিক হিসাব ---------- */
function oldHouseRentAuto(oldBasic, loc) {
  const slab = HOUSE_RENT_OLD.find(s => oldBasic <= s.upto);
  const [rate, min] = slab[loc];
  return Math.max(Math.round(oldBasic * rate), min);
}
function dsaBand(years) {
  if (years < 5) return 0;
  if (years < 10) return 1;
  if (years < 15) return 2;
  if (years < 20) return 3;
  return 4;
}
const DSA_BAND_LABEL = ['০–৫ বছর','৫+ – ১০ বছর','১০+ – ১৫ বছর','১৫+ – ২০ বছর','২০ বছরের ঊর্ধ্বে'];
function dsaAmount(rankKey, years, which) {
  const d = DSA[rankKey];
  if (!d) return 0;
  const v = d[which];
  return Array.isArray(v) ? v[dsaBand(years)] : v;
}
function skillAmount(rankKey, skillKey, which) {
  if (!skillKey || skillKey === 'NONE') return 0;
  const s = SKILL[skillKey];
  return (isSgtUp(rankKey) ? s.SGTUP : s.CPLDOWN)[which];
}
function specialAmount(rankKey, key, which) {
  const sp = SPECIAL_PAY[key];
  if (!sp) return 0;
  if (sp.all) return sp.all[which];
  return sp[rankLevel(rankKey)][which];
}

/** জুন ২০২৬-এর প্রতিটি ভাতার স্বয়ংক্রিয় প্রস্তাবিত মান */
function autoOldAllowances(inp) {
  const r = inp.rank;
  const yrs = inp.joinDate ? diffYM(inp.joinDate, new Date(2026, 5, 30)).y : 0;
  const married = inp.marital === 'MARRIED';
  let hr = 0;
  if (!married) hr = Math.round(inp.oldBasic * 0.20);
  else if (!inp.quarter) hr = oldHouseRentAuto(inp.oldBasic, inp.location);
  else hr = isCplDown(r) || r === 'SGT' ? Math.round(inp.oldBasic * 0.20) : 0;
  const special = (inp.specials || []).reduce((s, k) => s + specialAmount(r, k, 'old'), 0);
  const hillOld = inp.hill === 'NONE' ? 0 : Math.min(Math.round(inp.oldBasic * ALLOW.hill.old.rate),
    inp.hill === 'SADAR' ? ALLOW.hill.old.capSadar : ALLOW.hill.old.capOther);
  return {
    houseRent: hr,
    dsa: dsaAmount(r, yrs, 'old'),
    medical: ALLOW.medical.old,
    tiffin: isCplDown(r) ? ALLOW.tiffin.old : 0,
    transport: isCplDown(r) ? ALLOW.transport.old : 0,
    education: Math.min(inp.children || 0, ALLOW.education.maxChildren) * ALLOW.education.perChild,
    skill: skillAmount(r, inp.skill, 'old'),
    appointment: APPOINTMENT[inp.appointment || 'NONE'].old,
    badge: Math.min(inp.badges || 0, ALLOW.badge.max) * ALLOW.badge.old,
    specialPay: special,
    kit: inp.kit ? ALLOW.kit[rankLevel(r) === 'JCO' ? 'JCO' : 'OR'].old : 0,
    serviceWardenship: inp.serviceWardenship || 0,
    hill: hillOld,
    // বিশেষ সুবিধা (প্রণোদনা): সর্বশেষ মূল বেতনের ২০%, ন্যূনতম ২,০০০ টাকা; ০১ জুলাই ২০২৬ থেকে বাদ। মহার্ঘ ভাতা আগেই বাতিল।
    pronodona: Math.max(Math.round(inp.oldBasic * 0.20), 2000),
  };
}

const OLD_ALLOW_LABELS = {
  houseRent: 'বাড়ি ভাড়া ভাতা',
  dsa: 'প্রতিরক্ষা সার্ভিস ভাতা',
  medical: 'চিকিৎসা ভাতা',
  tiffin: 'টিফিন ভাতা',
  transport: 'যাতায়াত ভাতা',
  education: 'শিক্ষা সহায়ক ভাতা',
  skill: 'দক্ষতা বেতন',
  appointment: 'নিযুক্তি বেতন',
  badge: 'সদাচরণ বেতন (ব্যাজ)',
  specialPay: 'বিশেষ দক্ষতা বেতন',
  kit: 'কিট রক্ষণাবেক্ষণ ভাতা',
  serviceWardenship: 'সার্ভিস ওয়ার্ডিনেস বেতন',
  hill: 'পাহাড়ি ভাতা',
  other: 'অন্যান্য ভাতা',
  pronodona: 'বিশেষ প্রণোদনা',
};

/* ---------- ০১ জানুয়ারি ২০২৮ থেকে নতুন ভাতা ---------- */
function newAllowances(inp, basic, personal) {
  const r = inp.rank;
  const on = new Date(2028, 0, 1);
  const yrs = inp.joinDate ? diffYM(inp.joinDate, on).y : 0;
  const age = inp.dob ? ageOn(inp.dob, on) : 40;
  const married = inp.marital === 'MARRIED';
  const sw = Math.round((inp.serviceWardenship || 0) * (1 + ALLOW.serviceWardenshipIncrease));
  const hrBase = basic + sw + (personal || 0);
  let hrRate = 0, hrNote = '';
  if (!married) { hrRate = HOUSE_RENT_NEW.UNMARRIED; hrNote = 'অবিবাহিত — ২০%'; }
  else if (!inp.quarter) { hrRate = HOUSE_RENT_NEW[RANKS[r].hrClass][inp.location]; hrNote = `${LOCATIONS[inp.location]} — ${bn(hrRate * 100)}%`; }
  else if (!isSgtUp(r) || r === 'SGT') { hrRate = HOUSE_RENT_NEW.QUARTER_OR; hrNote = 'সরকারি বাসা বরাদ্দ — ২০%'; }
  else { hrRate = 0; hrNote = 'সরকারি বাসা বরাদ্দ — প্রযোজ্য নয়'; }

  const items = [];
  const add = (key, label, amt, note = '') => { if (amt) items.push({ key, label, amt: Math.round(amt * 100) / 100, note }); };

  add('houseRent', 'বাড়ি ভাড়া ভাতা', Math.round(hrBase * hrRate), hrNote);
  add('dsa', 'প্রতিরক্ষা সার্ভিস ভাতা', dsaAmount(r, yrs, 'new'),
      Array.isArray(DSA[r].new) ? `চাকরির বয়স ${DSA_BAND_LABEL[dsaBand(yrs)]}` : 'নির্ধারিত');
  add('medical', 'চিকিৎসা ভাতা', age > 50 ? ALLOW.medical.newAbove50 : ALLOW.medical.newUpto50, age > 50 ? '৫০ বছরের ঊর্ধ্বে' : '৫০ বছর পর্যন্ত');
  if (isCplDown(r)) add('tiffin', 'টিফিন ভাতা', ALLOW.tiffin.new, 'কর্পোরাল ও তদনিম্ন');
  if (isCplDown(r) && inp.location !== 'OTHER') add('transport', 'যাতায়াত ভাতা', ALLOW.transport.new, 'সিটি কর্পোরেশন এলাকায় কর্মস্থল');
  add('education', 'শিক্ষা সহায়ক ভাতা', Math.min(inp.children || 0, 2) * ALLOW.education.perChild, `${bn(Math.min(inp.children || 0, 2))} সন্তান × ৳৫০০`);
  add('mobile', 'মোবাইল ভাতা', ALLOW.mobile.new);
  add('skill', 'দক্ষতা বেতন', skillAmount(r, inp.skill, 'new'),
      inp.skill && inp.skill !== 'NONE' ? (isSgtUp(r) ? SKILL[inp.skill].SGTUP.grade : SKILL[inp.skill].CPLDOWN.grade) : '');
  add('appointment', 'নিযুক্তি বেতন', APPOINTMENT[inp.appointment || 'NONE'].new, APPOINTMENT[inp.appointment || 'NONE'].label);
  add('badge', 'সদাচরণ বেতন (ব্যাজ)', Math.min(inp.badges || 0, 3) * ALLOW.badge.new, `${bn(Math.min(inp.badges || 0, 3))} টি ব্যাজ × ৳৩৫`);
  (inp.specials || []).forEach(k => add('sp_' + k, SPECIAL_PAY[k].label, specialAmount(r, k, 'new')));
  if (inp.kit) add('kit', 'কিট রক্ষণাবেক্ষণ ভাতা', ALLOW.kit[rankLevel(r) === 'JCO' ? 'JCO' : 'OR'].new);
  add('serviceWardenship', 'সার্ভিস ওয়ার্ডিনেস বেতন', sw, 'জুন ২০২৬-এর পরিমাণ + ১০%');
  if (inp.hill !== 'NONE') add('hill', 'পাহাড়ি ভাতা', Math.min(Math.round(basic * 0.20), inp.hill === 'SADAR' ? 5000 : 5500),
      inp.hill === 'SADAR' ? 'মূল বেতনের ২০%, সর্বোচ্চ ৳৫,০০০' : 'মূল বেতনের ২০%, সর্বোচ্চ ৳৫,৫০০');
  if (inp.haor) add('haor', 'হাওড়/দ্বীপ/চর ভাতা', Math.min(Math.round(basic * 0.20), 5000), 'মূল বেতনের ২০%, সর্বোচ্চ ৳৫,০০০');
  if (inp.radiation) add('radiation', 'তেজস্ক্রিয় ঝুঁকি ভাতা', ALLOW.radiation[rankLevel(r) === 'JCO' ? 'JCO' : 'OR']);
  add('disabledChild', 'প্রতিবন্ধী সন্তান ভাতা', Math.min(inp.disabledChildren || 0, 2) * 3000, `${bn(Math.min(inp.disabledChildren || 0, 2))} সন্তান × ৳৩,০০০`);
  add('other', 'অন্যান্য ভাতা (নিজে দেওয়া)', inp.otherNew || 0);
  return { items, total: items.reduce((s, i) => s + i.amt, 0), sw };
}

/* ---------- প্রধান হিসাব: জুলাই ২০২৬ – জানুয়ারি ২০২৮ ---------- */
function computeTimeline(inp) {
  const R = RANKS[inp.rank];
  const fx = fixPay(inp.rank, inp.oldBasic, inp.oldStart);
  const inc26 = stepUp(inp.rank, fx.idx, 1);   // ০১ জুলাই ২০২৬ ইনক্রিমেন্ট
  const inc27 = stepUp(inp.rank, fx.idx, 2);   // ০১ জুলাই ২০২৭ ইনক্রিমেন্ট
  const tr = TRANSITION[R.group];
  const newBasic26 = inc26.basic + fx.personal;
  const raise = newBasic26 - inp.oldBasic;

  // জুন ২০২৬ ভাতা (ব্যবহারকারীর দেওয়া মান, না দিলে স্বয়ংক্রিয়)
  const auto = autoOldAllowances(inp);
  const ov = inp.oldOverrides || {};
  const pick = k => (ov[k] !== undefined && ov[k] !== null && !isNaN(ov[k])) ? ov[k] : auto[k];
  const oldKeys = ['houseRent','dsa','medical','tiffin','transport','education','skill','appointment','badge','specialPay','kit','serviceWardenship','hill'];
  const oldItems = oldKeys.map(k => ({ key: k, label: OLD_ALLOW_LABELS[k], amt: pick(k) })).filter(i => i.amt);
  if (inp.oldOther) oldItems.push({ key: 'other', label: OLD_ALLOW_LABELS.other, amt: inp.oldOther });
  const oldAllowTotal = oldItems.reduce((s, i) => s + i.amt, 0);
  const prono = pick('pronodona');
  const specialBenefit = prono || 0;

  const gpfRate = Math.max(5, Math.min(25, inp.gpfPercent || 5)) / 100;
  const otherDed = inp.otherDeductions || 0;
  const deductions = basic => {
    const gpf = Math.round(basic * gpfRate);
    return { gpf, other: otherDed, total: gpf + otherDed };
  };

  const june = {
    basic: inp.oldBasic,
    allowances: oldItems,
    allowTotal: oldAllowTotal,
    special: [{ label: OLD_ALLOW_LABELS.pronodona, amt: prono,
      note: prono > 2000 ? `আগের মূল বেতন ${bn(inp.oldBasic)} টাকার ২০%` : `আগের মূল বেতন ${bn(inp.oldBasic)} টাকার ২০% ২,০০০-এর কম, তাই ন্যূনতম ২,০০০` }].filter(x => x.amt),
    specialTotal: specialBenefit,
  };
  june.gross = june.basic + june.allowTotal + june.specialTotal;
  june.ded = deductions(june.basic);
  june.net = june.gross - june.ded.total;

  const mk = (key, basic, allowances, allowTotal, extra = {}) => {
    const gross = basic + allowTotal;
    const ded = deductions(basic);
    return { key, basic, allowances, allowTotal, gross, ded, net: gross - ded.total, ...extra };
  };

  const b1 = Math.round(inp.oldBasic + raise * tr.p1);
  const b2 = Math.round(inp.oldBasic + raise * tr.p2);
  const b3 = inc27.basic + fx.personal;

  const p1 = mk('JUL26', b1, oldItems, oldAllowTotal, { pct: tr.p1, paperBasic: newBasic26 });
  const p2 = mk('JAN27', b2, oldItems, oldAllowTotal, { pct: tr.p2, paperBasic: newBasic26 });
  const p3 = mk('JUL27', b3, oldItems, oldAllowTotal, { pct: 1, paperBasic: b3 });
  const na = newAllowances(inp, b3, fx.personal);
  const p4 = mk('JAN28', b3, na.items, na.total, { pct: 1, paperBasic: b3, swNew: na.sw });

  p1.prev = june; p2.prev = p1; p3.prev = p2; p4.prev = p3;
  [p1, p2, p3, p4].forEach(p => {
    p.basicRise = p.basic - p.prev.basic;
    p.grossRise = p.gross - p.prev.gross;
    p.netRise = p.net - p.prev.net;
  });

  // বকেয়া (জুলাই ২০২৬ থেকে প্রথম বেতন প্রাপ্তির পূর্ব মাস পর্যন্ত) — তথ্যের জন্য মাসিক পার্থক্য
  return {
    input: inp, rank: R, fix: fx, inc26, inc27, tr, raise, newBasic26,
    june, periods: [p1, p2, p3, p4],
    yearlyExtras: {
      festival: b3 * 2,
      noboborsho: Math.round(b3 * 0.15),
    },
  };
}

/* ---------- অবসর ও পেনশন ---------- */
function computeRetirement(inp, tl) {
  const out = { ok: false, events: [], errors: [] };
  const retire = inp.retireDate;
  if (!retire) { out.errors.push('অবসরের সম্ভাব্য তারিখ দিন।'); return out; }
  if (!inp.joinDate) { out.errors.push('চাকরিতে যোগদানের তারিখ দিন।'); return out; }
  if (!inp.dob) { out.errors.push('জন্মতারিখ দিন।'); return out; }
  if (retire <= new Date(2026, 6, 1)) { out.errors.push('অবসরের তারিখ ০১ জুলাই ২০২৬-এর পরে হতে হবে।'); return out; }

  // শুরু: ০১ জুলাই ২০২৬ — নির্ধারণ + ইনক্রিমেন্ট
  let state = { rank: inp.rank, idx: tl.inc26.idx, basic: tl.inc26.basic + tl.fix.personal, honorary: null, personal: tl.fix.personal };
  out.events.push({ date: new Date(2026, 6, 1), type: 'fix', text: `নতুন স্কেলে নির্ধারণ (${bn(tl.fix.fixed)}) ও বার্ষিক ইনক্রিমেন্ট`, rank: RANKS[state.rank].name, basic: state.basic });

  const promos = (inp.promotions || []).filter(p => p.rank && p.date && p.date < retire).sort((a, b) => a.date - b.date);
  const events = [];
  for (let y = 2027; y <= retire.getFullYear(); y++) {
    const d = new Date(y, 6, 1);
    if (d < retire) events.push({ date: d, kind: 'inc' });
  }
  promos.forEach(p => events.push({ date: p.date, kind: 'promo', rank: p.rank }));
  events.sort((a, b) => a.date - b.date || (a.kind === 'inc' ? -1 : 1));

  for (const ev of events) {
    if (ev.kind === 'inc') {
      if (state.honorary) {
        out.events.push({ date: ev.date, type: 'inc', text: 'অনারারি পদে নির্ধারিত বেতন — ইনক্রিমেন্ট প্রযোজ্য নয়', rank: HONORARY[state.honorary].name, basic: state.basic });
        continue;
      }
      const scale = RANKS[state.rank].newScale;
      if (state.idx >= scale.length - 1) {
        out.events.push({ date: ev.date, type: 'cap', text: 'স্কেলের সর্বোচ্চ ধাপে — ইনক্রিমেন্ট নেই', rank: RANKS[state.rank].name, basic: state.basic });
      } else {
        state.idx += 1; state.basic = scale[state.idx] + state.personal;
        out.events.push({ date: ev.date, type: 'inc', text: 'বার্ষিক ইনক্রিমেন্ট', rank: RANKS[state.rank].name, basic: state.basic });
      }
    } else {
      const cur = state.basic;
      if (HONORARY[ev.rank]) {
        const h = HONORARY[ev.rank];
        state.basic = cur > h.fixed ? cur + 500 : h.fixed;
        state.honorary = ev.rank; state.personal = 0;
        out.events.push({ date: ev.date, type: 'promo', text: `পদোন্নতি: ${h.name} (${cur > h.fixed ? 'সর্বশেষ মূল বেতন + ৳৫০০' : 'নির্ধারিত বেতন'})`, rank: h.name, basic: state.basic });
      } else {
        const scale = RANKS[ev.rank].newScale;
        let idx = scale.findIndex(s => s > cur);
        let personal = 0;
        if (idx === -1) { idx = scale.length - 1; personal = cur - scale[idx]; }
        state = { rank: ev.rank, idx, basic: scale[idx] + personal, honorary: null, personal };
        out.events.push({ date: ev.date, type: 'promo', text: `পদোন্নতি: ${RANKS[ev.rank].name} — পরবর্তী উচ্চতর ধাপে নির্ধারণ`, rank: RANKS[ev.rank].name, basic: state.basic });
      }
    }
  }

  const lastBasic = state.basic;
  const swPension = retire >= new Date(2028, 0, 1)
    ? Math.round((inp.serviceWardenship || 0) * 1.1) : (inp.serviceWardenship || 0);
  const pensionable = lastBasic + swPension;
  const L = pensionable + PENSION.addConst;
  const svc = diffYM(inp.joinDate, retire);
  const years = svc.y;
  const formula = L * years / PENSION.divisor;
  const cap = L * PENSION.maxRatio;
  const gross = years >= PENSION.minYears ? Math.min(formula, cap) : 0;
  const capped = formula > cap;
  const cPct = Math.max(0, Math.min(100, inp.commutePct ?? 50)) / 100;
  const ageNext = ageOn(inp.dob, retire) + 1;
  const fKey = Math.max(20, Math.min(80, ageNext));
  const factor = COMMUTATION[fKey];
  const commuted = gross * cPct;
  const lump = commuted * 12 * factor;
  const net = gross - commuted;
  const ageAtRetire = ageOn(inp.dob, retire);
  const med = PENSION.medical.find(m => ageAtRetire <= m.upto).amt;
  const ration = (inp.rationAdults || 0) * PENSION.rationAdult + (inp.rationChildren || 0) * PENSION.rationChild;
  const leaveEncash = lastBasic * PENSION.leaveEncashMonths;
  const lprStart = new Date(retire); lprStart.setFullYear(lprStart.getFullYear() - 1);

  const growth = [];
  let np = net;
  for (let i = 0; i <= 5; i++) { growth.push({ year: retire.getFullYear() + i, net: Math.round(np) }); np *= 1 + PENSION.annualIncrease; }

  Object.assign(out, {
    ok: true,
    finalRank: state.honorary ? HONORARY[state.honorary].name : RANKS[state.rank].name,
    retire, lprStart, lastBasic, swPension, pensionable, L, years, months: svc.m,
    formula, cap, capped, gross, cPct, ageNext, factor, factorKey: fKey, commuted, lump, net,
    ageAtRetire, med, ration, leaveEncash, growth,
    monthlyInHand: net + med + ration,
    festivalYearly: net * PENSION.festivalsPerYear,
    noboborsho: net * PENSION.noboborsho,
    eligible: years >= PENSION.minYears,
  });
  return out;
}
