// parse-json-and-boolean.pipe.ts
import {
  Injectable,
  PipeTransform,
  BadRequestException,
  ValidationPipe,
  ArgumentMetadata,
} from '@nestjs/common';

@Injectable()
export class ParseJsonAndBooleanPipe implements PipeTransform {
  private validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });

  constructor(
    private jsonFields: string[] = [], // fields to parse as JSON
    private booleanFields: string[] = [], // fields to convert to boolean
  ) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    if (value && typeof value === 'object') {
      // 1️⃣ Parse JSON fields
      for (const field of this.jsonFields) {
        if (typeof value[field] === 'string') {
          try {
            value[field] = JSON.parse(value[field]);
          } catch {
            throw new BadRequestException(
              `Field ${field} contains invalid JSON`,
            );
          }
        }
      }

      // 2️⃣ Convert boolean fields
      for (const field of this.booleanFields) {
        if (typeof value[field] === 'string') {
          if (value[field] === 'true') value[field] = true;
          else if (value[field] === 'false') value[field] = false;
          else value[field] = undefined; // leave untouched if invalid
        }
      }
    }

    // 3️⃣ Run validation + transformation
    return this.validator.transform(value, metadata);
  }
}
