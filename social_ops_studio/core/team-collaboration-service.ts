/**
 * Team Collaboration Service
 * Team Governance: Granular roles and approval workflows
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TeamMember,
  TeamRole,
  TeamPermission,
  ApprovalRequest,
  ApprovalComment,
} from '../data/models';

// Role-based permission mapping
const rolePermissions: Record<TeamRole, TeamPermission[]> = {
  admin: [
    'create_posts',
    'edit_posts',
    'delete_posts',
    'publish_posts',
    'view_analytics',
    'manage_team',
    'manage_settings',
    'approve_posts',
  ],
  editor: [
    'create_posts',
    'edit_posts',
    'view_analytics',
    'approve_posts',
  ],
  viewer: [
    'view_analytics',
  ],
};

export class TeamCollaborationService {
  private readonly teamStorageKey = 'team_members';
  private readonly approvalsStorageKey = 'approval_requests';

  /**
   * Invite a new team member
   */
  async inviteTeamMember(
    email: string,
    name: string,
    role: TeamRole
  ): Promise<TeamMember> {
    const member: TeamMember = {
      id: uuidv4(),
      email,
      name,
      role,
      permissions: rolePermissions[role],
      invitedAt: new Date(),
      status: 'pending',
    };

    const members = this.getAllTeamMembers();
    members.push(member);
    this.saveAllTeamMembers(members);

    return member;
  }

  /**
   * Update team member role
   */
  updateMemberRole(memberId: string, newRole: TeamRole, callerId: string): TeamMember | null {
    // Check if caller has permission to manage team
    if (!this.hasPermission(callerId, 'manage_team')) {
      throw new Error('User does not have permission to manage team members');
    }

    const members = this.getAllTeamMembers();
    const member = members.find(m => m.id === memberId);

    if (!member) return null;

    member.role = newRole;
    member.permissions = rolePermissions[newRole];
    this.saveAllTeamMembers(members);

    return member;
  }

  /**
   * Check if a member has a specific permission
   */
  hasPermission(memberId: string, permission: TeamPermission): boolean {
    const member = this.getTeamMember(memberId);

    // If the member does not exist, preserve existing behavior and return false.
    if (!member) {
      return false;
    }

    // If the member exists but is not active, surface a clear error instead of silently failing.
    if (member.status !== 'active') {
      throw new Error(
        `Team member ${member.id} is not active (status: ${member.status}) and cannot perform this action`
      );
    }

    return member.permissions.includes(permission);
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: TeamRole): TeamPermission[] {
    return rolePermissions[role];
  }

  /**
   * Request approval for a post
   */
  async requestApproval(
    postDraftId: string,
    requesterId: string,
    reviewerId: string
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: uuidv4(),
      postDraftId,
      requesterId,
      reviewerId,
      status: 'pending',
      comments: [],
      createdAt: new Date(),
      resolvedAt: null,
    };

    const requests = this.getAllApprovalRequests();
    requests.push(request);
    this.saveAllApprovalRequests(requests);

    return request;
  }

  /**
   * Approve a post
   */
  approvePost(requestId: string, approverId: string, comment?: string): ApprovalRequest | null {
    if (!this.hasPermission(approverId, 'approve_posts')) {
      throw new Error('User does not have permission to approve posts');
    }

    const requests = this.getAllApprovalRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) return null;

    request.status = 'approved';
    request.resolvedAt = new Date();

    if (comment) {
      request.comments.push({
        id: uuidv4(),
        authorId: approverId,
        content: comment,
        createdAt: new Date(),
      });
    }

    this.saveAllApprovalRequests(requests);
    return request;
  }

  /**
   * Reject a post
   */
  rejectPost(requestId: string, reviewerId: string, reason: string): ApprovalRequest | null {
    if (!this.hasPermission(reviewerId, 'approve_posts')) {
      throw new Error('User does not have permission to reject posts');
    }

    const requests = this.getAllApprovalRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) return null;

    request.status = 'rejected';
    request.resolvedAt = new Date();
    request.comments.push({
      id: uuidv4(),
      authorId: reviewerId,
      content: reason,
      createdAt: new Date(),
    });

    this.saveAllApprovalRequests(requests);
    return request;
  }

  /**
   * Request changes on a post
   */
  requestChanges(requestId: string, reviewerId: string, feedback: string): ApprovalRequest | null {
    if (!this.hasPermission(reviewerId, 'approve_posts')) {
      throw new Error('User does not have permission to request changes');
    }

    const requests = this.getAllApprovalRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) return null;

    request.status = 'changes_requested';
    request.comments.push({
      id: uuidv4(),
      authorId: reviewerId,
      content: feedback,
      createdAt: new Date(),
    });

    this.saveAllApprovalRequests(requests);
    return request;
  }

  /**
   * Add a comment to an approval request
   */
  addComment(requestId: string, authorId: string, content: string): ApprovalComment | null {
    const requests = this.getAllApprovalRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) return null;

    const comment: ApprovalComment = {
      id: uuidv4(),
      authorId,
      content,
      createdAt: new Date(),
    };

    request.comments.push(comment);
    this.saveAllApprovalRequests(requests);

    return comment;
  }

  /**
   * Get pending approvals for a reviewer
   */
  getPendingApprovals(reviewerId: string): ApprovalRequest[] {
    return this.getAllApprovalRequests().filter(
      r => r.reviewerId === reviewerId && r.status === 'pending'
    );
  }

  /**
   * Get approval requests for a post
   */
  getPostApprovals(postDraftId: string): ApprovalRequest[] {
    return this.getAllApprovalRequests().filter(r => r.postDraftId === postDraftId);
  }

  /**
   * Check if a post is approved
   */
  isPostApproved(postDraftId: string): boolean {
    const approvals = this.getPostApprovals(postDraftId);
    return approvals.some(a => a.status === 'approved');
  }

  /**
   * Get a team member by ID
   */
  getTeamMember(memberId: string): TeamMember | null {
    const members = this.getAllTeamMembers();
    return members.find(m => m.id === memberId) || null;
  }

  /**
   * Get all team members
   */
  getAllTeamMembers(): TeamMember[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.teamStorageKey);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return parsed.map((member: any) => ({
        ...member,
        invitedAt: new Date(member.invitedAt),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all team members to storage
   */
  private saveAllTeamMembers(members: TeamMember[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.teamStorageKey, JSON.stringify(members));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('Failed to save team members: Storage quota exceeded');
        throw new Error('Storage quota exceeded. Please free up space and try again.');
      }
      throw error;
    }
  }

  /**
   * Get all approval requests
   */
  private getAllApprovalRequests(): ApprovalRequest[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.approvalsStorageKey);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return parsed.map((request: any) => ({
        ...request,
        createdAt: new Date(request.createdAt),
        resolvedAt: request.resolvedAt ? new Date(request.resolvedAt) : null,
        comments: request.comments.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
        })),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all approval requests to storage
   */
  private saveAllApprovalRequests(requests: ApprovalRequest[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.approvalsStorageKey, JSON.stringify(requests));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('Failed to save approval requests: Storage quota exceeded');
        throw new Error('Storage quota exceeded. Please free up space and try again.');
      }
      throw error;
    }
  }
}
