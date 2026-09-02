import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  getPoints,
  getPointsHistory,
  type PointsTransaction,
} from '../lib/points';

import {
  formatLocalDateTime,
} from '../lib/date';

export default function PointsActivityScreen() {
  const router = useRouter();

  const [points, setPoints] =
    useState(0);

  const [history, setHistory] =
    useState<PointsTransaction[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  /*
   * ----------------------------------------------------
   * LOAD ACTIVITY
   * ----------------------------------------------------
   */
  const loadActivity =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          currentPoints,
          currentHistory,
        ] = await Promise.all([
          getPoints(),
          getPointsHistory(),
        ]);

        setPoints(
          currentPoints
        );

        setHistory(
          currentHistory
        );
      } catch (error) {
        console.log(
          'Could not load Chalega Points Activity:',
          error
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /*
   * ----------------------------------------------------
   * INITIAL LOAD
   * ----------------------------------------------------
   */
  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  /*
   * ----------------------------------------------------
   * REFRESH WHEN SCREEN OPENS
   * ----------------------------------------------------
   */
  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [loadActivity])
  );

  /*
   * ----------------------------------------------------
   * TOTAL EARNED
   * ----------------------------------------------------
   */
  const earnedPoints =
    history
      .filter(
        item =>
          item.amount > 0
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          item.amount,
        0
      );

  /*
   * ----------------------------------------------------
   * TOTAL SPENT
   * ----------------------------------------------------
   */
  const spentPoints =
    history
      .filter(
        item =>
          item.amount < 0
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Math.abs(
            item.amount
          ),
        0
      );

  /*
   * ----------------------------------------------------
   * LOADING SCREEN
   * ----------------------------------------------------
   */
  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.loading
          }
        >
          <Text
            style={
              styles.loadingEmoji
            }
          >
            ✨
          </Text>

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading your activity...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * ----------------------------------------------------
   * MAIN SCREEN
   * ----------------------------------------------------
   */
  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
            activeOpacity={
              0.8
            }
          >
            <Text
              style={
                styles.backText
              }
            >
              ‹
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.brand
              }
            >
              CHALEGA INDIA
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              Points Activity
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        {/* WALLET */}

        <View
          style={
            styles.walletCard
          }
        >
          <Text
            style={
              styles.walletLabel
            }
          >
            YOUR CHALEGA WALLET
          </Text>

          <Text
            style={
              styles.walletPoints
            }
          >
            {points}
          </Text>

          <Text
            style={
              styles.walletSub
            }
          >
            CHALEGA POINTS
          </Text>
        </View>

        {/* SUMMARY */}

        <View
          style={
            styles.summaryRow
          }
        >
          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryIcon
              }
            >
              ↗
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              EARNED
            </Text>

            <Text
              style={
                styles.earnedValue
              }
            >
              +{earnedPoints}
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryIcon
              }
            >
              ↘
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              SPENT
            </Text>

            <Text
              style={
                styles.spentValue
              }
            >
              −{spentPoints}
            </Text>
          </View>
        </View>

        {/* SECTION HEADER */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            ALL ACTIVITY
          </Text>

          <Text
            style={
              styles.activityCount
            }
          >
            {history.length}{' '}
            {history.length ===
            1
              ? 'transaction'
              : 'transactions'}
          </Text>
        </View>

        {/* ACTIVITY LIST */}

        <View
          style={
            styles.activityCard
          }
        >
          {history.length ===
          0 ? (
            <View
              style={
                styles.empty
              }
            >
              <Text
                style={
                  styles.emptyEmoji
                }
              >
                ✨
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No activity yet
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Complete a walking mission
                or healthy challenge and
                your Chalega Points activity
                will appear here.
              </Text>
            </View>
          ) : (
            history.map(
              (
                item,
                index
              ) => {
                const positive =
                  item.amount >
                  0;

                return (
                  <View
                    key={
                      item.id
                    }
                    style={[
                      styles.activityRow,
                      index ===
                        history.length -
                          1 &&
                        styles.lastActivityRow,
                    ]}
                  >
                    {/* ICON */}

                    <View
                      style={[
                        styles.activityIcon,
                        positive
                          ? styles.positiveIcon
                          : styles.negativeIcon,
                      ]}
                    >
                      <Text
                        style={[
                          styles.iconText,
                          positive
                            ? styles.positiveText
                            : styles.negativeText,
                        ]}
                      >
                        {positive
                          ? '↑'
                          : '↓'}
                      </Text>
                    </View>

                    {/* DETAILS */}

                    <View
                      style={
                        styles.activityMiddle
                      }
                    >
                      <Text
                        style={
                          styles.activityTitle
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {
                          item.title
                        }
                      </Text>

                      <Text
                        style={
                          styles.activityType
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {item.type.replace(
                          /_/g,
                          ' '
                        )}
                      </Text>

                      <Text
                        style={
                          styles.activityDescription
                        }
                      >
                        {
                          item.description
                        }
                      </Text>

                      <Text
                        style={
                          styles.activityDate
                        }
                      >
                        {formatLocalDateTime(
                          item.timestamp
                        )}
                      </Text>
                    </View>

                    {/* AMOUNT */}

                    <Text
                      style={[
                        styles.activityAmount,
                        positive
                          ? styles.positiveAmount
                          : styles.negativeAmount,
                      ]}
                    >
                      {positive
                        ? `+${item.amount}`
                        : `${item.amount}`}
                    </Text>
                  </View>
                );
              }
            )
          )}
        </View>

        {/* BACK BUTTON */}

        <TouchableOpacity
          style={
            styles.backToRewards
          }
          onPress={() =>
            router.back()
          }
          activeOpacity={
            0.85
          }
        >
          <Text
            style={
              styles.backToRewardsText
            }
          >
            ← BACK TO REWARDS
          </Text>
        </TouchableOpacity>

        {/* FOOTER */}

        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.footerBrand
            }
          >
            C H A L E G A  I N D I A
          </Text>

          <Text
            style={
              styles.footerText
            }
          >
            Chalo Health Banaye
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/*
 * ======================================================
 * STYLES
 * ======================================================
 */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F4F7FB',
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },

    header: {
      minHeight: 76,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 8,
    },

    backButton: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor:
        '#FFFFFF',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    backText: {
      color: '#1677FF',
      fontSize: 38,
      lineHeight: 42,
      fontWeight: '600',
      marginTop: -4,
    },

    headerCenter: {
      flex: 1,
      alignItems:
        'center',
    },

    headerSpacer: {
      width: 46,
    },

    brand: {
      color: '#1677FF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 4,
      marginBottom: 5,
    },

    headerTitle: {
      color: '#111111',
      fontSize: 25,
      fontWeight: '900',
    },

    walletCard: {
      backgroundColor:
        '#1677FF',
      borderRadius: 30,
      paddingVertical: 30,
      paddingHorizontal: 20,
      alignItems:
        'center',
      marginBottom: 16,
    },

    walletLabel: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: 8,
    },

    walletPoints: {
      color: '#FFFFFF',
      fontSize: 54,
      lineHeight: 60,
      fontWeight: '900',
    },

    walletSub: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
    },

    summaryRow: {
      flexDirection:
        'row',
      gap: 12,
      marginBottom: 28,
    },

    summaryCard: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
      borderRadius: 22,
      padding: 18,
      minHeight: 112,
    },

    summaryIcon: {
      color: '#1677FF',
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 5,
    },

    summaryLabel: {
      color: '#777777',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,
    },

    earnedValue: {
      color: '#168A43',
      fontSize: 22,
      fontWeight: '900',
      marginTop: 4,
    },

    spentValue: {
      color: '#D64545',
      fontSize: 22,
      fontWeight: '900',
      marginTop: 4,
    },

    sectionHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 12,
    },

    sectionTitle: {
      color: '#111111',
      fontSize: 19,
      fontWeight: '900',
    },

    activityCount: {
      color: '#1677FF',
      fontSize: 11,
      fontWeight: '800',
    },

    activityCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 24,
      paddingHorizontal: 16,
      overflow: 'hidden',
    },

    activityRow: {
      minHeight: 105,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingVertical: 17,
      borderBottomWidth: 1,
      borderBottomColor:
        '#E9EDF3',
    },

    lastActivityRow: {
      borderBottomWidth: 0,
    },

    activityIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 13,
    },

    positiveIcon: {
      backgroundColor:
        '#E9F8EF',
    },

    negativeIcon: {
      backgroundColor:
        '#FDEEEE',
    },

    iconText: {
      fontSize: 22,
      fontWeight: '900',
    },

    positiveText: {
      color: '#168A43',
    },

    negativeText: {
      color: '#D64545',
    },

    activityMiddle: {
      flex: 1,
      paddingRight: 10,
    },

    activityTitle: {
      color: '#111111',
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 3,
    },

    activityType: {
      color: '#777777',
      fontSize: 10,
      fontWeight: '700',
      textTransform:
        'capitalize',
      marginBottom: 2,
    },

    activityDescription: {
      color: '#8B8B8B',
      fontSize: 10,
      marginBottom: 4,
    },

    activityDate: {
      color: '#9A9A9A',
      fontSize: 10,
    },

    activityAmount: {
      fontSize: 15,
      fontWeight: '900',
      minWidth: 52,
      textAlign: 'right',
    },

    positiveAmount: {
      color: '#168A43',
    },

    negativeAmount: {
      color: '#D64545',
    },

    empty: {
      minHeight: 260,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 35,
      paddingVertical: 35,
    },

    emptyEmoji: {
      fontSize: 34,
      marginBottom: 12,
    },

    emptyTitle: {
      color: '#111111',
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 8,
    },

    emptyText: {
      color: '#777777',
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },

    backToRewards: {
      height: 56,
      borderRadius: 18,
      borderWidth: 2,
      borderColor:
        '#1677FF',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 20,
      backgroundColor:
        '#FFFFFF',
    },

    backToRewardsText: {
      color: '#1677FF',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.4,
    },

    footer: {
      alignItems:
        'center',
      paddingTop: 35,
    },

    footerBrand: {
      color: '#1677FF',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 5,
    },

    footerText: {
      color: '#888888',
      fontSize: 11,
      marginTop: 8,
    },

    loading: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 30,
    },

    loadingEmoji: {
      fontSize: 38,
      marginBottom: 12,
    },

    loadingTitle: {
      color: '#111111',
      fontSize: 18,
      fontWeight: '900',
    },
  });