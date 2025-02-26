// src/profiles/dto/profile.dto.ts
export class ProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  avatarUrl: string;
  language: string;
  currency: string;
  theme: string;
  lastActive: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
