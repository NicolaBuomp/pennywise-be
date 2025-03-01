import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProfilesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(userId: string): Promise<any> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: Partial<UpdateProfileDto>,
  ): Promise<any> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .update(updateProfileDto)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async uploadAvatar(
    userId: string,
    file: Buffer,
    filename: string,
  ): Promise<string> {
    const supabase = this.supabaseService.getClient();
    const bucketName = 'avatars';
    const filePath = `${userId}/${uuidv4()}-${filename}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { contentType: 'image/png' });

    if (error) {
      throw new Error('Error uploading avatar: ' + error.message);
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    const publicURL = data?.publicUrl;

    await supabase
      .from('profiles')
      .update({ avatar_url: publicURL })
      .eq('id', userId);

    return publicURL;
  }
}
