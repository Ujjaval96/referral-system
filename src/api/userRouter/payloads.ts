import { JwtAuthPayload } from '../../utils/types';
export interface SignupPayload {
  name: string;
  email: string;
  phone_number:string;
  password: string;
  referralCode?:  string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface DepositPayload extends JwtAuthPayload {
  amount: number;
}

export interface verifyOTPPayload extends JwtAuthPayload{
  token:string;
}


