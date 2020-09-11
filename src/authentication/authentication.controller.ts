import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as mongoose from 'mongoose';
import Controller from '../interfaces/controller.interface';
import validationMiddleware from '../middleware/validation.middleware';
import userModel from '../users/user.model';
import LogInDto from './login.dto';
import WrongCredentialsException from '../exceptions/WrongCredentialsException';
import UserWithThatEmailAlreadyExistsException from '../exceptions/UserWithThatEmailAlreadyExistsException';
import CreateUserDto from '../users/user.dto';
import User from '../users/user.interface';
import TokenData from '../interfaces/tokenData.interface';
import DataStoredInToken from '../interfaces/dataStoredInToken';
import authMiddleware from '../middleware/auth.middleware';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import WrongAuthenticationTokenException from '../exceptions/WrongAuthenticationTokenException';
import TwoFactorAuthenticationDto from './TwoFactorAuthentication.dto';

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private user = userModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationMiddleware(CreateUserDto), this.registration);
    this.router.post(`${this.path}/login`, validationMiddleware(LogInDto), this.loggingIn);
    this.router.post(`${this.path}/logout`, this.loggingOut);
    this.router.post(`${this.path}/2fa/generate`, authMiddleware(), this.generateTwoFactorAuthenticationCode);
    this.router.post(`${this.path}/2fa/turn-on`, validationMiddleware(TwoFactorAuthenticationDto), authMiddleware(), this.turnOnTwoFactorAuthentication);
    this.router.post(`${this.path}/2fa/authenticate`, validationMiddleware(TwoFactorAuthenticationDto), authMiddleware(true), this.secondFactorAuthentication);
  }

  private registration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const userData: CreateUserDto = request.body;
    if (await this.user.findOne({ email: userData.email })) {
      next(new UserWithThatEmailAlreadyExistsException(userData.email));
    } else {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await this.user.create({
        ...userData,
        password: hashedPassword
      });
      user.password = undefined;
      const tokenData = this.createToken(user);
      response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
      response.send(user);
    }
  };

  private loggingIn = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const logInData: LogInDto = request.body;
    const user = await this.user.findOne({ email: logInData.email });
    if (user) {
      const isPasswordMatching = await bcrypt.compare(logInData.password, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        user.twoFactorAuthenticationCode = undefined;
        const tokenData = this.createToken(user);
        response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
        if (user.isTwoFactorAuthenticationEnabled) {
          response.send({
            isTwoFactorAuthenticationEnabled: true
          });
        } else {
          response.send(user);
        }
      } else {
        next(new WrongCredentialsException());
      }
    } else {
      next(new WrongCredentialsException());
    }
  };

  private loggingOut = (request: express.Request, response: express.Response) => {
    response.setHeader('Set-Cookie', ['Authorization=;Max-age=0;Path=/']);
    response.sendStatus(200);
  };

  private generateTwoFactorAuthenticationCode = async (request: RequestWithUser, response: express.Response) => {
    const user = request.user;
    const { otpAuthUrl, base32 } = this.getTwoFactorAuthenticationCode();
    await this.user.findByIdAndUpdate(user._id, {
      twoFactorAuthenticationCode: base32
    });
    this.respondWithQRCode(otpAuthUrl, response);
  };

  private turnOnTwoFactorAuthentication = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const { twoFactorAuthenticationCode } = request.body;
    const user = request.user;
    const isCodeValid = await this.verifyTwoFactorAuthenticationCode(twoFactorAuthenticationCode, user);
    if (isCodeValid) {
      await this.user.findByIdAndUpdate(user._id, {
        isTwoFactorAuthenticationEnabled: true
      });
      response.sendStatus(200);
    } else {
      next(new WrongAuthenticationTokenException());
    }
  };

  private secondFactorAuthentication = async (request: RequestWithUser, response: express.Response, next: express.NextFunction) => {
    const { twoFactorAuthenticationCode } = request.body;
    const user = <User & mongoose.Document>request.user;
    const isCodeValid = await this.verifyTwoFactorAuthenticationCode(twoFactorAuthenticationCode, user);
    if (isCodeValid) {
      const tokenData = this.createToken(user, true);
      response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
      response.send({
        ...user.toObject(),
        password: undefined,
        twoFactorAuthenticationCode: undefined
      });
    } else {
      next(new WrongAuthenticationTokenException());
    }
  };

  private createCookie(tokenData: TokenData) {
    return `Authorization=${tokenData.token}; HttpOnly; Max-Age=${tokenData.expiresIn}; Path=/`;
  }

  private createToken(user: User, isSecondFactorAuthenticated = false): TokenData {
    const expiresIn = 60 * 60; // an hour
    const secret = process.env.JWT_SECRET;
    const dataStoredInToken: DataStoredInToken = {
      isSecondFactorAuthenticated,
      _id: user._id
    };
    return {
      expiresIn,
      token: jwt.sign(dataStoredInToken, secret, { expiresIn })
    };
  }

  private getTwoFactorAuthenticationCode() {
    const secretCode = speakeasy.generateSecret({
      name: process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME
    });
    return {
      otpAuthUrl: secretCode.otpauth_url,
      base32: secretCode.base32
    };
  }

  private respondWithQRCode(data: string, response: express.Response) {
    QRCode.toFileStream(response, data);
  }

  public verifyTwoFactorAuthenticationCode(twoFactorAuthenticationCode: string, user: User) {
    return speakeasy.totp.verify({
      secret: user.twoFactorAuthenticationCode,
      encoding: 'base32',
      token: twoFactorAuthenticationCode
    });
  }
}

export default AuthenticationController;
