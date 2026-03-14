import { t, type Language } from '../i18n';

const STATUS_STYLES: Record<string, { color: string; dot: string }> = {
  Connected: { color: 'text-green-400', dot: 'bg-green-400' },
  ConnectionIssue: { color: 'text-yellow-400', dot: 'bg-yellow-400' },
  Disconnected: { color: 'text-gray-500', dot: 'bg-gray-500' },
  GeoBlocked: { color: 'text-yellow-400', dot: 'bg-yellow-400' },
};

export default function StatusBadge({ status, lang }: { status: string; lang: Language }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Disconnected;
  const labelKey = `status.${status.charAt(0).toLowerCase() + status.slice(1)}`;

  return (
    <span className={`flex items-center gap-1.5 ${style.color}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {t(labelKey, lang)}
    </span>
  );
}
