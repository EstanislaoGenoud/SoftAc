import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from '../users/entities/usuario.entity.js';
import { Tenant } from '../users/entities/tenant.entity.js';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest'; // Importamos de Vitest

describe('AuthService', () => {
  let service: AuthService;

  // Cambiamos jest.fn() por vi.fn()
  const mockUsuarioRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockTenantRepo = {
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockJwtService = {
    sign: vi.fn(() => 'mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('debería retornar un token si el usuario tiene tenant asignado', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        nombre: 'Test',
        tenant: { db_name: 'test_db' }
      };

      const result = await service.login(mockUser);
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('debería lanzar UnauthorizedException si no tiene tenant', async () => {
      const mockUserSinTenant = { id: '1', email: 'test@test.com', tenant: null };
      
      await expect(service.login(mockUserSinTenant)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('debería retornar nulo si el usuario no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      const result = await service.validateUser('notfound@test.com', '123');
      expect(result).toBeNull();
    });
  });
});
