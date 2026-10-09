const KB = 1024;
const MB = KB * 1024;

/** Human-readable size for the table; an unknown size shows as nothing. */
const formatBytes = (n: number): string => {
  if (!n) return '';
  if (n < KB) return `${n} B`;
  if (n < MB) return `${(n / KB).toFixed(0)} KB`;
  return `${(n / MB).toFixed(1)} MB`;
};

export default formatBytes;
