import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GroupsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createGroup(userId: string, createGroupDto: CreateGroupDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .insert({ ...createGroupDto })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await this.addUserToGroup(userId, data.id, 'admin');
    return data;
  }

  async getUserGroups(userId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getGroupInvites(groupId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .select('*')
      .eq('group_id', groupId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateGroup(groupId: string, updateGroupDto: UpdateGroupDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .update(updateGroupDto)
      .eq('id', groupId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async deleteGroup(groupId: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async addUserToGroup(userId: string, groupId: string, role: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .insert({ user_id: userId, group_id: groupId, role });

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateUserRole(updateRoleDto: UpdateRoleDto) {
    const { error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .update({ role: updateRoleDto.role })
      .eq('group_id', updateRoleDto.group_id)
      .eq('user_id', updateRoleDto.user_id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async inviteUserToGroup(createInviteDto: CreateInviteDto) {
    const inviteToken = uuidv4();
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .insert({
        group_id: createInviteDto.group_id,
        email: createInviteDto.email,
        role: createInviteDto.role,
        invite_token: inviteToken,
        expires_at: expirationTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { inviteLink: `/invite/${inviteToken}`, expiresAt: expirationTime };
  }

  async joinGroupWithToken(inviteToken: string, userId: string) {
    const { data: invite, error: inviteError } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .select('*')
      .eq('invite_token', inviteToken)
      .single();

    if (inviteError || !invite) {
      throw new Error('Invalid or expired invite token');
    }

    const now = new Date();
    if (new Date(invite.expires_at) < now) {
      throw new Error('Invite has expired');
    }

    await this.addUserToGroup(userId, invite.group_id, invite.role);

    await this.supabaseService
      .getClient()
      .from('group_invites')
      .delete()
      .eq('invite_token', inviteToken);

    return { message: 'Successfully joined group' };
  }

  async deleteGroupMember(groupId: string, userId: string, adminId: string) {
    const { data: adminCheck, error: adminError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', adminId)
      .single();

    if (adminError || !adminCheck || adminCheck.role !== 'admin') {
      throw new Error('Only admins can remove users');
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteGroupInvite(inviteId: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
