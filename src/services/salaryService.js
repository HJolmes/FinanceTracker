// Sozialversicherungssätze 2024/2025 (Näherungswerte – kein steuerrechtlicher Rat)
const BBG_RV = 8050;     // Monatliche BBG Rentenversicherung/Arbeitslosenversicherung West
const BBG_KV = 5512.50;  // Monatliche BBG Krankenversicherung/Pflegeversicherung

const RV_SATZ = 0.093;
const KV_SATZ = 0.0815;  // 7,30 % Basis + 0,85 % halber Zusatzbeitrag (Bundesdurchschnitt)
const AV_SATZ = 0.013;
const PV_SATZ = 0.018;
const PV_SATZ_KINDERLOS = 0.024; // kinderlos ab 23 Jahren

// Einkommensteuer Grundtarif 2025 (§ 32a EStG, Jahresbetrag)
function grundtarif(x) {
  x = Math.floor(x);
  if (x <= 12096) return 0;
  if (x <= 17005) {
    const y = (x - 12096) / 10000;
    return (922.98 * y + 1400) * y;
  }
  if (x <= 66760) {
    const z = (x - 17005) / 10000;
    return (181.19 * z + 2397) * z + 1025.38;
  }
  if (x <= 277825) return 0.42 * x - 9972.98;
  return 0.45 * x - 18307.73;
}

export function calculateNet({ brutto, steuerklasse, kirchensteuer, bav, sachbezug, kinderlos }) {
  const b = parseFloat(brutto) || 0;
  const sk = parseInt(steuerklasse) || 1;
  const bavM = parseFloat(bav) || 0;
  const sachM = parseFloat(sachbezug) || 0;
  const kindlos = Boolean(kinderlos);
  const kist = Boolean(kirchensteuer);

  if (b <= 0) return null;

  // bAV: SV-frei bis 4 % BBG-RV-West/Jahr / 12
  const bavSVFrei = Math.min(bavM, BBG_RV * 12 * 0.04 / 12);
  // bAV: steuerfrei bis 8 % BBG-RV-West/Jahr / 12
  const bavSteuerFrei = Math.min(bavM * 12, BBG_RV * 12 * 0.08) / 12;

  // Sozialversicherung
  const svBasis = Math.max(0, b - bavSVFrei);
  const rv = Math.min(svBasis, BBG_RV) * RV_SATZ;
  const av = Math.min(svBasis, BBG_RV) * AV_SATZ;
  const kv = Math.min(svBasis, BBG_KV) * KV_SATZ;
  const pv = Math.min(svBasis, BBG_KV) * (kindlos ? PV_SATZ_KINDERLOS : PV_SATZ);
  const sv = rv + av + kv + pv;

  // Zu versteuerndes Jahreseinkommen (Sachbezug erhöht, bAV und Werbungskosten-Pauschale mindern)
  const zveJahr = Math.max(0, (b + sachM) * 12 - bavSteuerFrei * 12 - 1230);

  // Lohnsteuer nach Steuerklasse
  let lstJahr;
  if (sk === 3) {
    lstJahr = grundtarif(zveJahr / 2) * 2;
  } else if (sk === 2) {
    lstJahr = grundtarif(Math.max(0, zveJahr - 4260));
  } else if (sk === 5) {
    lstJahr = grundtarif(zveJahr + 12096); // Näherung: kein Grundfreibetrag
  } else if (sk === 6) {
    lstJahr = grundtarif(zveJahr + 12096) * 1.1;
  } else {
    lstJahr = grundtarif(zveJahr);
  }
  lstJahr = Math.max(0, lstJahr);

  // Solidaritätszuschlag (ab 18.130 € LSt/Jahr, Milderungszone)
  let soliJahr = 0;
  if (lstJahr > 18130) {
    soliJahr = Math.min(lstJahr * 0.055, (lstJahr - 18130) * 0.2);
  }

  const kirchJahr = kist ? lstJahr * 0.09 : 0;
  const steuern = (lstJahr + soliJahr + kirchJahr) / 12;
  const netto = Math.max(0, b - sv - steuern);

  return {
    netto: Math.round(netto * 100) / 100,
    aufschluesselung: {
      rv: Math.round(rv * 100) / 100,
      kv: Math.round(kv * 100) / 100,
      av: Math.round(av * 100) / 100,
      pv: Math.round(pv * 100) / 100,
      lohnsteuer: Math.round(lstJahr / 12 * 100) / 100,
      soli: Math.round(soliJahr / 12 * 100) / 100,
      kirchensteuer: Math.round(kirchJahr / 12 * 100) / 100,
    },
  };
}
