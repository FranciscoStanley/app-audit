import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { isProduction } from '../../config/env.validation';
import { User, UserRole } from '../../domain/entities/user.entity';
import {
  paginateArray,
  type PaginatedResult,
} from '../../domain/pagination/pagination';
import { UserStore } from './user.store';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private users = new Map<string, User>();

  constructor(
    private readonly store: UserStore,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const loaded = await this.store.load();
    for (const user of loaded) {
      this.users.set(user.id, user);
    }

    if (this.users.size === 0) {
      await this.bootstrapAdmin();
    } else {
      this.logger.log(
        `${this.users.size} usuário(s) carregado(s) de data/users.json`,
      );
    }
  }

  findByEmail(email: string): User | undefined {
    return [...this.users.values()].find(
      (u) => u.email === email.toLowerCase(),
    );
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByGithubId(githubId: string): User | undefined {
    return [...this.users.values()].find((u) => u.githubId === githubId);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  listUsers(): Omit<User, 'passwordHash'>[] {
    return [...this.users.values()].map((user) => {
      const { passwordHash, ...safe } = user;
      void passwordHash;
      return safe;
    });
  }

  listUsersPaginated(
    page: number,
    pageSize: number,
  ): PaginatedResult<Omit<User, 'passwordHash'>> {
    const all = this.listUsers().sort((a, b) => a.email.localeCompare(b.email));
    return paginateArray(all, page, pageSize);
  }

  async createUser(input: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
  }): Promise<Omit<User, 'passwordHash'>> {
    const email = input.email.toLowerCase();
    if (this.findByEmail(email)) {
      throw new ConflictException('Email já cadastrado');
    }

    const user: User = {
      id: randomUUID(),
      email,
      name: input.name,
      role: input.role,
      authProvider: 'local',
      passwordHash: await this.hashPassword(input.password),
    };

    this.users.set(user.id, user);
    await this.persist();
    const { passwordHash, ...safe } = user;
    void passwordHash;
    return safe;
  }

  private async bootstrapAdmin(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    const name =
      this.config.get<string>('ADMIN_NAME')?.trim() ?? 'Administrador';

    if (!email || !password) {
      const msg =
        'Nenhum usuário em data/users.json. Configure ADMIN_EMAIL e ADMIN_PASSWORD no .env ' +
        'ou execute: npm run users:create';
      if (isProduction()) {
        throw new Error(msg);
      }
      this.logger.warn(
        `${msg} (modo desenvolvimento — API inacessível até criar admin)`,
      );
      return;
    }

    if (password.length < 12) {
      throw new Error('ADMIN_PASSWORD deve ter no mínimo 12 caracteres.');
    }

    const admin: User = {
      id: randomUUID(),
      email,
      name,
      role: UserRole.ADMIN,
      authProvider: 'local',
      passwordHash: await this.hashPassword(password),
    };

    this.users.set(admin.id, admin);
    await this.persist();
    this.logger.log(`Administrador inicial criado: ${email}`);
  }

  async upsertFromGitHub(profile: {
    githubId: string;
    githubUsername: string;
    email: string;
    name: string;
  }): Promise<User> {
    const existing =
      this.findByGithubId(profile.githubId) ??
      this.findByEmail(profile.email);

    if (existing) {
      const updated: User = {
        ...existing,
        name: profile.name || existing.name,
        githubId: profile.githubId,
        githubUsername: profile.githubUsername,
        authProvider: existing.authProvider ?? 'github',
      };
      this.users.set(updated.id, updated);
      await this.persist();
      return updated;
    }

    const user: User = {
      id: randomUUID(),
      email: profile.email.toLowerCase(),
      name: profile.name || profile.githubUsername,
      role: UserRole.AUDITOR,
      authProvider: 'github',
      githubId: profile.githubId,
      githubUsername: profile.githubUsername,
    };

    this.users.set(user.id, user);
    await this.persist();
    this.logger.log(`Usuário GitHub criado: @${profile.githubUsername}`);
    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = isProduction() ? 12 : 10;
    return bcrypt.hash(password, rounds);
  }

  private async persist(): Promise<void> {
    await this.store.save([...this.users.values()]);
  }
}
