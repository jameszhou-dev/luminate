import { Platform } from 'react-native';
import AppleHealthKit, { HealthInputOptions, HealthKitPermissions } from 'react-native-health';

// HealthKit is iOS only.
const IS_IOS = Platform.OS === 'ios';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [],
  },
};

let initialized = false;

async function ensureInit(): Promise<void> {
  if (!IS_IOS) throw new Error('HealthKit is only available on iOS.');
  if (initialized) return;
  await new Promise<void>((resolve, reject) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error) => {
      if (error) reject(new Error('HealthKit permission denied.'));
      else { initialized = true; resolve(); }
    });
  });
}

export type StepSample = { date: string; value: number };
export type HeartRateSample = { date: string; value: number };
export type SleepSample = { startDate: string; endDate: string; value: string };
export type WorkoutSample = {
  activityName: string;
  startDate: string;
  endDate: string;
  duration: number;
  calories: number;
  distance: number;
};

export async function getSteps(startDate: Date, endDate: Date): Promise<StepSample[]> {
  await ensureInit();
  return new Promise((resolve, reject) => {
    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      includeManuallyAdded: true,
    };
    AppleHealthKit.getDailyStepCountSamples(options, (error, results) => {
      if (error) reject(new Error(String(error)));
      else resolve(results.map((r) => ({ date: r.startDate, value: r.value })));
    });
  });
}

export async function getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
  await ensureInit();
  return new Promise((resolve, reject) => {
    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    AppleHealthKit.getHeartRateSamples(options, (error, results) => {
      if (error) reject(new Error(String(error)));
      else resolve(results.map((r) => ({ date: r.startDate, value: r.value })));
    });
  });
}

export async function getSleep(startDate: Date, endDate: Date): Promise<SleepSample[]> {
  await ensureInit();
  return new Promise((resolve, reject) => {
    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    AppleHealthKit.getSleepSamples(options, (error, results) => {
      if (error) reject(new Error(String(error)));
      else resolve(results.map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
        value: String(r.value),
      })));
    });
  });
}

export async function getWorkouts(startDate: Date, endDate: Date): Promise<WorkoutSample[]> {
  await ensureInit();
  return new Promise((resolve, reject) => {
    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    AppleHealthKit.getWorkouts(options, (error, results) => {
      if (error) reject(new Error(String(error)));
      else resolve((results as any[]).map((r) => ({
        activityName: r.activityName ?? r.activityType ?? 'Unknown',
        startDate: r.startDate,
        endDate: r.endDate,
        duration: r.duration ?? 0,
        calories: r.calories ?? r.totalEnergyBurned ?? 0,
        distance: r.distance ?? 0,
      })));
    });
  });
}
