import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '@/lib/supabase';

export const DELIVERY_LOCATION_TASK = 'chalega-delivery-location';

let webLocationSubscription: Location.LocationSubscription | null = null;

TaskManager.defineTask(DELIVERY_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[DELIVERY LOCATION]', error.message);
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | null)?.locations;
  const latest = locations?.[locations.length - 1];

  if (!latest) {
    return;
  }

  try {
    const { error: updateError } = await supabase.rpc(
      'update_delivery_partner_location',
      {
        p_latitude: latest.coords.latitude,
        p_longitude: latest.coords.longitude,
        p_accuracy_m: latest.coords.accuracy ?? null,
      },
    );

    if (updateError) {
      console.warn('[DELIVERY LOCATION] Upload failed:', updateError.message);
    }
  } catch (taskError) {
    console.warn('[DELIVERY LOCATION] Upload exception:', taskError);
  }
});

export async function stopDeliveryLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      webLocationSubscription?.remove();
    } catch (error) {
      console.warn('[DELIVERY LOCATION] Web watcher cleanup failed:', error);
    } finally {
      webLocationSubscription = null;
    }
    return;
  }

  try {
    if (await Location.hasStartedLocationUpdatesAsync(DELIVERY_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(DELIVERY_LOCATION_TASK);
    }
  } catch (error) {
    console.warn('[DELIVERY LOCATION] Stop failed:', error);
  }
}

export async function startDeliveryLocationTracking(): Promise<{
  backgroundEnabled: boolean;
}> {
  const foreground = await Location.requestForegroundPermissionsAsync();

  if (!foreground.granted) {
    throw new Error(
      'Location permission is required to go online for delivery jobs.',
    );
  }

  if (Platform.OS === 'web') {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });

    const { error: locationError } = await supabase.rpc(
      'update_delivery_partner_location',
      {
        p_latitude: current.coords.latitude,
        p_longitude: current.coords.longitude,
        p_accuracy_m: current.coords.accuracy ?? null,
      },
    );

    if (locationError) throw locationError;

    try {
      webLocationSubscription?.remove();
    } catch (error) {
      console.warn('[DELIVERY LOCATION] Web watcher replacement failed:', error);
    }
    webLocationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60_000,
        distanceInterval: 100,
      },
      async (location) => {
        try {
          await supabase.rpc('update_delivery_partner_location', {
            p_latitude: location.coords.latitude,
            p_longitude: location.coords.longitude,
            p_accuracy_m: location.coords.accuracy ?? null,
          });
        } catch (error) {
          console.warn('[DELIVERY LOCATION] Web upload failed:', error);
        }
      },
    );

    return { backgroundEnabled: false };
  }

  const background = await Location.requestBackgroundPermissionsAsync();

  if (!background.granted) {
    throw new Error(
      'Background location is required while you are online so Chalega can match jobs to your live position. Please allow background location in Settings.',
    );
  }

  const provider = await Location.getProviderStatusAsync();

  if (!provider.locationServicesEnabled) {
    throw new Error('Please turn on Location Services and try again.');
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    mayShowUserSettingsDialog: true,
  });

  const { error: locationError } = await supabase.rpc(
    'update_delivery_partner_location',
    {
      p_latitude: current.coords.latitude,
      p_longitude: current.coords.longitude,
      p_accuracy_m: current.coords.accuracy ?? null,
    },
  );

  if (locationError) {
    throw locationError;
  }

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
    DELIVERY_LOCATION_TASK,
  );

  if (!alreadyRunning) {
    await Location.startLocationUpdatesAsync(DELIVERY_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60_000,
      distanceInterval: 100,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Chalega Delivery',
        notificationBody: 'Live location is active while you are online.',
        notificationColor: '#06C7A5',
        killServiceOnDestroy: false,
      },
    });
  }

  return { backgroundEnabled: true };
}
