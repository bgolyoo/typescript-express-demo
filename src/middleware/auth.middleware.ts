import RequestWithUser from '../interfaces/requestWithUser.interface';
import { NextFunction, RequestHandler, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import DataStoredInToken from '../interfaces/dataStoredInToken';
import userModel from '../users/user.model';
import WrongAuthenticationTokenException from '../exceptions/WrongAuthenticationTokenException';
import AuthenticationTokenMissingException from '../exceptions/AuthenticationTokenMissingException';

function authMiddleware(omitSecondFactor = false): RequestHandler {
  return async (request: RequestWithUser, response: Response, next: NextFunction) => {
    const cookies = request.cookies;
    if (cookies && cookies.Authorization) {
      const secret = process.env.JWT_SECRET;
      try {
        const verificationResponse = jwt.verify(cookies.Authorization, secret) as DataStoredInToken;
        const { _id: id, isSecondFactorAuthenticated } = verificationResponse;
        const user = await userModel.findById(id);
        if (user) {
          if (!omitSecondFactor && user.isTwoFactorAuthenticationEnabled && !isSecondFactorAuthenticated) {
            next(new WrongAuthenticationTokenException());
          } else {
            request.user = user;
            next();
          }
        } else {
          next(new WrongAuthenticationTokenException());
        }
      } catch (error) {
        next(new WrongAuthenticationTokenException());
      }
    } else {
      next(new AuthenticationTokenMissingException());
    }
  };
}

export default authMiddleware;
