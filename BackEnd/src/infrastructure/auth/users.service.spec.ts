import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../domain/entities/user.entity';
import { UsersService } from './users.service';
import { UserStore } from './user.store';
import { ConfigService } from '@nestjs/config';

describe('UsersService.updateUser', () => {
  let service: UsersService;
  let store: UserStore;

  beforeEach(async () => {
    store = {
      load: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as UserStore;

    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    service = new UsersService(store, config);
    await service.onModuleInit();

    await service.createUser({
      email: 'admin@empresa.com',
      password: 'SenhaForte123!',
      name: 'Admin',
      role: UserRole.ADMIN,
    });
    await service.createUser({
      email: 'auditor@empresa.com',
      password: 'SenhaForte123!',
      name: 'Auditor',
      role: UserRole.AUDITOR,
    });
  });

  it('atualiza papel do usuário', async () => {
    const auditor = service.findByEmail('auditor@empresa.com')!;
    const updated = await service.updateUser(
      auditor.id,
      { role: UserRole.ADMIN },
      service.findByEmail('admin@empresa.com')!.id,
    );
    expect(updated.role).toBe(UserRole.ADMIN);
  });

  it('impede rebaixar o último admin', async () => {
    const admin = service.findByEmail('admin@empresa.com')!;
    await expect(
      service.updateUser(admin.id, { role: UserRole.AUDITOR }, admin.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retorna 404 para id inexistente', async () => {
    await expect(
      service.updateUser('missing-id', { role: UserRole.VIEWER }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.upsertFromGitHub', () => {
  let service: UsersService;
  let store: UserStore;

  beforeEach(async () => {
    store = {
      load: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as UserStore;

    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    service = new UsersService(store, config);
    await service.onModuleInit();
  });

  it('cria usuário GitHub do proprietário como admin', async () => {
    const user = await service.upsertFromGitHub({
      githubId: '1',
      githubUsername: 'FranciscoStanley',
      email: 'franciscothestanley@gmail.com',
      name: 'Francisco',
    });

    expect(user.role).toBe(UserRole.ADMIN);
    expect(user.name).toBe('Francisco Stanley Rodrigues Albuquerque');
  });

  it('promove usuário existente do proprietário para admin', async () => {
    await service.upsertFromGitHub({
      githubId: '1',
      githubUsername: 'FranciscoStanley',
      email: 'franciscothestanley@gmail.com',
      name: 'Francisco',
    });

    const auditor = await service.createUser({
      email: 'auditor@empresa.com',
      password: 'SenhaForte123!',
      name: 'Auditor',
      role: UserRole.AUDITOR,
    });

    expect(auditor.role).toBe(UserRole.AUDITOR);

    const user = await service.upsertFromGitHub({
      githubId: '1',
      githubUsername: 'FranciscoStanley',
      email: 'franciscothestanley@gmail.com',
      name: 'Francisco',
    });

    expect(user.role).toBe(UserRole.ADMIN);
  });
});
