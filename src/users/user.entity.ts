import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import Address from './address.entity';
import Post from '../posts/post.entity';

@Entity()
class User {
  @PrimaryGeneratedColumn()
  public id: string;

  @Column()
  public firstName: string;

  @Column()
  public lastName: string;

  @Column()
  public email: string;

  // @Column({default: 'X'})
  // public gender: string;

  @Column()
  public password: string;

  @OneToOne(() => Address, (address: Address) => address.user, {
    cascade: true,
    eager: true
  })
  @JoinColumn()
  public address: Address;

  @OneToMany(() => Post, (post: Post) => post.author)
  public posts: Post[];
}

export default User;
