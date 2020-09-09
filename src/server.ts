import 'dotenv/config';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import App from './app';
import validateEnv from './utils/validateEnv';
import PostsController from './posts/posts.controller';
import AuthenticationController from './authentication/authentication.controller';
import CategoryController from './category/category.controller';
import * as config from './ormconfig';

validateEnv();

(async () => {
  try {
    await createConnection(config);
    // await connection.runMigrations();
  } catch (error) {
    console.log('Error while connecting to the database', error);
    return error;
  }
  const app = new App(
    [
      new PostsController(),
      new AuthenticationController(),
      new CategoryController()
    ]
  );
  app.listen();
})();
