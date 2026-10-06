import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { isPinConfigured } from '../services/securityService';

type AppLockContextValue = {
  userId: string;
  ready: boolean;
  statusError: boolean;
  hasPin: boolean;
  isLocked: boolean;
  retryStatusCheck: () => void;
  enableLock: () => void;
  disableLock: () => void;
  unlock: () => void;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let mounted = true;
    setReady(false);
    setStatusError(false);
    setHasPin(false);
    setIsLocked(false);

    void isPinConfigured(userId)
      .then((configured) => {
        if (!mounted) {
          return;
        }

        setHasPin(configured);
        // An existing lock is required again on every authenticated app launch.
        setIsLocked(configured);
        setReady(true);
      })
      .catch((error) => {
        console.error('App lock status check failed:', error);
        if (mounted) {
          setStatusError(true);
          setReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [retryCount, userId]);

  useEffect(() => {
    lastAppState.current = AppState.currentState;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = lastAppState.current;
      lastAppState.current = nextState;

      if (
        nextState === 'active' &&
        previousState !== 'active' &&
        ready &&
        hasPin
      ) {
        setIsLocked(true);
      }
    });

    return () => subscription.remove();
  }, [hasPin, ready]);

  const enableLock = useCallback(() => {
    setHasPin(true);
    setIsLocked(false);
  }, []);

  const disableLock = useCallback(() => {
    setHasPin(false);
    setIsLocked(false);
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const retryStatusCheck = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  return (
    <AppLockContext.Provider
      value={{
        userId,
        ready,
        statusError,
        hasPin,
        isLocked,
        retryStatusCheck,
        enableLock,
        disableLock,
        unlock,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used inside AppLockProvider.');
  }

  return context;
}