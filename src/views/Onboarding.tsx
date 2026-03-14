import { useState } from 'react';
import { Shield, Globe, MapPin, Bell, Rocket } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import CityFilter from '../components/CityFilter';
import { t, isRtl, type Language } from '../i18n';

const langMap: Record<string, Language> = {
  Hebrew: 'he', English: 'en', Russian: 'ru',
};

type Step = 'welcome' | 'language' | 'cities' | 'notifications' | 'done';

const STEPS: Step[] = ['welcome', 'language', 'cities', 'notifications', 'done'];

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
    try {
      await save({
        language: selectedLang,
        selectedCities,
        soundRepeat: soundEnabled ? 'Twice' : 'Off',
        overlayEnabled,
        firstRunComplete: true,
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
      // Force the state update even if backend save fails
      useSettingsStore.setState({
        settings: {
          ...settings,
          language: selectedLang,
          selectedCities,
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
          <div className="text-center max-w-sm space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-950 border-2 border-green-400 flex items-center justify-center">
              <Shield size={36} className="text-green-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black">ברוכים הבאים למגן</h1>
              <h2 className="text-lg text-[var(--text-secondary)]">Welcome to Magen</h2>
              <h2 className="text-lg text-[var(--text-secondary)]">Добро пожаловать в Маген</h2>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed" dir="rtl">
                התרעות שולחן עבודה של פיקוד העורף
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Desktop alerts for Pikud HaOref civil defense warnings
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Оповещения гражданской обороны Пикуд а-Орэф
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)] italic">
              Unofficial tool · כלי לא רשמי · Неофициальный инструмент
            </p>
            <button
              onClick={next}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
            >
              Continue · המשך · Далее
            </button>
          </div>
        )}

        {step === 'language' && (
          <div className="text-center max-w-sm space-y-6 w-full">
            <Globe size={32} className="text-green-400 mx-auto" />
            <h2 className="text-xl font-bold">{t('onboarding.selectLanguage', lang)}</h2>
            <div className="space-y-3">
              {([
                { value: 'Hebrew' as const, label: 'עברית', sub: 'Hebrew' },
                { value: 'English' as const, label: 'English', sub: 'English' },
                { value: 'Russian' as const, label: 'Русский', sub: 'Russian' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedLang(opt.value)}
                  className={`w-full py-4 px-4 rounded-lg border-2 text-left transition-all ${
                    selectedLang === opt.value
                      ? 'border-green-400 bg-green-950/40'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <div className="text-lg font-bold">{opt.label}</div>
                  {opt.value !== 'English' && (
                    <div className="text-xs text-[var(--text-muted)]">{opt.sub}</div>
                  )}
                </button>
              ))}
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
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
              >
                {lang === 'he' ? 'המשך' : lang === 'ru' ? 'Далее' : 'Continue'}
              </button>
            </div>
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
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
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
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
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
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-lg transition-colors text-lg"
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
