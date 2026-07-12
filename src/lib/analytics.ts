import { db } from './firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

export async function logVisit() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Daily visits
    const docRef = doc(db, 'analytics_daily', today);
    await setDoc(docRef, { visits: increment(1), date: today }, { merge: true });
    
    // Total visits
    const totalRef = doc(db, 'analytics_counts', 'total');
    await setDoc(totalRef, { visits: increment(1) }, { merge: true });
  } catch (error) {
    console.error('Failed to log visit', error);
  }
}
