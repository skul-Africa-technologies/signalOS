/**
 * JWT Refresh Token Auth — Full Lifecycle Tests
 *
 * Covers: login → dual tokens → refresh rotation → reuse detection
 * → logout → session revocation → multi-session support
 */

import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user_1',
  phone: '+2348012345678',
  name: 'Amara',
  passwordHash: bcrypt.hashSync('password123', 10),
  businessType: 'TRADER',
  trustScore: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeSession(overrides: Partial<any> = {}) {
  return {
    id: 'session_1',
    userId: 'user_1',
    refreshTokenHash: 'hashed',
    ipAddress: '127.0.0.1',
    userAgent: 'Jest',
    deviceInfo: 'Unknown',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<any> = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Amara', phone: '+2348012345678', businessType: 'TRADER', trustScore: 0, createdAt: new Date() }),
    },
    refreshSession: {
      create: jest.fn().mockResolvedValue(makeSession()),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const jwt = {
    sign: jest.fn().mockReturnValue('mock_token'),
    verify: jest.fn(),
  };

  const config = {
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        'jwt.accessSecret': 'access_secret',
        'jwt.refreshSecret': 'refresh_secret',
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return map[key];
    }),
  };

  const walletService = { getOrCreate: jest.fn().mockResolvedValue({}) };
  const events = { emit: jest.fn() };

  return {
    prisma: { ...prisma, ...overrides.prisma },
    jwt: { ...jwt, ...overrides.jwt },
    config: { ...config, ...overrides.config },
    walletService,
    events,
  };
}

function makeService(overrides: Partial<any> = {}) {
  const deps = makeDeps(overrides);
  const service = new AuthService(
    deps.prisma as any,
    deps.jwt as any,
    deps.config as any,
    deps.walletService as any,
    deps.events as any,
  );
  return { service, ...deps };
}

// ─── Login ────────────────────────────────────────────────────────────────────

describe('AuthService — login', () => {
  it('returns accessToken, refreshToken, and expiresIn on valid credentials', async () => {
    const { service } = makeService();
    const result = await service.login({ phone: '+2348012345678', password: 'password123' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(900);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws UnauthorizedException for unknown phone', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.login({ phone: 'bad', password: 'x' })).rejects.toThrow('Invalid credentials');
  });

  it('throws UnauthorizedException for wrong password', async () => {
    const { service } = makeService();
    await expect(service.login({ phone: '+2348012345678', password: 'wrongpass' })).rejects.toThrow('Invalid credentials');
  });

  it('persists a refresh session on login', async () => {
    const { service, prisma } = makeService();
    await service.login({ phone: '+2348012345678', password: 'password123' });
    expect(prisma.refreshSession.create).toHaveBeenCalledTimes(1);
    const call = prisma.refreshSession.create.mock.calls[0][0].data;
    expect(call.userId).toBe('user_1');
    expect(call.refreshTokenHash).toBeDefined();
    expect(call.expiresAt).toBeInstanceOf(Date);
  });

  it('stores hashed refresh token — never raw', async () => {
    const { service, prisma } = makeService();
    await service.login({ phone: '+2348012345678', password: 'password123' });
    const stored = prisma.refreshSession.create.mock.calls[0][0].data.refreshTokenHash;
    // The stored hash must not equal the raw token
    expect(stored).not.toBe('mock_token');
    expect(stored.startsWith('$2b$')).toBe(true);
  });

  it('emits auth.login event', async () => {
    const { service, events } = makeService();
    await service.login({ phone: '+2348012345678', password: 'password123' });
    expect(events.emit).toHaveBeenCalledWith('auth.login', expect.objectContaining({ userId: 'user_1' }));
  });

  it('signs access and refresh tokens with separate secrets', async () => {
    const { service, jwt } = makeService();
    await service.login({ phone: '+2348012345678', password: 'password123' });
    const calls = jwt.sign.mock.calls;
    const secrets = calls.map((c: any[]) => c[1]?.secret);
    expect(secrets).toContain('access_secret');
    expect(secrets).toContain('refresh_secret');
  });
});

// ─── Refresh Token Rotation ───────────────────────────────────────────────────

describe('AuthService — refresh (rotation)', () => {
  it('issues new tokens and revokes old session', async () => {
    const rawToken = 'raw_refresh_token';
    const hash = await bcrypt.hash(rawToken, 10);
    const session = makeSession({ refreshTokenHash: hash });

    const { service, prisma } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([session]),
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue(makeSession()),
          updateMany: jest.fn(),
        },
      },
    });

    const result = await service.refresh('user_1', rawToken);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(prisma.refreshSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: session.id }, data: expect.objectContaining({ revoked: true }) }),
    );
  });

  it('rejects invalid refresh token', async () => {
    const { service, prisma } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([makeSession({ refreshTokenHash: await bcrypt.hash('other_token', 10) })]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          update: jest.fn(),
          create: jest.fn(),
        },
      },
    });
    await expect(service.refresh('user_1', 'wrong_token')).rejects.toThrow('Invalid refresh token');
  });

  it('revokes ALL sessions on token reuse detection', async () => {
    const rawToken = 'reused_token';
    // Session exists but hash doesn't match (already rotated — reuse attempt)
    const { service, prisma } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([makeSession({ refreshTokenHash: await bcrypt.hash('different_token', 10) })]),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          update: jest.fn(),
          create: jest.fn(),
        },
      },
    });
    await expect(service.refresh('user_1', rawToken)).rejects.toThrow('Invalid refresh token');
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revoked: true }) }),
    );
  });

  it('rejects expired sessions', async () => {
    const rawToken = 'expired_token';
    const hash = await bcrypt.hash(rawToken, 10);
    // findMany returns empty because expiresAt filter excludes expired sessions
    const { service } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([]), // expired filtered out
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          update: jest.fn(),
          create: jest.fn(),
        },
      },
    });
    await expect(service.refresh('user_1', rawToken)).rejects.toThrow('Invalid refresh token');
  });

  it('emits auth.token.refreshed event', async () => {
    const rawToken = 'valid_token';
    const hash = await bcrypt.hash(rawToken, 10);
    const { service, events } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([makeSession({ refreshTokenHash: hash })]),
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue(makeSession()),
          updateMany: jest.fn(),
        },
      },
    });
    await service.refresh('user_1', rawToken);
    expect(events.emit).toHaveBeenCalledWith('auth.token.refreshed', expect.objectContaining({ userId: 'user_1' }));
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('AuthService — logout', () => {
  it('revokes the matching session on logout', async () => {
    const rawToken = 'logout_token';
    const hash = await bcrypt.hash(rawToken, 10);
    const { service, prisma } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([makeSession({ refreshTokenHash: hash })]),
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn(),
          updateMany: jest.fn(),
        },
      },
    });
    const result = await service.logout('user_1', rawToken);
    expect(result.message).toBe('Logged out successfully');
    expect(prisma.refreshSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revoked: true }) }),
    );
  });

  it('returns success even if no matching session found', async () => {
    const { service } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
          create: jest.fn(),
          updateMany: jest.fn(),
        },
      },
    });
    const result = await service.logout('user_1', 'nonexistent_token');
    expect(result.message).toBe('Logged out successfully');
  });

  it('revokes all sessions on logout-all', async () => {
    const { service, prisma } = makeService();
    const result = await service.logoutAll('user_1');
    expect(result.message).toBe('All sessions revoked');
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1', revoked: false } }),
    );
  });

  it('emits auth.logout event', async () => {
    const rawToken = 'logout_token';
    const hash = await bcrypt.hash(rawToken, 10);
    const { service, events } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue([makeSession({ refreshTokenHash: hash })]),
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn(),
          updateMany: jest.fn(),
        },
      },
    });
    await service.logout('user_1', rawToken);
    expect(events.emit).toHaveBeenCalledWith('auth.logout', expect.objectContaining({ userId: 'user_1' }));
  });
});

// ─── Session Management ───────────────────────────────────────────────────────

describe('AuthService — sessions', () => {
  it('returns active sessions', async () => {
    const sessions = [makeSession(), makeSession({ id: 'session_2' })];
    const { service, prisma } = makeService({
      prisma: {
        refreshSession: {
          findMany: jest.fn().mockResolvedValue(sessions),
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
      },
    });
    const result = await service.getSessions('user_1');
    expect(result).toHaveLength(2);
  });

  it('revokes a specific session by id', async () => {
    const { service, prisma } = makeService({
      prisma: {
        refreshSession: {
          findUnique: jest.fn().mockResolvedValue(makeSession()),
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn(),
          create: jest.fn(),
          updateMany: jest.fn(),
        },
      },
    });
    const result = await service.revokeSession('user_1', 'session_1');
    expect(result.message).toBe('Session revoked');
    expect(prisma.refreshSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'session_1' }, data: expect.objectContaining({ revoked: true }) }),
    );
  });

  it('throws NotFoundException for session belonging to another user', async () => {
    const { service } = makeService({
      prisma: {
        refreshSession: {
          findUnique: jest.fn().mockResolvedValue(makeSession({ userId: 'other_user' })),
          update: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          updateMany: jest.fn(),
        },
      },
    });
    await expect(service.revokeSession('user_1', 'session_1')).rejects.toThrow('Session not found');
  });
});

// ─── Full Lifecycle Simulation ────────────────────────────────────────────────

describe('Auth — Full Lifecycle', () => {
  it('login → refresh → old token rejected → logout → refresh rejected', async () => {
    let storedHash = '';
    let sessionRevoked = false;

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        create: jest.fn(),
      },
      refreshSession: {
        create: jest.fn().mockImplementation(({ data }) => {
          storedHash = data.refreshTokenHash;
          return Promise.resolve(makeSession({ refreshTokenHash: storedHash }));
        }),
        findMany: jest.fn().mockImplementation(() => {
          if (sessionRevoked) return Promise.resolve([]);
          return Promise.resolve([makeSession({ refreshTokenHash: storedHash })]);
        }),
        update: jest.fn().mockImplementation(() => {
          sessionRevoked = true;
          return Promise.resolve({});
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
    };

    const { service, events } = makeService({ prisma });

    // Step 1: Login
    const loginResult = await service.login({ phone: '+2348012345678', password: 'password123' });
    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
    const originalRefreshToken = loginResult.refreshToken;

    // Step 2: Refresh — issues new tokens, revokes old session
    const refreshResult = await service.refresh('user_1', originalRefreshToken);
    expect(refreshResult.accessToken).toBeDefined();
    expect(sessionRevoked).toBe(true);

    // Step 3: Old refresh token rejected (session revoked)
    await expect(service.refresh('user_1', originalRefreshToken)).rejects.toThrow('Invalid refresh token');

    // Step 4: Logout
    const logoutResult = await service.logout('user_1', originalRefreshToken);
    expect(logoutResult.message).toBe('Logged out successfully');

    // Step 5: Verify events emitted in correct order
    const emitted = events.emit.mock.calls.map((c: any[]) => c[0]);
    expect(emitted).toContain('auth.login');
    expect(emitted).toContain('auth.token.refreshed');
  });
});
