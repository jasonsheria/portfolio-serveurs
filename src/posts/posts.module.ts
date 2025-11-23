import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post, PostSchema } from '../entity/posts/post.schema';
import { Media, MediaSchema } from '../entity/media/media.schema';
import { Category, CategorySchema } from '../entity/posts/category.schema';
import { Tag, TagSchema } from '../entity/posts/tag.schema';
import { SiteModule } from '../site/site.module';
import { User, UserSchema } from '../entity/users/user.schema';
import { Comment, CommentSchema } from '../entity/comments/comment.schema';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Media.name, schema: MediaSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Tag.name, schema: TagSchema },
      { name: User.name, schema: UserSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
    SiteModule,
    UploadModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
