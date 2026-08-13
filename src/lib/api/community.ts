/**
 * @deprecated Use `@/lib/api/people` — Community was renamed to People.
 * Thin re-exports keep any leftover imports working.
 */
export {
  getPeopleStats as getCommunityStats,
  listPeople as listCommunityPeople,
  getPersonDetail as getCommunityPersonDetail,
  type PersonBadge as CommunityBadge,
  type DirectoryPerson as CommunityPerson,
  type DirectoryPersonDetail as CommunityPersonDetail,
  type PersonStay as CommunityStay,
} from '@/lib/api/people';
