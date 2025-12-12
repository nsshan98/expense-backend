import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

/**
 * Transforms string JSON to JavaScript object/array
 */
export function ParseJson() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new BadRequestException(`Invalid JSON format: ${error.message}`);
      }
    }
    return value;
  });
}

/**
 * Transforms string 'true'/'false' to boolean
 */
export function ParseBoolean() {
  return Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value; // Let class-validator handle invalid values
  });
}
