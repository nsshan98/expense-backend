import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return uptime status', () => {
      expect(appController.getUptime()).toEqual({
        message: '🎉 Yay! I’m alive and kicking 🚀',
        status: 'UP 🟢',
      });
    });
  });
});
