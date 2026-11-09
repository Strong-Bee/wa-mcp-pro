type Factory<T> = () => T | Promise<T>;
type Token<T> = string | symbol;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

class Container {
  private registrations = new Map<Token<unknown>, Registration<unknown>>();
  private resolving = new Set<Token<unknown>>();

  register<T>(token: Token<T>, factory: Factory<T>, singleton = true): void {
    if (this.registrations.has(token)) {
      throw new Error(`Token already registered: ${String(token)}`);
    }
    this.registrations.set(token, { factory, singleton });
  }

  registerInstance<T>(token: Token<T>, instance: T): void {
    this.registrations.set(token, { factory: () => instance, singleton: true, instance });
  }

  async resolve<T>(token: Token<T>): Promise<T> {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`Token not registered: ${String(token)}`);
    }

    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance as T;
    }

    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${String(token)}`);
    }

    this.resolving.add(token);

    try {
      const instance = await registration.factory();

      if (registration.singleton) {
        registration.instance = instance;
      }

      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  async resolveSync<T>(token: Token<T>): Promise<T> {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`Token not registered: ${String(token)}`);
    }

    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance as T;
    }

    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${String(token)}`);
    }

    this.resolving.add(token);

    try {
      const instance = registration.factory();

      if (registration.singleton) {
        registration.instance = instance as T;
      }

      return instance as T;
    } finally {
      this.resolving.delete(token);
    }
  }

  has(token: Token<unknown>): boolean {
    return this.registrations.has(token);
  }

  unregister(token: Token<unknown>): void {
    this.registrations.delete(token);
  }

  clear(): void {
    this.registrations.clear();
    this.resolving.clear();
  }

  getRegistrations(): Map<Token<unknown>, Registration<unknown>> {
    return new Map(this.registrations);
  }
}

export const container = new Container();

export function register<T>(token: Token<T>, factory: Factory<T>, singleton = true): void {
  container.register(token, factory, singleton);
}

export function registerInstance<T>(token: Token<T>, instance: T): void {
  container.registerInstance(token, instance);
}

export async function resolve<T>(token: Token<T>): Promise<T> {
  return container.resolve(token);
}

export async function resolveSync<T>(token: Token<T>): Promise<T> {
  return container.resolveSync(token);
}

export function has(token: Token<unknown>): boolean {
  return container.has(token);
}

export function unregister(token: Token<unknown>): void {
  container.unregister(token);
}

export function createToken<T>(name: string): Token<T> {
  return Symbol(name);
}