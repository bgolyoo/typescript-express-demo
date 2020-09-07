import { cleanEnv, port, str } from 'envalid';

function validateEnv() {
  cleanEnv(process.env, {
    MONGO_PATH: str(),
    PORT: port(),
    JWT_SECRET: str()
  });
}

export default validateEnv;
