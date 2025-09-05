import { JwtAuthPayload } from '../../utils/types';
export interface SignupPayload {
  name: string;
  email: string;
  password: string;
 referralId?: number;  
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface DepositPayload extends JwtAuthPayload {
  amount: number;
}



