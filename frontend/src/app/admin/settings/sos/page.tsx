'use client';

import { useEffect, useState } from 'react';
import { Bell, Save, Volume2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { DEFAULT_SOS_SETTINGS, SosSettings, SosSoundKey } from '@/lib/sosSettings';
import { playSosSound, setSosSoundSource, stopSosSound, unlockSosSound } from '@/lib/sosSound';

export default function AdminSosSettingsPage() {
  const [settings, setSettings] = useState<SosSettings>(DEFAULT_SOS_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<{ settings: SosSettings }>('/sos-settings')
      .then((data) => {
        setSettings(data.settings);
        setSosSoundSource(data.settings.sound.url);
      })
      .catch(() => setMessage('Unable to load SOS settings.'));
  }, []);

  const selectedSound = settings.soundLibrary.find((sound) => sound.key === settings.soundKey) || settings.sound;

  const update = (next: Partial<SosSettings>) => {
    setSettings((current) => ({
      ...current,
      ...next,
      sound: next.soundKey
        ? current.soundLibrary.find((sound) => sound.key === next.soundKey) || current.sound
        : current.sound,
    }));
  };

  const testSound = async () => {
    setSosSoundSource(selectedSound.url);
    const unlocked = await unlockSosSound();
    if (!unlocked) {
      setMessage('Sound test was blocked. Click again after interacting with the page and check device volume.');
      return;
    }
    await playSosSound({ loop: false });
    setMessage(`Testing ${selectedSound.label}.`);
    window.setTimeout(stopSosSound, 3000);
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await api<{ settings: SosSettings }>('/sos-settings', {
        method: 'PATCH',
        body: {
          soundKey: settings.soundKey,
          continuousAlarmEnabled: settings.continuousAlarmEnabled,
          browserNotificationsEnabled: settings.browserNotificationsEnabled,
          escalation: settings.escalation,
        },
      });
      setSettings(res.settings);
      setSosSoundSource(res.settings.sound.url);
      setMessage('SOS settings saved.');
    } catch {
      setMessage('Unable to save SOS settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SOS Settings</h1>
            <p className="mt-1 text-slate-600">Configure admin emergency alert behavior for Hideaway Holler.</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">SOS Settings Card</h2>
                  <p className="text-sm text-slate-500">Predefined sounds only. Custom uploads are disabled.</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Alert Sound</span>
                  <select
                    value={settings.soundKey}
                    onChange={(event) => update({ soundKey: event.target.value as SosSoundKey })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {settings.soundLibrary.map((sound) => (
                      <option key={sound.key} value={sound.key}>
                        {sound.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={testSound}>
                    <Volume2 className="h-4 w-4" />
                    Test Sound
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={settings.continuousAlarmEnabled}
                    onChange={(event) => update({ continuousAlarmEnabled: event.target.checked })}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">Continuous Alarm</span>
                    <span className="text-sm text-slate-600">Loop the selected alarm until the SOS is acknowledged.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={settings.browserNotificationsEnabled}
                    onChange={(event) => update({ browserNotificationsEnabled: event.target.checked })}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">Browser Notifications</span>
                    <span className="text-sm text-slate-600">Send web push notifications to active admin devices.</span>
                  </span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">SMS fallback after seconds</span>
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={settings.escalation.smsFallbackAfterSeconds}
                    onChange={(event) => update({ escalation: { ...settings.escalation, smsFallbackAfterSeconds: Number(event.target.value) } })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Backup admin after seconds</span>
                  <input
                    type="number"
                    min={0}
                    max={7200}
                    value={settings.escalation.backupAdminAfterSeconds}
                    onChange={(event) => update({ escalation: { ...settings.escalation, backupAdminAfterSeconds: Number(event.target.value) } })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={save} loading={saving}>
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
                {message && <p className="text-sm font-medium text-slate-600">{message}</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
