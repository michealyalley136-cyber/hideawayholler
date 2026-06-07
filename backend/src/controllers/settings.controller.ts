import { Response } from 'express';
import { SosSoundKey } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getSosSettings, normalizeSosSettings, publicSosSettings, saveSosSettings, SOS_SOUND_LIBRARY } from '../services/sosSettings.service';
import { logAuditEvent } from '../services/audit.service';

function validSoundKey(value: unknown): value is SosSoundKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SOS_SOUND_LIBRARY, value);
}

export async function getSosSettingsController(_req: AuthRequest, res: Response) {
  const settings = await getSosSettings();
  res.json({ settings: publicSosSettings(settings) });
}

export async function updateSosSettingsController(req: AuthRequest, res: Response) {
  const body = req.body as Record<string, unknown>;
  if (body.soundKey !== undefined && !validSoundKey(body.soundKey)) {
    return res.status(400).json({ error: 'Unsupported SOS sound selection' });
  }

  const current = await getSosSettings();
  const next = normalizeSosSettings({
    ...current,
    ...body,
    escalation: {
      ...current.escalation,
      ...(typeof body.escalation === 'object' && body.escalation ? body.escalation : {}),
    },
  });

  await saveSosSettings(next);
  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'SOS_SETTINGS_UPDATED',
    entityType: 'AppSetting',
    entityId: 'sos_settings',
    metadata: next,
  });

  res.json({ settings: publicSosSettings(next) });
}
