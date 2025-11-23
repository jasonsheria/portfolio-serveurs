import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { UsersModule } from '../users/users.module';
import { Site, SiteSchema } from '../entity/site/site.schema';
import { Media, MediaSchema } from '../entity/media/media.schema';
import { OfferedService, OfferedServiceSchema } from '../entity/service/service.schema';
import { Post, PostSchema } from '../entity/posts/post.schema';
import { Category, CategorySchema } from '../entity/posts/category.schema';
import { Tag, TagSchema } from '../entity/posts/tag.schema';
import { Template, TemplateSchema } from '../entity/template/template.schema';
import { Portfolio, PortfolioSchema } from '../entity/portfolio/portfolio.schema';
import { Message, MessageSchema } from '../entity/messages/message.schema';
import { User, UserSchema } from '../entity/users/user.schema';
import { Projet, ProjetSchema } from '../entity/projet/projet.schema';
import { Agent, AgentSchema } from '../agent/agent.schema';
import { Mobilier, MobilierSchema } from '../mobilier/mobilier.schema';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Template.name, schema: TemplateSchema },
      { name: Site.name, schema: SiteSchema },
      { name: Media.name, schema: MediaSchema },
      { name: 'OfferedService', schema: OfferedServiceSchema },
      { name: Post.name, schema: PostSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Tag.name, schema: TagSchema },
      { name: Portfolio.name, schema: PortfolioSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Projet.name, schema: ProjetSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Mobilier.name, schema: MobilierSchema },
    ]),
    UsersModule,
    UploadModule,
  ],
  providers: [SiteService],
  controllers: [SiteController],
  exports: [SiteService, MongooseModule],
})
export class SiteModule {}
