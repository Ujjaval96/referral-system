import express, { NextFunction, Request, Response, Router } from 'express';
import { authenticateJWT }  from '../../middleware/auth';
import UserController from './userController';
const router: Router = express.Router();
const user = new UserController();

router.post('/signup',user.signup);

router.post('/login',user.login);
router.get('/enable2FA',authenticateJWT,user.enable2FA)
router.post("/verifyOTP", authenticateJWT,user.verifyOTP);
router.get('/totalamount',authenticateJWT,user.totalamount);
router.post('/deposit',authenticateJWT,user.deposit);
// router.post('/send-verification-code',user.sendVerificationCode);
// router.post('/verify-forgot-otp', user.verifyForgotOtp);
export default router;
