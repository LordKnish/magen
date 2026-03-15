import { useState } from 'react';
import { Shield, MapPin, Bell, Rocket } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import CityFilter from '../components/CityFilter';
import { t, isRtl, type Language } from '../i18n';

const langMap: Record<string, Language> = {
  Hebrew: 'he', English: 'en', Russian: 'ru',
};

type Step = 'welcome' | 'cities' | 'notifications' | 'done';

const STEPS: Step[] = ['welcome', 'cities', 'notifications', 'done'];

export default function Onboarding() {
  const { settings, save } = useSettingsStore();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedLang, setSelectedLang] = useState(settings.language);
  const [selectedCities, setSelectedCities] = useState<string[]>(settings.selectedCities);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundRepeat !== 'Off');
  const [overlayEnabled, setOverlayEnabled] = useState(settings.overlayEnabled);

  const lang = langMap[selectedLang] ?? 'he';
  const stepIndex = STEPS.indexOf(step);

  const next = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    }
  };

  const prev = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    }
  };

  const finish = async () => {
    const profiles = selectedCities.length > 0 ? [{
      id: 'home',
      name: lang === 'he' ? 'בית' : lang === 'ru' ? 'Дом' : 'Home',
      color: '#1D55D0',
      cities: selectedCities,
      alertTypes: [] as string[],
      notify: true,
      sound: soundEnabled,
      overlay: overlayEnabled,
      priority: 1,
    }] : [];

    try {
      await save({
        language: selectedLang,
        selectedCities,
        profiles,
        soundRepeat: soundEnabled ? 'Twice' : 'Off',
        overlayEnabled,
        firstRunComplete: true,
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
      useSettingsStore.setState({
        settings: {
          ...settings,
          language: selectedLang,
          selectedCities,
          profiles,
          soundRepeat: soundEnabled ? 'Twice' : 'Off',
          overlayEnabled,
          firstRunComplete: true,
        },
      });
    }
  };

  return (
    <div
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
      className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]"
    >
      {/* Progress bar */}
      <div className="h-1 bg-[var(--bg-secondary)]">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        {step === 'welcome' && (
          <div className="text-center max-w-sm w-full" dir="ltr">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-green-950/60 border border-green-500/30 flex items-center justify-center mb-6">
              <Shield size={40} className="text-green-400" />
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] mb-2">MAGEN</h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
              Real-time civil defense alerts from Pikud HaOref
            </p>

            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Select Language</div>
            <div className="space-y-2 mb-6">
              {([
                { value: 'Hebrew' as const, label: 'עברית', sub: 'Hebrew' },
                { value: 'English' as const, label: 'English', sub: '' },
                { value: 'Russian' as const, label: 'Русский', sub: 'Russian' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedLang(opt.value)}
                  className={`w-full py-3 px-4 rounded-lg border transition-all flex items-center justify-between ${
                    selectedLang === opt.value
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <span className={`text-base font-semibold ${selectedLang === opt.value ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                    {opt.label}
                  </span>
                  {opt.sub && <span className="text-xs text-[var(--text-muted)]">{opt.sub}</span>}
                  {selectedLang === opt.value && (
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={next}
              className="w-full py-3 bg-[#1D55D0] hover:bg-[#4B7BE5] text-white font-bold rounded-lg transition-colors mb-4"
            >
              {lang === 'he' ? 'המשך' : lang === 'ru' ? 'Далее' : 'Continue'}
            </button>

            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              {lang === 'he' ? 'כלי לא רשמי — עקבו אחר הנחיות פיקוד העורף' : lang === 'ru' ? 'Неофициальный — следуйте указаниям Пикуд а-Орэф' : 'Unofficial tool — always follow official Pikud HaOref guidance'}
            </p>
          </div>
        )}

        {step === 'cities' && (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center">
              <MapPin size={32} className="text-green-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold">{t('onboarding.selectCities', lang)}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {selectedCities.length} {t('status.cities', lang)}
              </p>
            </div>
            <CityFilter
              selectedCities={selectedCities}
              onChange={setSelectedCities}
              lang={lang}
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={prev}
                className="flex-1 py-3 bg-[var(--bg-secondary)] hover:bg-white/10 text-[var(--text-secondary)] font-bold rounded-lg transition-colors border border-[var(--border)]"
              >
                {lang === 'he' ? 'חזרה' : lang === 'ru' ? 'Назад' : 'Back'}
              </button>
              <button
                onClick={next}
                className="flex-1 py-3 bg-[#1D55D0] hover:bg-[#4B7BE5] text-white font-bold rounded-lg transition-colors"
              >
                {lang === 'he' ? 'המשך' : lang === 'ru' ? 'Далее' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'notifications' && (
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <Bell size={32} className="text-green-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold">{t('onboarding.enableNotifications', lang)}</h2>
            </div>

            <div className="space-y-4">
              {/* Sound toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div>
                  <div className="text-sm font-semibold">{t('settings.sound', lang)}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {lang === 'he' ? 'השמע צלילי התרעה' : lang === 'ru' ? 'Воспроизводить звуки тревоги' : 'Play alert sounds'}
                  </div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    soundEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Overlay toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div>
                  <div className="text-sm font-semibold">{t('settings.overlay', lang)}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {lang === 'he' ? 'חלון התרעה על המסך' : lang === 'ru' ? 'Всплывающее окно на экране' : 'On-screen alert popup'}
                  </div>
                </div>
                <button
                  onClick={() => setOverlayEnabled(!overlayEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    overlayEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${overlayEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={prev}
                className="flex-1 py-3 bg-[var(--bg-secondary)] hover:bg-white/10 text-[var(--text-secondary)] font-bold rounded-lg transition-colors border border-[var(--border)]"
              >
                {lang === 'he' ? 'חזרה' : lang === 'ru' ? 'Назад' : 'Back'}
              </button>
              <button
                onClick={next}
                className="flex-1 py-3 bg-[#1D55D0] hover:bg-[#4B7BE5] text-white font-bold rounded-lg transition-colors"
              >
                {lang === 'he' ? 'המשך' : lang === 'ru' ? 'Далее' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center max-w-sm space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-950 border-2 border-green-400 flex items-center justify-center">
              <Rocket size={36} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-green-400">{t('onboarding.done', lang)}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {selectedCities.length > 0
                ? (lang === 'he'
                    ? `ניטור ${selectedCities.length} ערים`
                    : lang === 'ru'
                      ? `Мониторинг ${selectedCities.length} городов`
                      : `Monitoring ${selectedCities.length} cities`)
                : (lang === 'he'
                    ? 'לא נבחרו ערים - התרעות כלליות בלבד'
                    : lang === 'ru'
                      ? 'Города не выбраны - только общие оповещения'
                      : 'No cities selected - general alerts only')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={prev}
                className="flex-1 py-3 bg-[var(--bg-secondary)] hover:bg-white/10 text-[var(--text-secondary)] font-bold rounded-lg transition-colors border border-[var(--border)]"
              >
                {lang === 'he' ? 'חזרה' : lang === 'ru' ? 'Назад' : 'Back'}
              </button>
              <button
                onClick={finish}
                className="flex-1 py-3 bg-[#1D55D0] hover:bg-[#4B7BE5] text-white font-black rounded-lg transition-colors text-lg"
              >
                {t('onboarding.done', lang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
