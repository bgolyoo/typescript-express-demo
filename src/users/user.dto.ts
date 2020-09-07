import { IsEmail, IsString } from 'class-validator';

class CreateUserDto {
  @IsString()
  public firstName: string;

  @IsString()
  public lastName: string;

  @IsEmail()
  public email: string;

  @IsString()
  public password: string;
}

export default CreateUserDto;
