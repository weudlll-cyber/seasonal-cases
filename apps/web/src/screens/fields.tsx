/**
 * @file   apps/web/src/screens/fields.tsx
 * @brief  The form fields of the sign-in and the dev admin: a labelled text, number or choice,
 *         each with its tooltip (CONCEPT §7: tooltips on every input).
 *
 * Responsibility: one look and one way of wiring for every field; the value stays the
 *                 caller's state.
 * Depends on:     react
 */

interface FieldProps<T> {
  readonly label: string;
  readonly tip: string;
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function TextField({
  label,
  tip,
  value,
  onChange,
  maxLength,
  placeholder,
  required = false,
}: FieldProps<string> & { maxLength: number; placeholder?: string; required?: boolean }) {
  return (
    <label>
      {label}
      <input
        value={value}
        maxLength={maxLength}
        required={required}
        title={tip}
        {...(placeholder === undefined ? {} : { placeholder })}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </label>
  );
}

export function NumberField({
  label,
  tip,
  value,
  onChange,
  min,
  max,
}: FieldProps<number> & { min: number; max: number }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        title={tip}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
      />
    </label>
  );
}

export function ChoiceField<T extends string | number>({
  label,
  tip,
  value,
  onChange,
  choices,
}: FieldProps<T> & { choices: readonly { value: T; text: string }[] }) {
  return (
    <label>
      {label}
      <select
        value={value}
        title={tip}
        onChange={(e) => {
          const chosen = choices.find((c) => String(c.value) === e.target.value);
          if (chosen !== undefined) onChange(chosen.value);
        }}
      >
        {choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.text}
          </option>
        ))}
      </select>
    </label>
  );
}
