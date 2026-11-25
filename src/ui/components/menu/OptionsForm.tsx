import { useId, useState, type FormEvent } from 'react';
import { useAppServices } from '../../../app/AppServices';
import { OPTION_LIMITS, type MatchOptions } from '../../../game/config/gameConfig';
import {
  loadOptions,
  saveOptions,
  validateOptions,
  type OptionsErrors,
  type OptionsField,
} from '../../../storage/optionsStorage';
import { savePlayerName, validatePlayerName } from '../../../storage/profileStorage';
import { GameButton } from '../common/GameButton';
import { RoundIconButton } from '../common/RoundIconButton';

type Draft = Record<OptionsField, string>;

const FIELDS: readonly { field: OptionsField; label: string; unit: string }[] = [
  { field: 'durationSeconds', label: 'Game session time', unit: 'seconds' },
  { field: 'spawnIntervalSeconds', label: 'Enemy spawn time', unit: 'seconds' },
];

function toDraft(options: MatchOptions): Draft {
  return {
    durationSeconds: String(options.durationSeconds),
    spawnIntervalSeconds: String(options.spawnIntervalSeconds),
  };
}

function parseDraft(draft: Draft) {
  const toNumber = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));
  return {
    durationSeconds: toNumber(draft.durationSeconds),
    spawnIntervalSeconds: toNumber(draft.spawnIntervalSeconds),
  };
}

interface OptionsFormProps {
  backLabel: string;
  onBack: () => void;
  savedMessage?: string;
}

export function OptionsForm({
  backLabel,
  onBack,
  savedMessage = 'Options saved. They apply to your next battle.',
}: OptionsFormProps) {
  const { profile, setProfile } = useAppServices();
  const [draft, setDraft] = useState<Draft>(() => toDraft(loadOptions()));
  const [name, setName] = useState(profile.playerName);
  const [errors, setErrors] = useState<OptionsErrors>({});
  const [nameError, setNameError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const baseId = useId();

  const step = (field: OptionsField, direction: 1 | -1) => {
    const limits = OPTION_LIMITS[field];
    const stepSize = field === 'durationSeconds' ? 10 : limits.step;
    const current = Number(draft[field]);
    const base = Number.isFinite(current) ? current : limits.min;
    const next = Math.min(
      limits.max,
      Math.max(limits.min, Math.round((base + direction * stepSize) * 100) / 100),
    );
    setDraft((previous) => ({ ...previous, [field]: String(next) }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setStatus('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateOptions(parseDraft(draft));
    const playerNameError = validatePlayerName(name);
    setNameError(playerNameError);
    if (!result.ok || playerNameError) {
      setErrors(result.ok ? {} : result.errors);
      setStatus('');
      const form = event.currentTarget;
      requestAnimationFrame(() => {
        form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setErrors({});
    const savedOptions = saveOptions(result.value);
    const savedProfile = savePlayerName(name);
    if (savedProfile) setProfile(savedProfile);
    setDraft(toDraft(result.value));
    setStatus(savedOptions ? savedMessage : 'Options could not be saved on this device.');
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="form-grid">
        {FIELDS.map(({ field, label, unit }) => {
          const limits = OPTION_LIMITS[field];
          const inputId = `${baseId}-${field}`;
          const hintId = `${inputId}-hint`;
          const errorId = `${inputId}-error`;
          const error = errors[field];
          return (
            <div className="field" key={field}>
              <label htmlFor={inputId}>{label}</label>
              <div className="stepper">
                <RoundIconButton
                  icon="minus"
                  label={`Decrease ${label.toLowerCase()}`}
                  size="small"
                  onClick={() => step(field, -1)}
                />
                <input
                  className="stepper__value"
                  style={{ width: `${Math.max(1, draft[field].length) + 0.4}ch` }}
                  id={inputId}
                  name={field}
                  type="number"
                  inputMode="decimal"
                  min={limits.min}
                  max={limits.max}
                  step={limits.step}
                  value={draft[field]}
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                  onChange={(event) => {
                    setDraft((previous) => ({ ...previous, [field]: event.target.value }));
                    setStatus('');
                  }}
                />
                <span className="stepper__unit" aria-hidden="true">
                  s
                </span>
                <RoundIconButton
                  icon="plus"
                  label={`Increase ${label.toLowerCase()}`}
                  size="small"
                  onClick={() => step(field, 1)}
                />
              </div>
              <span id={hintId} className="field__hint">
                Between {limits.min} and {limits.max} {unit}
                {field === 'spawnIntervalSeconds' ? `, in steps of ${limits.step}` : ''}.
              </span>
              {error ? (
                <span id={errorId} className="field__error error-text" role="alert">
                  {error}
                </span>
              ) : null}
            </div>
          );
        })}
        <div className="field">
          <label htmlFor={`${baseId}-name`}>Captain name</label>
          <input
            id={`${baseId}-name`}
            className="text-input"
            name="playerName"
            type="text"
            autoComplete="nickname"
            maxLength={20}
            value={name}
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? `${baseId}-name-error` : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setStatus('');
            }}
          />
          {nameError ? (
            <span id={`${baseId}-name-error`} className="field__error error-text" role="alert">
              {nameError}
            </span>
          ) : null}
        </div>
      </div>
      <p role="status" className="success-text" style={{ minHeight: '1.3em' }} data-testid="options-status">
        {status}
      </p>
      <div className="stack">
        <GameButton type="submit">Save</GameButton>
        <GameButton onClick={onBack}>{backLabel}</GameButton>
      </div>
    </form>
  );
}
