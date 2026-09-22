import { forwardRef, useId, type InputHTMLAttributes } from "react";
import clsx from "clsx";

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Mensaje de error; también marca el campo como inválido. */
  error?: string;
  hint?: string;
}

/** Campo de texto Fluent: 4px de radio y subrayado de acento al enfocar. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, hint, className, ...rest },
  ref,
) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-caption text-fg-secondary">
        {label}
      </label>
      <div
        className={clsx(
          "relative overflow-hidden rounded-input border bg-layer-alt transition-colors duration-exit ease-fluent hover:bg-layer",
          error ? "border-danger" : "border-stroke",
          "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:scale-x-0 after:transition-transform",
          "after:duration-enter after:ease-fluent focus-within:after:scale-x-100",
          error ? "after:bg-danger" : "after:bg-accent",
        )}
      >
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-8 w-full bg-transparent px-3 text-body text-fg placeholder:text-fg-tertiary focus-visible:outline-none"
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-caption text-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-fg-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
