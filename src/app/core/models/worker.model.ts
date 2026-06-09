export interface WorkerProfile {
  id: string;
  email: string;
  name: string;
  workerType: 'shopper' | 'driver';
  vehicleType?: 'bicycle' | 'motorcycle' | 'car';
  vehicleRegistration?: string;
  bankAccountRef: string;
  available: boolean;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  worker: WorkerProfile;
}

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  workerType: 'shopper' | 'driver';
  bankAccountRef: string;
  vehicleType?: 'bicycle' | 'motorcycle' | 'car';
  vehicleRegistration?: string;
}

export interface ProfileUpdate {
  name?: string;
  bankAccountRef?: string;
  vehicleType?: 'bicycle' | 'motorcycle' | 'car';
  vehicleRegistration?: string;
}
