// Shown in the footer of every PDF page. Change these three lines to your own details.
export const REPORT_BRAND = {
  maker: "Auto DISM",
  platformLine: "A sub-product of the Auto DISM Platform",
  chip: "AUTO DISM · BETA", // small chip next to the logo (site header and PDF)
  linkedinLabel: "linkedin.com/in/your-id", // text printed next to the LinkedIn icon
  linkedinUrl: "https://www.linkedin.com/in/your-id", // where the icon and text link to
};

/** A file name made from the title the user typed: keeps letters, digits, spaces and - _ ( ) ; drops what Windows forbids. */
export function pdfFileName(title: string, fallback = "Auto ML report"): string {
  const s = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().slice(0, 90);
  return `${s || fallback}.pdf`;
}
