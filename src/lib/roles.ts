export type AppRole = 'president' | 'secretary' | 'joint_secretary' | 'domain_director' | 'associate_director' | 'member';
export type ClubDomain = 'technical' | 'events' | 'creatives';

export const isCoreLead = (role: string) => 
  ['president', 'secretary', 'joint_secretary'].includes(role);

export const isDomainDirector = (role: string) => 
  ['domain_director'].includes(role);

export const canApproveConfessions = (role: string) => 
  ['president', 'secretary', 'joint_secretary'].includes(role);

export const canViewComplaints = (role: string) => 
  ['president', 'secretary', 'joint_secretary'].includes(role);