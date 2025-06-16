// Re-export store slices for easy imports
export * from './slices/auth';
export * from './slices/map';
export * from './slices/statistics';
export * from './utils';

// Legacy exports for backward compatibility
export { useAuth as useAuthContext } from './slices/auth';
export { useMap as useMapContext } from './slices/map';
export { useStatistics as useStatisticsContext } from './slices/statistics';
