import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

const POINTS_KEY = 'chalega_points';
const HISTORY_KEY = 'chalega_points_history';
const LEGACY_MIGRATION_KEY =
  'chalega_points_legacy_history_migrated';

/*
 * -------------------------------------------------------
 * VERIFIED ACCOUNT RECOVERY
 * -------------------------------------------------------
 *
 * This restores the previously verified local test-account
 * state that was lost during the points/streak migration.
 *
 * IMPORTANT:
 * - Runs only for the verified account below.
 * - Runs only once for that account.
 * - Requires the existing legacy migration marker.
 * - Never runs for guest/anonymous/other accounts.
 * - Does not create a second points system.
 */

const VERIFIED_RECOVERY_USER_ID =
  '7ec6a113-304b-4186-91f4-624ec2fa5b16';

const VERIFIED_RECOVERY_KEY =
  `chalega_verified_recovery_20260911_${VERIFIED_RECOVERY_USER_ID}`;

const VERIFIED_RECOVERY_POINTS = 525;

const VERIFIED_RECOVERY_DESCRIPTION =
  `verified_account_recovery_20260911_${VERIFIED_RECOVERY_USER_ID}`;

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
    typeof value === 'number'
      ? value
      : Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(numericValue)
  );
}

/*
 * -------------------------------------------------------
 * VERIFIED ACCOUNT RECOVERY
 * -------------------------------------------------------
 *
 * The original verified account had 525 Chalega Points.
 *
 * This recovery is now explicitly tied to the verified
 * Supabase Auth user ID.
 *
 * We use getUser() rather than trusting an arbitrary local
 * account identifier.
 */
async function recoverVerifiedAccountOnce(): Promise<void> {
  try {
    /*
     * Check the account-specific recovery marker first.
     */
    const recoveryDone =
      await AsyncStorage.getItem(
        VERIFIED_RECOVERY_KEY
      );

    if (recoveryDone === 'true') {
      return;
    }

    /*
     * Verify the currently authenticated Supabase user.
     *
     * This prevents the recovery from running for:
     * - another registered account
     * - guest sessions
     * - anonymous users
     * - signed-out users
     */
    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log(
        '[Chalega Points] Recovery skipped: no authenticated user.'
      );

      return;
    }

    if (
      user.id !==
      VERIFIED_RECOVERY_USER_ID
    ) {
      console.log(
        '[Chalega Points] Recovery skipped: account is not the verified recovery account.'
      );

      return;
    }

    /*
     * Never allow an anonymous session to receive the
     * verified-account recovery.
     */
    if (user.is_anonymous) {
      console.log(
        '[Chalega Points] Recovery skipped: anonymous account.'
      );

      return;
    }

    /*
     * Only devices that already passed the previous
     * legacy migration are eligible for this recovery.
     *
     * A fresh installation will not have this marker.
     */
    const legacyMigrated =
      await AsyncStorage.getItem(
        LEGACY_MIGRATION_KEY
      );

    if (legacyMigrated !== 'true') {
      console.log(
        '[Chalega Points] Recovery skipped: legacy migration marker not found.'
      );

      return;
    }

    /*
     * Read the current local wallet.
     */
    const savedBalance =
      await AsyncStorage.getItem(
        POINTS_KEY
      );

    const currentBalance =
      normalizePoints(savedBalance);

    /*
     * If the account already has points, never overwrite
     * or modify them.
     */
    if (currentBalance > 0) {
      await AsyncStorage.setItem(
        VERIFIED_RECOVERY_KEY,
        'true'
      );

      console.log(
        '[Chalega Points] Recovery skipped: account already has points.'
      );

      return;
    }

    /*
     * Read existing transaction history.
     */
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

    /*
     * Check whether this exact account-specific recovery
     * transaction already exists.
     */
    const alreadyRecovered =
      history.some(
        transaction =>
          transaction.type ===
            'verified_account_recovery' &&
          transaction.description ===
            VERIFIED_RECOVERY_DESCRIPTION
      );

    if (alreadyRecovered) {
      await AsyncStorage.setItem(
        VERIFIED_RECOVERY_KEY,
        'true'
      );

      console.log(
        '[Chalega Points] Recovery transaction already exists.'
      );

      return;
    }

    /*
     * Restore the verified 525-point balance.
     */
    await AsyncStorage.setItem(
      POINTS_KEY,
      String(
        VERIFIED_RECOVERY_POINTS
      )
    );

    /*
     * Add a transparent ledger entry so Points Activity
     * explains where the restored balance came from.
     */
    const recoveryTransaction:
      PointsTransaction = {
        id:
          `verified-recovery-${Date.now()}`,
        amount:
          VERIFIED_RECOVERY_POINTS,
        type:
          'verified_account_recovery',
        title:
          'Verified Chalega Points Recovery',
        description:
          VERIFIED_RECOVERY_DESCRIPTION,
        timestamp:
          getTransactionTimestamp(),
      };

    const updatedHistory = [
      recoveryTransaction,
      ...history,
    ].slice(0, 100);

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(
        updatedHistory
      )
    );

    /*
     * Permanently mark this account's recovery complete.
     */
    await AsyncStorage.setItem(
      VERIFIED_RECOVERY_KEY,
      'true'
    );

    console.log(
      '[Chalega Points] Verified account recovery completed: 525 points restored.'
    );
  } catch (error) {
    /*
     * Recovery failure must never crash the wallet.
     */
    console.warn(
      '[Chalega Points] Could not complete verified account recovery:',
      error
    );
  }
}

/*
 * -------------------------------------------------------
 * GET POINTS
 * -------------------------------------------------------
 *
 * Single source of truth for the Chalega Points balance.
 */
export async function getPoints(): Promise<number> {
  try {
    /*
     * Run the one-time account-specific recovery before
     * reading the balance.
     */
    await recoverVerifiedAccountOnce();

    const saved =
      await AsyncStorage.getItem(
        POINTS_KEY
      );

    const balance =
      normalizePoints(saved);

    await migrateLegacyBalance(
      balance
    );

    console.log(
      '[Chalega Points] getPoints:',
      balance
    );

    return balance;
  } catch (error) {
    console.warn(
      '[Chalega Points] Could not read balance:',
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
  const safeAmount =
    normalizePoints(amount);

  await AsyncStorage.setItem(
    POINTS_KEY,
    String(safeAmount)
  );

  console.log(
    '[Chalega Points] setPoints:',
    safeAmount
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
  const safeAmount =
    normalizePoints(amount);

  if (safeAmount === 0) {
    return getPoints();
  }

  const current =
    await getPoints();

  const newBalance =
    current + safeAmount;

  await setPoints(
    newBalance
  );

  await addTransaction({
    id:
      `${Date.now()}-${Math.random()}`,
    amount:
      safeAmount,
    type,
    title,
    description,
    timestamp:
      getTransactionTimestamp(),
  });

  console.log(
    '[Chalega Points] addPoints:',
    {
      current,
      added: safeAmount,
      newBalance,
    }
  );

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
  const safeAmount =
    normalizePoints(amount);

  const current =
    await getPoints();

  if (safeAmount > current) {
    return null;
  }

  const newBalance =
    current - safeAmount;

  await setPoints(
    newBalance
  );

  await addTransaction({
    id:
      `${Date.now()}-${Math.random()}`,
    amount:
      -safeAmount,
    type,
    title,
    description,
    timestamp:
      getTransactionTimestamp(),
  });

  console.log(
    '[Chalega Points] subtractPoints:',
    {
      current,
      subtracted: safeAmount,
      newBalance,
    }
  );

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

    let history:
      PointsTransaction[] = [];

    if (saved) {
      try {
        const parsed =
          JSON.parse(saved);

        if (Array.isArray(parsed)) {
          history =
            parsed.filter(
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

    const updated = [
      transaction,
      ...history,
    ].slice(0, 100);

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.warn(
      '[Chalega Points] Could not save transaction:',
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
    console.warn(
      '[Chalega Points] Could not read history:',
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
 *
 * Central idempotent reward function.
 *
 * This remains the single mechanism used by missions,
 * streaks and other Chalega reward flows.
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
 * This only records an existing wallet balance in history.
 * It NEVER changes the actual points balance.
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

    let history:
      PointsTransaction[] = [];

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
     * Record the existing balance.
     *
     * IMPORTANT:
     * This does NOT modify POINTS_KEY.
     */
    const legacyTransaction:
      PointsTransaction = {
        id:
          `legacy-balance-${Date.now()}`,
        amount:
          currentBalance,
        type:
          'starting_balance',
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
      `[Chalega Points] Migrated existing ${currentBalance} points into Points Activity.`
    );
  } catch (error) {
    console.warn(
      '[Chalega Points] Could not migrate legacy balance:',
      error
    );
  }
}