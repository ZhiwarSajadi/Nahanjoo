import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseSetup';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserActivityLog {
  id?: string;
  userId: string;
  eventType: 'LOGIN' | 'ANALYSIS';
  timestamp: Date;
  details?: string;
  analysisData?: any;
}

export const logActivity = async (eventType: 'LOGIN' | 'ANALYSIS', details?: string, analysisData?: any) => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const docRef = await addDoc(collection(db, 'userActivityLogs'), {
      userId: user.uid,
      eventType,
      timestamp: serverTimestamp(),
      ...(details ? { details } : {}),
      ...(analysisData ? { analysisData } : {})
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'userActivityLogs');
    return null;
  }
};

export const updateActivityLogAnalysisData = async (logId: string, analysisData: any) => {
  try {
    const logRef = doc(db, 'userActivityLogs', logId);
    await updateDoc(logRef, { analysisData });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'userActivityLogs');
  }
};

export const getUserActivityLogs = async (): Promise<UserActivityLog[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, 'userActivityLogs'),
      where('userId', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        eventType: data.eventType,
        timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
        details: data.details,
        analysisData: data.analysisData,
      };
    });
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'userActivityLogs');
    return [];
  }
};
