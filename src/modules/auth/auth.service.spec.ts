import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

const mockUsersService = {
  createUser: jest.fn(),
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(() => 'token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a user', async () => {
    const dto = { name: 'Test', email: 'test@test.com', password: 'password' };
    mockUsersService.createUser.mockResolvedValue({ id: 1, ...dto });

    const result = await service.register(dto);
    expect(result).toHaveProperty('accessToken');
    expect(result.user.email).toEqual(dto.email);
  });
});
