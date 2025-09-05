import express, { NextFunction, Request, Response, Router } from 'express';
import { authenticateJWT }  from '../../middleware/auth';
import UserController from './userController';
const router: Router = express.Router();
const user = new UserController();

router.post('/signup',user.signup);
router.post('/login',user.login);
router.get('/totalamount',authenticateJWT,user.totalamount)
router.post('/deposit',authenticateJWT,user.deposit)

export default router;
