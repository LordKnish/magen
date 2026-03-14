import { useState, useEffect } from 'react';
import { t, type Language } from '../i18n';

export default function CountdownTimer({ seconds, lang }: { seconds: number; lang: Language }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  return (
    <div className="text-center">
      <div className="text-[9px] text-red-400 uppercase tracking-widest">{t('alert.shelter', lang)}</div>
      <div className="text-3xl font-black text-white leading-none">
        {remaining}<span className="text-sm text-red-400">s</span>
      </div>
    </div>
  );
}
