import * as bcrypt from 'bcrypt';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import Controller from '../interfaces/controller.interface';
import validationMiddleware from '../middleware/validation.middleware';
import LogInDto from './login.dto';
import WrongCredentialsException from '../exceptions/WrongCredentialsException';
import UserWithThatEmailAlreadyExistsException from '../exceptions/UserWithThatEmailAlreadyExistsException';
import CreateUserDto from '../users/user.dto';
import TokenData from '../interfaces/tokenData.interface';
import DataStoredInToken from '../interfaces/dataStoredInToken';
import { getRepository } from 'typeorm';
import User from '../users/user.entity';

class AuthenticationController implements Controller {
  public path = '/auth';
  public router = express.Router();
  private userRepository = getRepository(User);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationMiddleware(CreateUserDto), this.registration);
    this.router.post(`${this.path}/login`, validationMiddleware(LogInDto), this.loggingIn);
    this.router.post(`${this.path}/logout`, this.loggingOut);
  }

  private registration = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const userData: CreateUserDto = request.body;
    if (await this.userRepository.findOne({ email: userData.email })) {
      next(new UserWithThatEmailAlreadyExistsException(userData.email));
    } else {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = this.userRepository.create({
        ...userData,
        password: hashedPassword
      });
      await this.userRepository.save(user);
      user.password = undefined;
      const tokenData = this.createToken(user);
      response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
      response.send(user);
    }
  };

  private loggingIn = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const logInData: LogInDto = request.body;
    const user = await this.userRepository.findOne({ email: logInData.email });
    if (user) {
      const isPasswordMatching = await bcrypt.compare(logInData.password, user.password);
      if (isPasswordMatching) {
        user.password = undefined;
        const tokenData = this.createToken(user);
        response.setHeader('Set-Cookie', [this.createCookie(tokenData)]);
        response.send(user);
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

  private createCookie(tokenData: TokenData) {
    return `Authorization=${tokenData.token}; HttpOnly; Max-Age=${tokenData.expiresIn}; Path=/`;
  }

  private createToken(user: User): TokenData {
    const expiresIn = 60 * 60; // an hour
    const secret = process.env.JWT_SECRET;
    const dataStoredInToken: DataStoredInToken = {
      id: user.id
    };
    return {
      expiresIn,
      token: jwt.sign(dataStoredInToken, secret, { expiresIn })
    };
  }
}

export default AuthenticationController;
