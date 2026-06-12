import { Injectable } from '@angular/core';
import { Observable, from, throwError, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

import { environment } from '../../../environments/environment';
import { GigWorkerService } from './gig-worker.service';
import { Job, JobEvent, JobFilter, JobHistoryItem, PaginatedResult } from '../models/job.model';
import { AuthResult, ProfileUpdate, RegistrationData, WorkerProfile } from '../models/worker.model';
import { EarningsData, PerformanceData } from '../models/earnings.model';
import { PickItem, PickItemStatus, SubstitutionProposal, SubstitutionResponse } from '../models/picklist.model';

@Injectable()
export class GigWorkerFirebaseService implements GigWorkerService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly db: Firestore;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
  }

  // --- Auth ---

  login(email: string, password: string): Observable<AuthResult> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((credential) =>
        from(credential.user.getIdToken()).pipe(
          switchMap((idToken) => {
            const uid = credential.user.uid;
            const workerDocRef = doc(this.db, 'gig_workers', uid);
            return from(getDoc(workerDocRef)).pipe(
              switchMap((docSnap) => {
                if (!docSnap.exists()) {
                  // Profile doc might not exist yet — create a minimal one
                  const minimalProfile: DocumentData = {
                    email: credential.user.email || email,
                    name: credential.user.displayName || email.split('@')[0],
                    workerType: 'shopper',
                    bankAccountRef: '',
                    available: false,
                    createdAt: Timestamp.now(),
                  };
                  return from(setDoc(workerDocRef, minimalProfile)).pipe(
                    map(() => {
                      const worker = this.mapWorkerProfile(uid, minimalProfile);
                      return { token: idToken, worker } as AuthResult;
                    })
                  );
                }
                const data = docSnap.data();
                const worker = this.mapWorkerProfile(uid, data);
                return of({ token: idToken, worker } as AuthResult);
              })
            );
          })
        )
      ),
      catchError(this.handleFirebaseError)
    );
  }

  register(data: RegistrationData): Observable<AuthResult> {
    return from(createUserWithEmailAndPassword(this.auth, data.email, data.password)).pipe(
      switchMap((credential) =>
        from(credential.user.getIdToken()).pipe(
          switchMap((idToken) => {
            const uid = credential.user.uid;
            const workerDocRef = doc(this.db, 'gig_workers', uid);
            const workerData: DocumentData = {
              email: data.email,
              name: data.name,
              workerType: data.workerType,
              bankAccountRef: data.bankAccountRef,
              available: false,
              createdAt: Timestamp.now(),
            };

            if (data.workerType === 'driver') {
              workerData['vehicleType'] = data.vehicleType || null;
              workerData['vehicleRegistration'] = data.vehicleRegistration || null;
            }

            return from(setDoc(workerDocRef, workerData)).pipe(
              map(() => {
                const worker: WorkerProfile = {
                  id: uid,
                  email: data.email,
                  name: data.name,
                  workerType: data.workerType,
                  bankAccountRef: data.bankAccountRef,
                  available: false,
                  createdAt: new Date().toISOString(),
                  ...(data.workerType === 'driver'
                    ? {
                        vehicleType: data.vehicleType,
                        vehicleRegistration: data.vehicleRegistration,
                      }
                    : {}),
                };
                return { token: idToken, worker } as AuthResult;
              })
            );
          })
        )
      ),
      catchError(this.handleFirebaseError)
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  // --- Profile ---

  getProfile(): Observable<WorkerProfile> {
    return this.withCurrentUser((uid) => {
      const workerDocRef = doc(this.db, 'gig_workers', uid);
      return from(getDoc(workerDocRef)).pipe(
        map((docSnap) => {
          if (!docSnap.exists()) {
            throw new Error('Worker profile not found');
          }
          return this.mapWorkerProfile(uid, docSnap.data());
        })
      );
    });
  }

  updateProfile(data: ProfileUpdate): Observable<WorkerProfile> {
    return this.withCurrentUser((uid) => {
      const workerDocRef = doc(this.db, 'gig_workers', uid);
      const updateData: DocumentData = {};

      if (data.name !== undefined) updateData['name'] = data.name;
      if (data.bankAccountRef !== undefined) updateData['bankAccountRef'] = data.bankAccountRef;
      if (data.vehicleType !== undefined) updateData['vehicleType'] = data.vehicleType;
      if (data.vehicleRegistration !== undefined) updateData['vehicleRegistration'] = data.vehicleRegistration;

      return from(updateDoc(workerDocRef, updateData)).pipe(
        switchMap(() => from(getDoc(workerDocRef))),
        map((docSnap) => {
          if (!docSnap.exists()) {
            throw new Error('Worker profile not found');
          }
          return this.mapWorkerProfile(uid, docSnap.data());
        })
      );
    });
  }

  // --- Availability ---

  getAvailability(): Observable<boolean> {
    return this.withCurrentUser((uid) => {
      const workerDocRef = doc(this.db, 'gig_workers', uid);
      return from(getDoc(workerDocRef)).pipe(
        map((docSnap) => {
          if (!docSnap.exists()) {
            return false;
          }
          return docSnap.data()['available'] === true;
        })
      );
    });
  }

  setAvailability(available: boolean): Observable<void> {
    return this.withCurrentUser((uid) => {
      const workerDocRef = doc(this.db, 'gig_workers', uid);
      return from(updateDoc(workerDocRef, { available }));
    });
  }

  // --- Jobs ---

  getAvailableJobs(filter?: JobFilter): Observable<Job[]> {
    return this.withCurrentUser((_uid) => {
      const jobsRef = collection(this.db, 'jobs');
      const constraints: any[] = [where('status', '==', 'pending')];

      if (filter && filter !== 'all') {
        constraints.push(where('jobType', '==', filter));
      }

      const q = query(jobsRef, ...constraints);

      return from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map((docSnap) => this.mapJob(docSnap.id, docSnap.data()))
        )
      );
    });
  }

  acceptJob(jobId: string): Observable<Job> {
    return this.withCurrentUser((uid) => {
      const jobDocRef = doc(this.db, 'jobs', jobId);
      return from(getDoc(jobDocRef)).pipe(
        switchMap((docSnap) => {
          if (!docSnap.exists()) {
            return throwError(() => ({ status: 404, message: 'Job not found' }));
          }
          const data = docSnap.data();
          if (data['status'] !== 'pending') {
            return throwError(() => ({ status: 409, message: 'This job is no longer available.' }));
          }

          // Get worker name for order assignment display
          const workerDocRef = doc(this.db, 'gig_workers', uid);
          return from(getDoc(workerDocRef)).pipe(
            switchMap((workerSnap) => {
              const workerName = workerSnap.exists() ? (workerSnap.data()['name'] || 'Worker') : 'Worker';

              return from(
                updateDoc(jobDocRef, {
                  status: 'assigned',
                  assignedWorkerId: uid,
                  assignedWorkerName: workerName,
                  assignedAt: Timestamp.now(),
                })
              ).pipe(
                switchMap(() => from(getDoc(jobDocRef))),
                map((updatedSnap) => {
                  const jobData = updatedSnap.data()!;
                  const orderId = jobData['orderId'];
                  const jobType = jobData['jobType'];

                  // Propagate status + worker assignment to orders
                  const newOrderStatus = jobType === 'driver' ? 'in_delivery' : 'being_picked';
                  const workerField = jobType === 'driver' ? 'driverName' : 'shopperName';

                  if (orderId) {
                    const ordersRef = collection(this.db, 'orders');
                    const orderQuery = query(ordersRef, where('parentOrderId', '==', orderId));
                    getDocs(orderQuery).then(snapshot => {
                      if (!snapshot.empty) {
                        snapshot.docs.forEach(d => {
                          updateDoc(doc(this.db, 'orders', d.id), {
                            status: newOrderStatus,
                            [workerField]: workerName,
                          });
                        });
                      } else {
                        // Single-store order — direct update
                        updateDoc(doc(this.db, 'orders', orderId), {
                          status: newOrderStatus,
                          [workerField]: workerName,
                        }).catch(() => {});
                      }
                    });
                  }
                  return this.mapJob(jobId, jobData);
                })
              );
            })
          );
        })
      );
    });
  }

  // --- Active Job ---

  getActiveJob(): Observable<Job | null> {
    return this.withCurrentUser((uid) => {
      const jobsRef = collection(this.db, 'jobs');
      // Simple query — just get all jobs assigned to this worker
      const q = query(
        jobsRef,
        where('assignedWorkerId', '==', uid),
        limit(10)
      );

      return from(getDocs(q)).pipe(
        map((snapshot) => {
          if (snapshot.empty) {
            return null;
          }
          // Filter client-side for active statuses
          const activeStatuses = ['assigned', 'being_picked', 'picked', 'in_delivery'];
          const activeDoc = snapshot.docs.find(d => activeStatuses.includes(d.data()['status']));
          if (!activeDoc) return null;
          return this.mapJob(activeDoc.id, activeDoc.data());
        })
      );
    });
  }

  getPicklist(orderId: string): Observable<PickItem[]> {
    return this.withCurrentUser((_uid) => {
      const jobsRef = collection(this.db, 'jobs');
      const q = query(jobsRef, where('orderId', '==', orderId), limit(1));

      return from(getDocs(q)).pipe(
        switchMap((jobSnapshot) => {
          if (jobSnapshot.empty) {
            return of([]);
          }
          const jobId = jobSnapshot.docs[0].id;
          const picklistRef = collection(this.db, 'jobs', jobId, 'picklist');
          return from(getDocs(picklistRef)).pipe(
            switchMap((snapshot) => {
              // If the picklist subcollection has items, use them
              if (!snapshot.empty) {
                return of(
                  snapshot.docs.map((docSnap) => this.mapPickItem(docSnap.id, docSnap.data()))
                );
              }

              // Fallback 1: try reading from direct order document
              return from(getDoc(doc(this.db, 'orders', orderId))).pipe(
                switchMap((orderSnap) => {
                  if (orderSnap.exists()) {
                    const orderData = orderSnap.data();
                    const items: any[] = orderData['items'] || [];
                    if (items.length > 0) {
                      return of(items.map((item, index) => ({
                        id: item.productId || `item_${index}`,
                        productName: item.name || item.productName || 'Unknown Item',
                        brand: item.brand || '',
                        size: item.size || '',
                        imageUrl: item.imageUrl || '',
                        quantity: item.quantity || 1,
                        status: 'pending' as const,
                        checkedAt: undefined,
                      })));
                    }
                  }

                  // Fallback 2: query sub-orders by parentOrderId and merge items
                  const ordersRef = collection(this.db, 'orders');
                  const subQ = query(ordersRef, where('parentOrderId', '==', orderId));
                  return from(getDocs(subQ)).pipe(
                    map((subSnap) => {
                      const allItems: PickItem[] = [];
                      subSnap.docs.forEach(d => {
                        const data = d.data();
                        const items: any[] = data['items'] || [];
                        items.forEach((item, index) => {
                          allItems.push({
                            id: item.productId || `item_${d.id}_${index}`,
                            productName: item.name || item.productName || 'Unknown Item',
                            brand: item.brand || '',
                            size: item.size || '',
                            imageUrl: item.imageUrl || '',
                            quantity: item.quantity || 1,
                            status: 'pending' as const,
                            checkedAt: undefined,
                          });
                        });
                      });
                      return allItems;
                    })
                  );
                })
              );
            })
          );
        })
      );
    });
  }

  updatePickItemStatus(orderId: string, itemId: string, status: PickItemStatus): Observable<void> {
    return this.withCurrentUser((_uid) => {
      const jobsRef = collection(this.db, 'jobs');
      const q = query(jobsRef, where('orderId', '==', orderId), limit(1));

      return from(getDocs(q)).pipe(
        switchMap((jobSnapshot) => {
          if (jobSnapshot.empty) {
            return throwError(() => ({ status: 404, message: 'Job not found for order' }));
          }
          const jobId = jobSnapshot.docs[0].id;
          const itemRef = doc(this.db, 'jobs', jobId, 'picklist', itemId);
          const updateData: DocumentData = { status };
          if (status === 'picked') {
            updateData['checkedAt'] = Timestamp.now();
          }
          // Use setDoc with merge to handle cases where the picklist subcollection
          // doc doesn't exist yet (fallback from order items)
          return from(setDoc(itemRef, updateData, { merge: true }));
        })
      );
    });
  }

  markAllPicked(jobId: string): Observable<void> {
    return this.withCurrentUser((_uid) => {
      const jobDocRef = doc(this.db, 'jobs', jobId);
      return from(getDoc(jobDocRef)).pipe(
        switchMap((jobSnap) => {
          const jobData = jobSnap.exists() ? jobSnap.data() : null;

          // Update the shopper job to 'picked'
          return from(updateDoc(jobDocRef, { status: 'picked' })).pipe(
            switchMap(() => {
              // If this is a shopper job, create a corresponding driver job
              if (jobData && jobData['jobType'] === 'shopper') {
                const orderId = jobData['orderId'] || '';

                // Fetch deliveryPin from the order
                const ordersRef = collection(this.db, 'orders');
                const orderQuery = query(ordersRef, where('parentOrderId', '==', orderId), limit(1));
                return from(getDocs(orderQuery)).pipe(
                  switchMap((orderSnap) => {
                    let deliveryPin = '';
                    if (!orderSnap.empty) {
                      deliveryPin = orderSnap.docs[0].data()['deliveryPin'] || '';
                    } else {
                      // Try direct order doc
                      return from(getDoc(doc(this.db, 'orders', orderId))).pipe(
                        switchMap((directOrder) => {
                          if (directOrder.exists()) {
                            deliveryPin = directOrder.data()['deliveryPin'] || '';
                          }
                          return this.createDriverJob(orderId, jobData, deliveryPin);
                        })
                      );
                    }
                    return this.createDriverJob(orderId, jobData, deliveryPin);
                  })
                );
              }
              return of(undefined);
            }),
            map(() => undefined as void)
          );
        })
      );
    });
  }

  private createDriverJob(orderId: string, shopperJobData: DocumentData, deliveryPin: string): Observable<void> {
    const driverJobId = `job_${orderId}_driver`;
    const driverJob: DocumentData = {
      orderId,
      storeId: shopperJobData['storeId'] || '',
      storeName: shopperJobData['storeName'] || '',
      jobType: 'driver',
      status: 'pending',
      storeLatitude: shopperJobData['storeLatitude'] || 0,
      storeLongitude: shopperJobData['storeLongitude'] || 0,
      itemCount: shopperJobData['itemCount'] || 0,
      estimatedPay: Math.max(30, (shopperJobData['itemCount'] || 1) * 4),
      customerAddress: shopperJobData['customerAddress'] || '',
      customerPhone: shopperJobData['customerPhone'] || '',
      deliveryPin,
      createdAt: Timestamp.now(),
    };
    const driverJobRef = doc(this.db, 'jobs', driverJobId);
    return from(setDoc(driverJobRef, driverJob)).pipe(map(() => undefined as void));
  }

  completeDelivery(orderId: string): Observable<void> {
    return this.withCurrentUser((uid) => {
      const jobsRef = collection(this.db, 'jobs');
      // Query for the driver job specifically (assigned to this worker, for this order)
      const q = query(
        jobsRef,
        where('orderId', '==', orderId),
        where('jobType', '==', 'driver'),
        limit(1)
      );

      return from(getDocs(q)).pipe(
        switchMap((jobSnapshot) => {
          let jobDocRef;
          if (jobSnapshot.empty) {
            // Fallback: try finding any job assigned to this worker for this order
            const fallbackQ = query(jobsRef, where('orderId', '==', orderId), where('assignedWorkerId', '==', uid), limit(1));
            return from(getDocs(fallbackQ)).pipe(
              switchMap((fallbackSnap) => {
                if (fallbackSnap.empty) {
                  return throwError(() => ({ status: 404, message: 'Job not found for order' }));
                }
                return this.doCompleteDelivery(fallbackSnap.docs[0].id, orderId);
              })
            );
          }
          return this.doCompleteDelivery(jobSnapshot.docs[0].id, orderId);
        })
      );
    });
  }

  private doCompleteDelivery(jobId: string, orderId: string): Observable<void> {
    const jobDocRef = doc(this.db, 'jobs', jobId);
    return from(
      updateDoc(jobDocRef, {
        status: 'delivered',
        completedAt: Timestamp.now(),
      })
    ).pipe(
      switchMap(() => {
        // Also mark the shopper job as delivered
        const shopperJobId = `job_${orderId}_shopper`;
        updateDoc(doc(this.db, 'jobs', shopperJobId), { status: 'delivered', completedAt: Timestamp.now() }).catch(() => {});

        // Update all sub-orders with this parentOrderId to 'delivered'
        const ordersRef = collection(this.db, 'orders');
        const orderQuery = query(ordersRef, where('parentOrderId', '==', orderId));
        return from(getDocs(orderQuery)).pipe(
          switchMap((orderSnapshot) => {
            if (orderSnapshot.empty) {
              // Try direct update (single-store order where orderId IS the doc ID)
              return from(updateDoc(doc(this.db, 'orders', orderId), { status: 'delivered' }).catch(() => {}));
            }
            // Update all sub-orders
            const updates = orderSnapshot.docs.map(d =>
              updateDoc(doc(this.db, 'orders', d.id), { status: 'delivered' })
            );
            return from(Promise.all(updates).then(() => {}));
          })
        );
      })
    );
  }

  cancelActiveJob(jobId: string): Observable<void> {
    return this.withCurrentUser((_uid) => {
      const jobDocRef = doc(this.db, 'jobs', jobId);
      return from(
        updateDoc(jobDocRef, {
          status: 'cancelled',
          cancelledAt: Timestamp.now(),
        })
      );
    });
  }

  // --- Substitution ---

  proposeSubstitution(orderId: string, itemId: string, sub: SubstitutionProposal): Observable<void> {
    return this.withCurrentUser((_uid) => {
      const jobsRef = collection(this.db, 'jobs');
      const q = query(jobsRef, where('orderId', '==', orderId), limit(1));

      return from(getDocs(q)).pipe(
        switchMap((jobSnapshot) => {
          if (jobSnapshot.empty) {
            return throwError(() => ({ status: 404, message: 'Job not found for order' }));
          }
          const jobId = jobSnapshot.docs[0].id;
          const subRef = doc(collection(this.db, 'jobs', jobId, 'substitutions'));
          const subData: DocumentData = {
            originalItemId: itemId,
            substituteName: sub.substituteName,
            substituteQuantity: sub.substituteQuantity,
            reason: sub.reason,
            status: 'pending',
            proposedAt: Timestamp.now(),
            timeoutAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)),
          };
          return from(setDoc(subRef, subData));
        })
      );
    });
  }

  cancelSubstitution(orderId: string, itemId: string): Observable<void> {
    return this.withCurrentUser((_uid) => {
      const jobsRef = collection(this.db, 'jobs');
      const q = query(jobsRef, where('orderId', '==', orderId), limit(1));

      return from(getDocs(q)).pipe(
        switchMap((jobSnapshot) => {
          if (jobSnapshot.empty) {
            return throwError(() => ({ status: 404, message: 'Job not found for order' }));
          }
          const jobId = jobSnapshot.docs[0].id;
          const subsRef = collection(this.db, 'jobs', jobId, 'substitutions');
          const subQuery = query(
            subsRef,
            where('originalItemId', '==', itemId),
            where('status', '==', 'pending'),
            limit(1)
          );
          return from(getDocs(subQuery)).pipe(
            switchMap((subSnapshot) => {
              if (subSnapshot.empty) {
                return throwError(() => ({ status: 404, message: 'No pending substitution found' }));
              }
              const subDocRef = subSnapshot.docs[0].ref;
              return from(updateDoc(subDocRef, { status: 'cancelled' }));
            })
          );
        })
      );
    });
  }

  // --- Earnings ---

  getEarnings(): Observable<EarningsData> {
    return this.withCurrentUser((uid) => {
      const earningsRef = collection(this.db, 'earnings');
      const q = query(earningsRef, where('workerId', '==', uid));

      return from(getDocs(q)).pipe(
        map((snapshot) => {
          const earnings = snapshot.docs.map((docSnap) => docSnap.data());
          return this.buildEarningsData(earnings);
        })
      );
    });
  }

  // --- History & Performance ---

  getJobHistory(page: number, pageSize: number): Observable<PaginatedResult<JobHistoryItem>> {
    return this.withCurrentUser((uid) => {
      const jobsRef = collection(this.db, 'jobs');
      const q = query(
        jobsRef,
        where('assignedWorkerId', '==', uid),
        where('status', '==', 'delivered'),
        orderBy('completedAt', 'desc'),
        limit(pageSize + 1)
      );

      return from(getDocs(q)).pipe(
        map((snapshot) => {
          const docs = snapshot.docs;
          const hasMore = docs.length > pageSize;
          const items: JobHistoryItem[] = docs
            .slice(0, pageSize)
            .map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                orderId: data['orderId'] || '',
                orderNumber: data['orderNumber'] || data['orderId'] || '',
                jobType: data['jobType'] as 'shopper' | 'driver',
                storeName: data['storeName'] || '',
                completedAt: data['completedAt']
                  ? (data['completedAt'] as Timestamp).toDate().toISOString()
                  : '',
                earnedAmount: data['estimatedPay'] || 0,
              };
            });

          return {
            items,
            total: -1, // Firestore doesn't provide total count efficiently
            page,
            pageSize,
            hasMore,
          };
        })
      );
    });
  }

  getPerformance(): Observable<PerformanceData> {
    return this.withCurrentUser((uid) => {
      const ratingsRef = collection(this.db, 'gig_workers', uid, 'ratings');
      const ratingsQuery = query(ratingsRef, orderBy('createdAt', 'desc'), limit(10));

      const jobsRef = collection(this.db, 'jobs');
      const completedQuery = query(
        jobsRef,
        where('assignedWorkerId', '==', uid),
        where('status', '==', 'delivered')
      );

      return from(getDocs(ratingsQuery)).pipe(
        switchMap((ratingsSnapshot) =>
          from(getDocs(completedQuery)).pipe(
            map((jobsSnapshot) => {
              const reviews = ratingsSnapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                  rating: data['rating'] as number,
                  reviewText: data['reviewText'] || undefined,
                  createdAt: data['createdAt']
                    ? (data['createdAt'] as Timestamp).toDate().toISOString()
                    : new Date().toISOString(),
                };
              });

              const allRatings = ratingsSnapshot.docs.map(
                (docSnap) => docSnap.data()['rating'] as number
              );
              const totalRatings = allRatings.length;
              const overallRating =
                totalRatings > 0
                  ? allRatings.reduce((sum, r) => sum + r, 0) / totalRatings
                  : 0;

              const totalJobsCompleted = jobsSnapshot.size;
              const acceptanceRate = totalJobsCompleted > 0 ? 100 : 0;

              let currentTier: 'gold' | 'silver' | 'bronze' = 'bronze';
              if (overallRating >= 4.8) {
                currentTier = 'gold';
              } else if (overallRating >= 4.5) {
                currentTier = 'silver';
              }

              return {
                overallRating,
                totalRatings,
                totalJobsCompleted,
                acceptanceRate,
                currentTier,
                recentReviews: reviews,
              } as PerformanceData;
            })
          )
        )
      );
    });
  }

  // --- Real-time Subscriptions ---

  subscribeToJobUpdates(): Observable<JobEvent> {
    return new Observable<JobEvent>((subscriber) => {
      const jobsRef = collection(this.db, 'jobs');
      const q = query(jobsRef, where('status', '==', 'pending'));

      let previousJobIds = new Set<string>();

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const currentJobIds = new Set<string>();
          snapshot.docs.forEach((docSnap) => currentJobIds.add(docSnap.id));

          // Detect newly added jobs
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              subscriber.next({
                type: 'job_available',
                payload: {
                  jobId: change.doc.id,
                  jobType: data['jobType'] as 'shopper' | 'driver',
                  storeName: data['storeName'] || '',
                  storeLatitude: data['storeLatitude'] || 0,
                  storeLongitude: data['storeLongitude'] || 0,
                  itemCount: data['itemCount'] || 0,
                  estimatedPay: data['estimatedPay'] || 0,
                },
              });
            } else if (change.type === 'removed') {
              // Job was taken (status changed from pending)
              subscriber.next({
                type: 'job_taken',
                payload: { jobId: change.doc.id },
              });
            }
          });

          previousJobIds = currentJobIds;
        },
        (error) => {
          subscriber.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  subscribeToSubstitutionResponses(): Observable<SubstitutionResponse> {
    return new Observable<SubstitutionResponse>((subscriber) => {
      const user = this.auth.currentUser;
      if (!user) {
        subscriber.error(new Error('User not authenticated'));
        return;
      }

      const uid = user.uid;
      const jobsRef = collection(this.db, 'jobs');
      const activeStatuses = ['assigned', 'being_picked', 'picked', 'in_delivery'];
      const q = query(
        jobsRef,
        where('assignedWorkerId', '==', uid),
        where('status', 'in', activeStatuses),
        limit(1)
      );

      let subsUnsubscribe: (() => void) | null = null;

      const jobsUnsubscribe = onSnapshot(
        q,
        (jobSnapshot) => {
          // Clean up previous subscription
          if (subsUnsubscribe) {
            subsUnsubscribe();
            subsUnsubscribe = null;
          }

          if (jobSnapshot.empty) {
            return;
          }

          const jobDoc = jobSnapshot.docs[0];
          const jobData = jobDoc.data();
          const orderId = jobData['orderId'] || '';
          const subsRef = collection(this.db, 'jobs', jobDoc.id, 'substitutions');
          const subsQuery = query(subsRef, where('status', 'in', ['approved', 'rejected', 'timed_out']));

          subsUnsubscribe = onSnapshot(
            subsQuery,
            (subsSnapshot) => {
              subsSnapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                  const data = change.doc.data();
                  subscriber.next({
                    orderId,
                    itemId: data['originalItemId'] || '',
                    approved: data['status'] === 'approved',
                    substituteName: data['substituteName'] || undefined,
                    substituteQuantity: data['substituteQuantity'] || undefined,
                  });
                }
              });
            },
            (error) => {
              subscriber.error(error);
            }
          );
        },
        (error) => {
          subscriber.error(error);
        }
      );

      return () => {
        jobsUnsubscribe();
        if (subsUnsubscribe) {
          subsUnsubscribe();
        }
      };
    });
  }

  // --- Private Helpers ---

  private withCurrentUser<T>(fn: (uid: string) => Observable<T>): Observable<T> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ status: 401, message: 'User not authenticated' }));
    }
    return fn(user.uid);
  }

  private mapWorkerProfile(uid: string, data: DocumentData): WorkerProfile {
    return {
      id: uid,
      email: data['email'] || '',
      name: data['name'] || '',
      workerType: data['workerType'] as 'shopper' | 'driver',
      vehicleType: data['vehicleType'] || undefined,
      vehicleRegistration: data['vehicleRegistration'] || undefined,
      bankAccountRef: data['bankAccountRef'] || '',
      available: data['available'] === true,
      createdAt: data['createdAt']
        ? (data['createdAt'] as Timestamp).toDate().toISOString()
        : new Date().toISOString(),
    };
  }

  private mapJob(id: string, data: DocumentData): Job {
    return {
      id,
      orderId: data['orderId'] || '',
      storeId: data['storeId'] || '',
      jobType: data['jobType'] as 'shopper' | 'driver',
      status: data['status'] || '',
      storeName: data['storeName'] || '',
      storeLatitude: data['storeLatitude'] || 0,
      storeLongitude: data['storeLongitude'] || 0,
      itemCount: data['itemCount'] || 0,
      estimatedPay: data['estimatedPay'] || 0,
      distance: data['distance'] || undefined,
      customerAddress: data['customerAddress'] || undefined,
      customerPhone: data['customerPhone'] || undefined,
      createdAt: this.parseTimestamp(data['createdAt']),
    };
  }

  /**
   * Safely parse a Firestore Timestamp or ISO string to an ISO string.
   * Handles both Firestore Timestamp objects (with .toDate()) and plain strings.
   */
  private parseTimestamp(value: any): string {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') return value;
    if (value.toDate && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    return new Date().toISOString();
  }

  private mapPickItem(id: string, data: DocumentData): PickItem {
    return {
      id,
      productName: data['productName'] || '',
      brand: data['brand'] || '',
      size: data['size'] || '',
      imageUrl: data['imageUrl'] || '',
      quantity: data['quantity'] || 1,
      status: data['status'] || 'pending',
      checkedAt: data['checkedAt']
        ? this.parseTimestamp(data['checkedAt'])
        : undefined,
    };
  }

  private buildEarningsData(earnings: DocumentData[]): EarningsData {
    const now = new Date();
    const startOfWeek = this.getStartOfWeek(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let weeklyEarnings = 0;
    let monthlyEarnings = 0;
    let jobsCompletedThisWeek = 0;

    earnings.forEach((e) => {
      const earnedAt = e['earnedAt'] ? (e['earnedAt'] as Timestamp).toDate() : new Date(0);
      const amount = e['amount'] || 0;

      if (earnedAt >= startOfMonth) {
        monthlyEarnings += amount;
      }
      if (earnedAt >= startOfWeek) {
        weeklyEarnings += amount;
        jobsCompletedThisWeek++;
      }
    });

    const recentSettlements = this.buildRecentSettlements(earnings);

    return {
      weeklyEarnings,
      monthlyEarnings,
      jobsCompletedThisWeek,
      workerRating: 0, // Would need separate query for ratings
      recentSettlements,
      bankAccountRefMasked: '****',
    };
  }

  private buildRecentSettlements(earnings: DocumentData[]): { day: string; amount: number }[] {
    const days: { day: string; amount: number }[] = [];
    const dayLabels = ['Today', 'Yesterday', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

      let dayAmount = 0;
      earnings.forEach((e) => {
        const earnedAt = e['earnedAt'] ? (e['earnedAt'] as Timestamp).toDate() : new Date(0);
        if (earnedAt >= dateStart && earnedAt < dateEnd && e['status'] === 'settled') {
          dayAmount += e['amount'] || 0;
        }
      });

      let label: string;
      if (i === 0) {
        label = 'Today';
      } else if (i === 1) {
        label = 'Yesterday';
      } else {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        label = dayNames[dateStart.getDay()];
      }

      days.push({ day: label, amount: dayAmount });
    }

    return days;
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  private handleFirebaseError(error: any): Observable<never> {
    let message = 'An unexpected error occurred';
    let status = 500;

    if (error?.code) {
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          message = 'The email or password is incorrect.';
          status = 401;
          break;
        case 'auth/email-already-in-use':
          message = 'This email is already registered.';
          status = 409;
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          status = 429;
          break;
        case 'auth/network-request-failed':
          message = 'Unable to connect. Please check your network connection.';
          status = 0;
          break;
        default:
          message = error.message || message;
      }
    } else if (error?.message) {
      message = error.message;
    }

    return throwError(() => ({ status, message, originalError: error }));
  }
}
