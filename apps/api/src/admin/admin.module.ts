import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminOpsService } from './admin-ops.service';
@Module({ imports: [PostsModule], controllers: [AdminController], providers: [AdminService, AdminOpsService, AdminGuard] })
export class AdminModule {}
