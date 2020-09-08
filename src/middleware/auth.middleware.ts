import RequestWithUser from '../interfaces/requestWithUser.interface';
import { NextFunction, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import DataStoredInToken from '../interfaces/dataStoredInToken';
import WrongAuthenticationTokenException from '../exceptions/WrongAuthenticationTokenException';
import AuthenticationTokenMissingException from '../exceptions/AuthenticationTokenMissingException';
import { getRepository } from 'typeorm';
import User from '../users/user.entity';

async function authMiddleware(request: RequestWithUser, response: Response, next: NextFunction) {
  const cookies = request.cookies;
  if (cookies && cookies.Authorization) {
    const secret = process.env.JWT_SECRET;
    try {
      const verificationResponse = jwt.verify(cookies.Authorization, secret) as DataStoredInToken;
      const id = verificationResponse.id;
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({ id });
      if (user) {
        request.user = user;
        next();
      } else {
        next(new WrongAuthenticationTokenException());
      }
    } catch (error) {
      next(new WrongAuthenticationTokenException());
    }
  } else {
    next(new AuthenticationTokenMissingException());
  }
}

export default authMiddleware;
