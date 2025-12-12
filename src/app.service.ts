import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getUptime() {
    return {
      message: '🎉 Yay! I’m alive and kicking 🚀',
      status: 'UP 🟢',
    };
  }
}
