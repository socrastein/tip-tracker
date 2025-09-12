interface MockStorage extends Storage {
  _getStore(): Record<string, string>;
  _setStore(newStore: Record<string, string>): void;
}

const createMockLocalStorage = (): MockStorage => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => {
      return store[key] || null;
    },

    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },

    removeItem: (key: string): void => {
      delete store[key];
    },

    clear: (): void => {
      store = {};
    },

    key: (index: number): string | null => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },

    get length(): number {
      return Object.keys(store).length;
    },

    // Helper methods for testing
    _getStore: (): Record<string, string> => store,
    _setStore: (newStore: Record<string, string>): void => {
      store = { ...newStore };
    },
  };
};

// Setup function to use in tests
export const setupMockLocalStorage = (): MockStorage => {
  const mockStorage = createMockLocalStorage();

  // Mock the global localStorage
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });

  return mockStorage;
};
