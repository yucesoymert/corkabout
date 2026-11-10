/** fill("{a} · {b}", { a: "1", b: "2" }). "{card|cards}" picks by n === 1. */
// ponytail: English one/other only (copied from garage); use Intl.PluralRules when a language with more forms arrives.
export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(?:(\w+)|([^{}|]*)\|([^{}|]*))\}/g, (_, k, one, other) =>
    k ? String(vars[k] ?? `{${k}}`) : vars.n === 1 ? one : other,
  );
