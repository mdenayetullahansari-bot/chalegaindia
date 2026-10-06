import AsyncStorage from '@react-native-async-storage/async-storage';

const POINTS_KEY = 'chalega_points';
const HISTORY_KEY = 'chalega_points_history';
const LEGACY_MIGRATION_KEY = 'chalega_points_legacy_history_migrated';

/*
 * Legacy local Coin helpers kept only for older screens/components.
 *
 * IMPORTANT:
 * The production Chalega Coins wallet is server-authoritative.
 * New reward flows must use Supabase RPCs and the central ledger.
 * These local helpers do not write to the server wallet.
 */

export type PointsTransaction = {
  id: string;
  amount: number;
  type: string;
  title: string;
  description: string;
  timestamp: string;
};

function getTransactionTimestamp(): string {
  return new Date().toISOString();
}

function normalizePoints(value: unknown): number {
  const numericValue =
    typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.round(numericValue));
}

/**
 * @deprecated Legacy local compatibility API.
 * Canonical Chalega Coins must come from the Supabase wallet.
 */
export async function getPoints(): Promise<number> {
  try {
    const saved = await AsyncStorage.getItem(POINTS_KEY);
    const balance = normalizePoints(saved);
    await migrateLegacyBalance(balance);
    return balance;
  } catch (error) {
    console.warn('[Chalega Coins] Could not read legacy balance:', error);
    return 0;
  }
}

/**
 * @deprecated Legacy local compatibility API.
 */
export async function setPoints(amount: number): Promise<number> {
  const safeAmount = normalizePoints(amount);
  await AsyncStorage.setItem(POINTS_KEY, String(safeAmount));
  return safeAmount;
}

/**
 * @deprecated Legacy local compatibility API.
 */
export async function addPoints(
  amount: number,
  type: string,
  title: string,
  description: string
): Promise<number> {
  const safeAmount = normalizePoints(amount);

  if (safeAmount === 0) {
    return getPoints();
  }

  const current = await getPoints();
  const newBalance = current + safeAmount;

  await setPoints(newBalance);
  await addTransaction({
    id: `${Date.now()}-${Math.random()}`,
    amount: safeAmount,
    type,
    title,
    description,
    timestamp: getTransactionTimestamp(),
  });

  return newBalance;
}

/**
 * @deprecated Legacy local compatibility API.
 */
export async function subtractPoints(
  amount: number,
  type: string,
  title: string,
  description: string
): Promise<number | null> {
  const safeAmount = normalizePoints(amount);
  const current = await getPoints();

  if (safeAmount > current) {
    return null;
  }

  const newBalance = current - safeAmount;

  await setPoints(newBalance);
  await addTransaction({
    id: `${Date.now()}-${Math.random()}`,
    amount: -safeAmount,
    type,
    title,
    description,
    timestamp: getTransactionTimestamp(),
  });

  return newBalance;
}

export async function addTransaction(
  transaction: PointsTransaction
): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(HISTORY_KEY);

    let history: PointsTransaction[] = [];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          history = parsed.filter(
            item =>
              item &&
              typeof item.id === 'string' &&
              typeof item.amount === 'number' &&
              typeof item.type === 'string' &&
              typeof item.title === 'string' &&
              typeof item.description === 'string' &&
              typeof item.timestamp === 'string'
          );
        }
      } catch {
        history = [];
      }
    }

    const updated = [transaction, ...history].slice(0, 100);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[Chalega Coins] Could not save legacy transaction:', error);
  }
}

export async function getPointsHistory(): Promise<PointsTransaction[]> {
  try {
    const saved = await AsyncStorage.getItem(HISTORY_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      item =>
        item &&
        typeof item.id === 'string' &&
        typeof item.amount === 'number' &&
        typeof item.type === 'string' &&
        typeof item.title === 'string' &&
        typeof item.description === 'string' &&
        typeof item.timestamp === 'string'
    );
  } catch (error) {
    console.warn('[Chalega Coins] Could not read legacy history:', error);
    return [];
  }
}

export async function hasTransaction(
  transactionType: string,
  transactionKey: string
): Promise<boolean> {
  const history = await getPointsHistory();

  return history.some(
    transaction =>
      transaction.type === transactionType &&
      transaction.description === transactionKey
  );
}

/**
 * @deprecated Legacy local compatibility API.
 */
export async function awardOnce(
  transactionType: string,
  transactionKey: string,
  amount: number,
  title: string,
  description: string
): Promise<{
  awarded: boolean;
  balance: number;
}> {
  const alreadyAwarded = await hasTransaction(
    transactionType,
    transactionKey
  );

  const current = await getPoints();

  if (alreadyAwarded) {
    return {
      awarded: false,
      balance: current,
    };
  }

  const balance = await addPoints(
    amount,
    transactionType,
    title,
    transactionKey || description
  );

  return {
    awarded: true,
    balance,
  };
}

async function migrateLegacyBalance(
  currentBalance: number
): Promise<void> {
  try {
    const migrated = await AsyncStorage.getItem(
      LEGACY_MIGRATION_KEY
    );

    if (migrated === 'true') {
      return;
    }

    const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);

    let history: PointsTransaction[] = [];

    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          history = parsed;
        }
      } catch {
        history = [];
      }
    }

    if (history.length > 0 || currentBalance <= 0) {
      await AsyncStorage.setItem(
        LEGACY_MIGRATION_KEY,
        'true'
      );
      return;
    }

    const legacyTransaction: PointsTransaction = {
      id: `legacy-balance-${Date.now()}`,
      amount: currentBalance,
      type: 'starting_balance',
      title: 'Existing Chalega Coins',
      description: 'Starting legacy wallet balance',
      timestamp: getTransactionTimestamp(),
    };

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([legacyTransaction])
    );

    await AsyncStorage.setItem(
      LEGACY_MIGRATION_KEY,
      'true'
    );
  } catch (error) {
    console.warn('[Chalega Coins] Could not migrate legacy balance:', error);
  }
}
