/**
 * Domain entity: User
 *
 * Represents the human interacting with the system. Holds the timezone
 * used to localize all date/time conversions for display and AI prompts.
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  /** IANA timezone, e.g. "America/New_York". */
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
