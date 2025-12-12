import { Transform } from 'class-transformer';

export function ToBoolean() {
  return Transform(({ value }): boolean | undefined => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined; // leave field untouched if missing
  });
}
