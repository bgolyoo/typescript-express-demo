import 'dotenv/config';
import App from './app';
import PostsController from './posts/posts.controller';
import validateEnv from './utils/validateEnv';
import AuthenticationController from './authentication/authentication.controller';
import UsersController from './users/users.controller';

validateEnv();

const app = new App(
  [
    new AuthenticationController(),
    new UsersController(),
    new PostsController()
  ]
);

app.listen();
