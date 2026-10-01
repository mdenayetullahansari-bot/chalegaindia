import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'chalega_streak_count';
const LAST_COMPLETED_KEY =
  'chalega_streak_last_completed_date';
const BEST_STREAK_KEY = 'chalega_best_streak';

export async function getStreak(): Promise<number> {
  const saved = await AsyncStorage.getItem(STREAK_KEY);
  const value = Number(saved);

  return Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export async function getBestStreak(): Promise<number> {
  const saved =
    await AsyncStorage.getItem(BEST_STREAK_KEY);

  const value = Number(saved);

  return Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export async function getLastCompletedDate(): Promise<
  string | null
> {
  return AsyncStorage.getItem(
    LAST_COMPLETED_KEY
  );
}

/*
 * Completes one walking day.
 *
 * IMPORTANT:
 * If the new streak engine has never been initialized
 * before, preserve the user's existing streak instead
 * of resetting it.
 *
 * Example:
 * Existing streak = 6
 * First migration today = remains 6
 * Tomorrow = 7
 *
 * Once a date has been recorded, consecutive days
 * increment normally.
 */
export async function completeStreakDay(
  todayKey: string,
  existingStreak = 0
): Promise<number> {
  const storedStreak = await getStreak();

  const currentStreak =
    storedStreak > 0
      ? storedStreak
      : Math.max(0, existingStreak);

  const lastCompleted =
    await AsyncStorage.getItem(
      LAST_COMPLETED_KEY
    );

  /*
   * Already completed today.
   * Never increment twice.
   */
  if (lastCompleted === todayKey) {
    return currentStreak;
  }

  /*
   * First-time migration from the old walking
   * streak storage.
   *
   * Preserve the existing streak exactly.
   */
  if (!lastCompleted) {
    const best = await getBestStreak();

    const preservedStreak =
      Math.max(currentStreak, 0);

    await AsyncStorage.multiSet([
      [
        STREAK_KEY,
        String(preservedStreak),
      ],
      [
        LAST_COMPLETED_KEY,
        todayKey,
      ],
      [
        BEST_STREAK_KEY,
        String(
          Math.max(
            best,
            preservedStreak
          )
        ),
      ],
    ]);

    return preservedStreak;
  }

  /*
   * Work out yesterday's date.
   */
  const today = new Date(
    todayKey + 'T00:00:00'
  );

  const yesterday = new Date(today);

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  const yesterdayKey =
    yesterday.getFullYear() +
    '-' +
    String(
      yesterday.getMonth() + 1
    ).padStart(2, '0') +
    '-' +
    String(
      yesterday.getDate()
    ).padStart(2, '0');

  /*
   * Consecutive day:
   * increment the streak.
   *
   * Missed day:
   * start a new streak at 1.
   */
  const nextStreak =
    lastCompleted === yesterdayKey
      ? currentStreak + 1
      : 1;

  const best = await getBestStreak();

  await AsyncStorage.multiSet([
    [
      STREAK_KEY,
      String(nextStreak),
    ],
    [
      LAST_COMPLETED_KEY,
      todayKey,
    ],
    [
      BEST_STREAK_KEY,
      String(
        Math.max(
          best,
          nextStreak
        )
      ),
    ],
  ]);

  return nextStreak;
}