import * as typeorm from 'typeorm';
import TokenData from '../../interfaces/tokenData.interface';
import AuthenticationService from '../authentication.service';
import UserWithThatEmailAlreadyExistsException from '../../exceptions/UserWithThatEmailAlreadyExistsException';
import CreateUserDto from '../../users/user.dto';

(typeorm as any).getRepository = jest.fn();

describe('The AuthenticationService', () => {
  describe('when creating a cookie', () => {
    it('should return a string', () => {
      const tokenData: TokenData = {
        token: '',
        expiresIn: 1
      };
      (typeorm as any).getRepository.mockReturnValue({});
      const authenticationService = new AuthenticationService();
      expect(typeof authenticationService.createCookie(tokenData))
        .toEqual('string');
    });
  });

  describe('when registering a user', () => {
    describe('if the email is already taken', () => {
      it('should throw an error', async () => {
        const userData: CreateUserDto = {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@smith.com',
          password: 'strongPassword123'
        };
        (typeorm as any).getRepository.mockReturnValue({
          findOne: () => Promise.resolve(userData)
        });
        const authenticationService = new AuthenticationService();
        await expect(authenticationService.register(userData))
          .rejects.toMatchObject(new UserWithThatEmailAlreadyExistsException(userData.email));
      });
    });

    describe('if the email is not taken', () => {
      it('should not throw an error', async () => {
        const userData: CreateUserDto = {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@smith.com',
          password: 'strongPassword123'
        };
        process.env.JWT_SECRET = 'jwt_secret';
        (typeorm as any).getRepository.mockReturnValue({
          findOne: () => Promise.resolve(undefined),
          create: () => ({
            ...userData,
            id: 0
          }),
          save: () => Promise.resolve()
        });
        const authenticationService = new AuthenticationService();
        await expect(authenticationService.register(userData))
          .resolves.toBeDefined();
      });
    });
  });
});
