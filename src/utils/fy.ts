export interface FyRange {
  from: string;
  to: string;
  startYear: number;
  endYear: number;
  label: string;
}

export function fyRange(labelOrYear?: string | number, startMonth = 4): FyRange {
  const sm = startMonth >= 1 && startMonth <= 12 ? startMonth : 4;
  let startYear: number;
  if (labelOrYear && /^\d{4}/.test(String(labelOrYear))) {
    startYear = parseInt(String(labelOrYear).slice(0, 4), 10);
  } else {
    const now = new Date();
    startYear = now.getMonth() + 1 >= sm ? now.getFullYear() : now.getFullYear() - 1;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = `${startYear}-${pad(sm)}-01`;
  const endYear = sm === 1 ? startYear : startYear + 1;
  const endMonth = sm === 1 ? 12 : sm - 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  const to = `${endYear}-${pad(endMonth)}-${pad(lastDay)}`;
  return {
    from,
    to,
    startYear,
    endYear,
    label: `${startYear}-${endYear}`,
  };
}

export function currentFy(startMonth = 4): FyRange {
  const sm = startMonth >= 1 && startMonth <= 12 ? startMonth : 4;
  const now = new Date();
  const startYear = now.getMonth() + 1 >= sm ? now.getFullYear() : now.getFullYear() - 1;
  return fyRange(startYear, sm);
}
