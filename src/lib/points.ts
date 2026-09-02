import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLocalDateKey } from './date';

const POINTS_KEY = 'chalega_points';
const HISTORY_KEY = 'chalega_points_history';

const LEGACY_MIGRATION_KEY =
  'chalega_points_legacy_history_migrated';

export type PointsTransaction = {
  id: string;
  amount: number;
  type: string;
  title: string;
  description: string;
  timestamp: string;
};

/*
 * -------------------------------------------------------
 * LOCAL TIMESTAMP
 * -------------------------------------------------------
 *
 * We keep the actual timestamp as an ISO timestamp so
 * existing history remains compatible.
 *
 * The important difference is that daily reward keys use
 * the user's LOCAL calendar date rather than UTC.
 */
function getTransactionTimestamp(): string {
  return new Date().toISOString();
}

/*
 * -------------------------------------------------------
 * GET POINTS
 * -------------------------------------------------------
 */
export async function getPoints(): Promise<number> {
  try {
    const saved =
      await AsyncStorage.getItem(POINTS_KEY);

    if (!saved) {
      return 0;
    }

    const value = Number(saved);

    if (!Number.isFinite(value)) {
      return 0;
    }

    const safeValue = Math.max(
      0,
      Math.round(value)
    );

    await migrateLegacyBalance(safeValue);

    return safeValue;
  } catch (error) {
    console.log(
      'Could not read Chalega Points:',
      error
    );

    return 0;
  }
}

/*
 * -------------------------------------------------------
 * SET POINTS
 * -------------------------------------------------------
 */
export async function setPoints(
  amount: number
): Promise<number> {
  const safeAmount = Math.max(
    0,
    Math.round(amount)
  );

  await AsyncStorage.setItem(
    POINTS_KEY,
    String(safeAmount)
  );

  return safeAmount;
}

/*
 * -------------------------------------------------------
 * ADD POINTS
 * -------------------------------------------------------
 */
export async function addPoints(
  amount: number,
  type: string,
  title: string,
  description: string
): Promise<number> {
  const safeAmount = Math.max(
    0,
    Math.round(amount)
  );

  if (safeAmount === 0) {
    return getPoints();
  }

  const current =
    await getPoints();

  const newBalance =
    current + safeAmount;

  await setPoints(newBalance);

  await addTransaction({
    id: `${Date.now()}-${Math.random()}`,
    amount: safeAmount,
    type,
    title,
    description,
    timestamp:
      getTransactionTimestamp(),
  });

  return newBalance;
}

/*
 * -------------------------------------------------------
 * SUBTRACT POINTS
 * -------------------------------------------------------
 */
export async function subtractPoints(
  amount: number,
  type: string,
  title: string,
  description: string
): Promise<number | null> {
  const safeAmount = Math.max(
    0,
    Math.round(amount)
  );

  const current =
    await getPoints();

  if (safeAmount > current) {
    return null;
  }

  const newBalance =
    current - safeAmount;

  await setPoints(newBalance);

  await addTransaction({
    id: `${Date.now()}-${Math.random()}`,
    amount: -safeAmount,
    type,
    title,
    description,
    timestamp:
      getTransactionTimestamp(),
  });

  return newBalance;
}

/*
 * -------------------------------------------------------
 * ADD TRANSACTION
 * -------------------------------------------------------
 */
export async function addTransaction(
  transaction: PointsTransaction
): Promise<void> {
  try {
    const saved =
      await AsyncStorage.getItem(
        HISTORY_KEY
      );

    let history: PointsTransaction[] =
      [];

    if (saved) {
      try {
        const parsed =
          JSON.parse(saved);

        if (Array.isArray(parsed)) {
          history = parsed;
        }
      } catch {
        history = [];
      }
    }

    const updated = [
      transaction,
      ...history,
    ].slice(0, 100);

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.log(
      'Could not save points transaction:',
      error
    );
  }
}

/*
 * -------------------------------------------------------
 * GET POINTS HISTORY
 * -------------------------------------------------------
 */
export async function getPointsHistory(): Promise<
  PointsTransaction[]
> {
  try {
    const saved =
      await AsyncStorage.getItem(
        HISTORY_KEY
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

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
    console.log(
      'Could not read points history:',
      error
    );

    return [];
  }
}

/*
 * -------------------------------------------------------
 * HAS TRANSACTION
 * -------------------------------------------------------
 */
export async function hasTransaction(
  transactionType: string,
  transactionKey: string
): Promise<boolean> {
  const history =
    await getPointsHistory();

  return history.some(
    transaction =>
      transaction.type ===
        transactionType &&
      transaction.description ===
        transactionKey
  );
}

/*
 * -------------------------------------------------------
 * AWARD ONCE
 * -------------------------------------------------------
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
  const alreadyAwarded =
    await hasTransaction(
      transactionType,
      transactionKey
    );

  const current =
    await getPoints();

  if (alreadyAwarded) {
    return {
      awarded: false,
      balance: current,
    };
  }

  const balance =
    await addPoints(
      amount,
      transactionType,
      title,
      transactionKey
    );

  return {
    awarded: true,
    balance,
  };
}

/*
 * -------------------------------------------------------
 * LEGACY BALANCE MIGRATION
 * -------------------------------------------------------
 *
 * This preserves the existing 432-point starting
 * transaction.
 *
 * It does NOT add points.
 */
async function migrateLegacyBalance(
  currentBalance: number
): Promise<void> {
  try {
    const migrated =
      await AsyncStorage.getItem(
        LEGACY_MIGRATION_KEY
      );

    if (migrated === 'true') {
      return;
    }

    const savedHistory =
      await AsyncStorage.getItem(
        HISTORY_KEY
      );

    let history: PointsTransaction[] =
      [];

    if (savedHistory) {
      try {
        const parsed =
          JSON.parse(savedHistory);

        if (Array.isArray(parsed)) {
          history = parsed;
        }
      } catch {
        history = [];
      }
    }

    /*
     * History already exists.
     */
    if (history.length > 0) {
      await AsyncStorage.setItem(
        LEGACY_MIGRATION_KEY,
        'true'
      );

      return;
    }

    /*
     * Nothing to migrate.
     */
    if (currentBalance <= 0) {
      await AsyncStorage.setItem(
        LEGACY_MIGRATION_KEY,
        'true'
      );

      return;
    }

    /*
     * Record the existing wallet balance.
     *
     * IMPORTANT:
     * This does not modify POINTS_KEY.
     */
    const legacyTransaction:
      PointsTransaction = {
        id:
          `legacy-balance-${Date.now()}`,
        amount: currentBalance,
        type: 'starting_balance',
        title:
          'Existing Chalega Points',
        description:
          'Starting wallet balance',
        timestamp:
          getTransactionTimestamp(),
      };

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([
        legacyTransaction,
      ])
    );

    await AsyncStorage.setItem(
      LEGACY_MIGRATION_KEY,
      'true'
    );

    console.log(
      `Migrated existing ${currentBalance} Chalega Points into Points Activity.`
    );
  } catch (error) {
    console.log(
      'Could not migrate legacy Chalega Points:',
      error
    );
  }
}