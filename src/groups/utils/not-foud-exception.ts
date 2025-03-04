import { HttpException, HttpStatus } from '@nestjs/common';

export class GroupNotFoundException extends HttpException {
  constructor(message = 'Group not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class NotGroupAdminException extends HttpException {
  constructor(message = 'You are not an admin of this group') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class NotGroupMemberException extends HttpException {
  constructor(message = 'You are not a member of this group') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class InvalidInviteTokenException extends HttpException {
  constructor(message = 'Invalid or expired invite token') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
