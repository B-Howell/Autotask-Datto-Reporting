import dayjs from 'dayjs';

export const formatReboot = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('YYYY.MM.DD') : '—';
};
