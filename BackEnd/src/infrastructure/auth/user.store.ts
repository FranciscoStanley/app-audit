import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { User } from '../../domain/entities/user.entity';

interface UserStoreFile {
  version: 1;
  users: User[];
}

@Injectable()
export class UserStore {
  private readonly filePath = join(process.cwd(), 'data', 'users.json');

  async load(): Promise<User[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const data = JSON.parse(raw) as UserStoreFile;
      return data.users ?? [];
    } catch {
      return [];
    }
  }

  async save(users: User[]): Promise<void> {
    await mkdir(join(this.filePath, '..'), { recursive: true });
    const payload: UserStoreFile = { version: 1, users };
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), 'utf-8');
  }
}
